const { fetchFreeBusy } = require('./googleCalendarHelper');
const db = require('./db');

/**
 * Main AutoScheduler Engine
 */
async function scheduleMicroBlocks(userId, parentTaskObj) {
  const { id: parentTaskId, title, estimatedSeconds, durationSeconds, createdAt } = parentTaskObj;
  
  const targetTimeMs = createdAt + (durationSeconds * 1000);
  const now = Date.now();
  
  if (estimatedSeconds <= 0 || estimatedSeconds > durationSeconds) {
    console.error(`[AutoScheduler] Invalid estimatedSeconds: ${estimatedSeconds}`);
    return;
  }

  // 1. Fetch Google Calendar Free/Busy if connected
  const startISO = new Date(now).toISOString();
  const endISO = new Date(targetTimeMs).toISOString();
  
  const fbResult = await fetchFreeBusy(userId, startISO, endISO);
  let busyIntervals = [];
  
  if (fbResult && fbResult.success) {
    busyIntervals = fbResult.busy.map(slot => ({
      start: new Date(slot.start).getTime(),
      end: new Date(slot.end).getTime()
    }));
  }

  // 2. Fetch LMS existing active tasks
  const lmsTasks = await new Promise((resolve) => {
    db.all('SELECT createdAt, durationSeconds FROM tasks WHERE userId = ? AND completed = 0 AND autoSchedule = 1', [userId], (err, rows) => {
      resolve(err ? [] : rows);
    });
  });

  lmsTasks.forEach(t => {
    const end = t.createdAt + (t.durationSeconds * 1000);
    // Micro-blocks from LMS are 1 hour long normally. We just block out the exact time.
    busyIntervals.push({
      start: Math.max(now, end - (t.estimatedSeconds * 1000 || 3600000)),
      end: end
    });
  });

  // Sort and merge busy intervals
  busyIntervals.sort((a, b) => a.start - b.start);
  const mergedBusy = [];
  if (busyIntervals.length > 0) {
    let current = busyIntervals[0];
    for (let i = 1; i < busyIntervals.length; i++) {
      if (busyIntervals[i].start <= current.end) {
        current.end = Math.max(current.end, busyIntervals[i].end);
      } else {
        mergedBusy.push(current);
        current = busyIntervals[i];
      }
    }
    mergedBusy.push(current);
  }

  // 3. Find free slots and allocate micro-blocks (1 hour each, or smaller)
  const blockDurationMs = 3600000; // 1 hour chunks
  let remainingMs = estimatedSeconds * 1000;
  
  let currentSearchTime = now;
  const scheduledBlocks = [];

  for (let i = 0; i <= mergedBusy.length; i++) {
    if (remainingMs <= 0) break;

    const nextBusyStart = i < mergedBusy.length ? mergedBusy[i].start : targetTimeMs;
    
    // While there is free time before the next busy period
    while (currentSearchTime + blockDurationMs <= nextBusyStart && remainingMs > 0) {
      const allocateMs = Math.min(blockDurationMs, remainingMs);
      
      scheduledBlocks.push({
        start: currentSearchTime,
        end: currentSearchTime + allocateMs,
        durationSeconds: Math.floor(allocateMs / 1000)
      });
      
      remainingMs -= allocateMs;
      currentSearchTime += allocateMs;
    }

    if (i < mergedBusy.length) {
      currentSearchTime = Math.max(currentSearchTime, mergedBusy[i].end);
    }
  }

  // If still remaining, force squeeze it right before deadline
  if (remainingMs > 0) {
    scheduledBlocks.push({
      start: targetTimeMs - remainingMs,
      end: targetTimeMs,
      durationSeconds: Math.floor(remainingMs / 1000)
    });
  }

  // 4. Save Micro-Blocks into tasks table
  for (let i = 0; i < scheduledBlocks.length; i++) {
    const block = scheduledBlocks[i];
    const blockId = `${parentTaskId}-block-${i}`;
    
    const blockDeadline = block.end;
    const blockDurationSecs = Math.floor((blockDeadline - now) / 1000);
    
    db.run(`INSERT INTO tasks 
      (id, userId, title, durationSeconds, priority, category, createdAt, completed, parentTaskId, autoSchedule, estimatedSeconds, syncGoogle, syncNotion, syncTelegram, syncEmail) 
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, 1, ?, ?, ?, ?, ?)`,
      [
        blockId, userId, `${title} (Block ${i+1}/${scheduledBlocks.length})`, blockDurationSecs, 
        parentTaskObj.priority, parentTaskObj.category, now, parentTaskId, block.durationSeconds,
        parentTaskObj.syncGoogle ? 1 : 0, parentTaskObj.syncNotion ? 1 : 0, 
        parentTaskObj.syncTelegram ? 1 : 0, parentTaskObj.syncEmail ? 1 : 0
      ],
      (err) => {
        if (err) console.error(`[AutoScheduler] Failed to save block ${i}: ${err.message}`);
        else {
          // Send notification / trigger timer in server.js conceptually, 
          // but they will be picked up on refresh.
        }
      }
    );
  }
}

module.exports = {
  scheduleMicroBlocks
};
