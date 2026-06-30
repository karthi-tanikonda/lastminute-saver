const db = require('./db');

/**
 * Categorizes a task title into Simple, Medium, or Complex using a lightweight rule-based NLP parser.
 * @param {string} title - The task title
 * @returns {string} - 'Simple', 'Medium', or 'Complex'
 */
function classifyTaskComplexity(title) {
  const t = title.toLowerCase();
  
  // Keywords indicating Complex tasks
  if (t.includes('study') || t.includes('write') || t.includes('build') || t.includes('design') || t.includes('project')) {
    return 'Complex';
  }
  
  // Keywords indicating Simple tasks
  if (t.includes('call') || t.includes('email') || t.includes('clean') || t.includes('buy')) {
    return 'Simple';
  }
  
  // Default fallback
  return 'Medium';
}

/**
 * Calculates the Historical User Delay Risk (Ru)
 * Ru = Missed Tasks / Total Tasks Created (over last 30 days)
 * Fallback to 0.4 if user has < 5 tasks
 * @param {string} userId
 * @returns {Promise<number>}
 */
function calculateHistoricalRisk(userId) {
  return new Promise((resolve, reject) => {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const query = `
      SELECT 
        COUNT(*) as totalTasks,
        SUM(CASE WHEN completed = 0 AND (createdAt + durationSeconds * 1000) < ? THEN 1 ELSE 0 END) as missedTasks
      FROM tasks 
      WHERE userId = ? AND createdAt >= ?
    `;
    
    const now = Date.now();
    db.get(query, [now, userId, thirtyDaysAgo], (err, row) => {
      if (err) return reject(err);
      
      if (!row || row.totalTasks < 5) {
        return resolve(0.4); // Fallback risk
      }
      
      const ratio = row.missedTasks / row.totalTasks;
      resolve(ratio);
    });
  });
}

/**
 * Calculates the Concurrent Daily Load (L)
 * L = Count of active pending tasks on the same calendar day
 * @param {string} userId
 * @param {number} deadlineMs
 * @returns {Promise<number>}
 */
function calculateConcurrentLoad(userId, deadlineMs) {
  return new Promise((resolve, reject) => {
    // Get start and end of the day for the deadline
    const date = new Date(deadlineMs);
    date.setHours(0, 0, 0, 0);
    const startOfDay = date.getTime();
    date.setHours(23, 59, 59, 999);
    const endOfDay = date.getTime();
    
    const query = `
      SELECT COUNT(*) as load 
      FROM tasks 
      WHERE userId = ? 
      AND completed = 0 
      AND (createdAt + durationSeconds * 1000) BETWEEN ? AND ?
    `;
    
    db.get(query, [userId, startOfDay, endOfDay], (err, row) => {
      if (err) return reject(err);
      resolve(row.load || 0);
    });
  });
}

/**
 * Computes the Dynamic Buffer Window and returns the buffer deadline in milliseconds.
 * @param {string} title - Task title
 * @param {string} userId - User ID
 * @param {number} realDeadlineMs - The true deadline in Unix MS
 * @returns {Promise<{ bufferWallMs: number, complexity: string, bufferMinutes: number }>}
 */
async function calculateBufferWindow(title, userId, realDeadlineMs) {
  try {
    const complexity = classifyTaskComplexity(title);
    
    // 1. Base Duration
    let Dbase = 90; // Medium default
    let Wc = 0.3;   // Medium default
    
    if (complexity === 'Simple') {
      Dbase = 30;
      Wc = 0.1;
    } else if (complexity === 'Complex') {
      Dbase = 180;
      Wc = 0.5;
    }
    
    // 2. Query historical risk & concurrent load
    const Ru = await calculateHistoricalRisk(userId);
    const L = await calculateConcurrentLoad(userId, realDeadlineMs);
    
    // 3. Overload weight calculation
    const Wl = Math.min(L * 0.02, 0.20);
    
    // 4. Composite Risk Score (R) - clamped strictly between 0.0 and 1.0
    const rawR = Wc + Ru + Wl;
    const R = Math.max(0.0, Math.min(rawR, 1.0));
    
    // 5. Dynamic Buffer Window (B) in minutes
    const B_minutes = Dbase * (1 + (R * 2));
    
    // 6. Internal Buffer Deadline (Tbuffer)
    const B_ms = Math.round(B_minutes * 60 * 1000);
    const bufferWallMs = realDeadlineMs - B_ms;
    
    return {
      bufferWallMs,
      complexity,
      bufferMinutes: B_minutes
    };
    
  } catch (err) {
    console.error("Error calculating buffer window:", err);
    // Safe fallback: 60 minutes buffer
    return {
      bufferWallMs: realDeadlineMs - (60 * 60 * 1000),
      complexity: 'Medium',
      bufferMinutes: 60
    };
  }
}

module.exports = {
  classifyTaskComplexity,
  calculateHistoricalRisk,
  calculateConcurrentLoad,
  calculateBufferWindow
};
