/**
 * Parses natural language input to extract task title, duration in seconds, priority,
 * and a calculated target date-time string in local ISO format (YYYY-MM-DDTHH:mm).
 * Supports English and major Indian languages (Hindi, Tamil, Telugu, Kannada, etc.).
 */
export function parseReminderInput(input) {
  if (!input) return null;

  let text = input.toLowerCase().trim();

  // Mapping of spoken/written number words to actual digits for preprocessing
  const numberWordMap = {
    // English
    'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
    // Hindi
    'एक': 1, 'दो': 2, 'तीन': 3, 'चार': 4, 'पाँच': 5, 'पांच': 5, 'छह': 6, 'सात': 7, 'आठ': 8, 'नौ': 9, 'दस': 10,
    'पंद्रह': 15, 'बीस': 20, 'तीस': 30, 'चालीस': 40, 'पचास': 50, 'साठ': 60,
    // Tamil
    'ஒரு': 1, 'ஒன்று': 1, 'இரண்டு': 2, 'ரெண்டு': 2, 'மூன்று': 3, 'மூணு': 3, 'நான்கு': 4, 'நாலு': 4, 'ஐந்து': 5, 'அஞ்சு': 5,
    'ஆறு': 6, 'ஏழு': 7, 'எட்டு': 8, 'ஒன்பது': 9, 'பத்து': 10, 'பதினைந்து': 15, 'இருபது': 20, 'முப்பது': 30, 'நாற்பது': 40,
    'ஐம்பது': 50, 'அறுபது': 60,
    // Telugu
    'ఒక': 1, 'ఒకటి': 1, 'రెండు': 2, 'మూడు': 3, 'నాలుగు': 4, 'ఐదు': 5, 'ఆరు': 6, 'ఏడు': 7, 'ఎనిమిది': 8, 'తొమ్మిది': 9,
    'పది': 10, 'పదిహేను': 15, 'ఇరవై': 20, 'ముప్పై': 30, 'నలభై': 40, 'యాభై': 50, 'అరవై': 60,
    // Kannada
    'ಒಂದು': 1, 'ಎರಡು': 2, 'ಮೂರು': 3, 'ನಾಲ್ಕು': 4, 'ಐದು': 5, 'ಆರು': 6, 'ಏಳು': 7, 'ಎಂಟು': 8, 'ಒಂಬತ್ತು': 9,
    'ಹತ್ತು': 10, 'ಹದಿನೈದು': 15, 'ಇಪ್ಪತ್ತು': 20, 'ಮೂವತ್ತು': 30, 'ನಲವತ್ತು': 40, 'ಐವತ್ತು': 50, 'ಅರವತ್ತು': 60
  };

  // Preprocess: Replace word numbers with digits (accounting for space and boundaries securely)
  for (const [word, digit] of Object.entries(numberWordMap)) {
    // For Non-latin script words, word boundaries \b do not match, so we match string start/end or spaces
    const regex = new RegExp(`(?:^|\\s)${word}(?:$|\\s)`, 'g');
    text = text.replace(regex, ` ${digit} `);
  }
  text = text.replace(/\s+/g, ' ').trim();

  let priority = 'Medium'; // Default
  let category = 'Personal'; // Default

  // 1. Parse Priority (Unicode safe checks)
  if (/\burgent\b/.test(text) || /तरंत|अति\s*आवश्यक|அவசரம்|முக்கிய|అవసరం|తుర్తు/i.test(text)) {
    priority = 'Urgent';
  } else if (/\bhigh\b/.test(text) || /महत्वपूर्ण|முக்கியம்|முக்கியமான|ముఖ్యమైన|ముఖ్య|ಮುಖ್ಯ/i.test(text)) {
    priority = 'High';
  } else if (/\bmedium\b/.test(text) || /सामान्य|சாதாரண|సాధారణ|ಸಾಮಾನ್ಯ/i.test(text)) {
    priority = 'Medium';
  } else if (/\blow\b/.test(text) || /कम|குறைந்த|தక్కువ|ಕಡಿಮೆ/i.test(text)) {
    priority = 'Low';
  }

  // 2. Parse Category (Work vs Personal heuristics)
  const workKeywords = /\b(work|meeting|client|office|boss|email|report|call|project|team|study|code|programming|submit|file|invoice|task|presentation|interview|doc|prs|meeting|zoom|slack)\b|काम|दफ्तर|மீட்டிங்|வேலை|ஆஃபீஸ்|ఆఫీస్|పని|కెలస|ಸಭೆ/i;
  if (workKeywords.test(text)) {
    category = 'Work';
  }

  // 3. Parse Recurrence (e.g. "every day", "every monday", "every 2 weeks")
  let isRecurring = false;
  let recurInterval = null;
  let recurUnit = null;

  // Simple matches
  const recurMatch = text.match(/\bevery\s+(day|week|month|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i);
  const recurIntervalMatch = text.match(/\bevery\s+(\d+)\s+(days?|weeks?|months?|hours?)\b/i);

  if (recurIntervalMatch) {
    isRecurring = true;
    recurInterval = parseInt(recurIntervalMatch[1], 10);
    const unitMap = { day: 'day', days: 'day', week: 'week', weeks: 'week', month: 'month', months: 'month', hour: 'hour', hours: 'hour' };
    recurUnit = unitMap[recurIntervalMatch[2].toLowerCase()];
  } else if (recurMatch) {
    isRecurring = true;
    recurInterval = 1;
    const word = recurMatch[1].toLowerCase();
    if (word === 'day') recurUnit = 'day';
    else if (word === 'week') recurUnit = 'week';
    else if (word === 'month') recurUnit = 'month';
    else {
      // It's a weekday ("every monday") -> translates to every 1 week
      recurUnit = 'week';
    }
  }

  // Define target date time calculation
  let targetDate = new Date();
  let dateModified = false;
  let isRelativeDuration = false;

  // Track matched text to clean up the task title later
  const matchPhrases = [];

  // A. Relative duration patterns: English and Indian language regexes
  // Note: Using (?:\s|$|[.,!?]) instead of ASCII word boundary \b to support Indian languages correctly
  const dayMatch = text.match(/(\d+)\s*(?:days?|दिन|நாள்|நாட்கள்|రోజు|రోజులు|ದಿನ|ದಿನಗಳು)(?:\s|$|[.,!?])/u);
  const hourMatch = text.match(/(\d+)\s*(?:hours?|hr|घंटा|घंटे|மணி|గంట|గంటలు|ಗಂಟೆ|ಗಂಟೆಗಳು)(?:\s|$|[.,!?])/u);
  const minMatch = text.match(/(\d+)\s*(?:minutes?|min|मिनट|நிமிடம்|நிமிடங்கள்|நிமிஷம்|నిమిషం|నిమిషాలు|నిమిష|ನಿಮಿಷಗಳು)(?:\s|$|[.,!?])/u);
  const secMatch = text.match(/(\d+)\s*(?:seconds?|sec|सेकंड|செகண்ட்|வினாடி|సెకండ్|సెకన్లు|ಸೆಕೆಂಡ್|ಸೆಕೆಂಡುಗಳು)(?:\s|$|[.,!?])/u);

  if (dayMatch) {
    targetDate.setDate(targetDate.getDate() + parseInt(dayMatch[1], 10));
    dateModified = true;
    isRelativeDuration = true;
    matchPhrases.push(dayMatch[0].trim());
  }
  if (hourMatch) {
    targetDate.setHours(targetDate.getHours() + parseInt(hourMatch[1], 10));
    dateModified = true;
    isRelativeDuration = true;
    matchPhrases.push(hourMatch[0].trim());
  }
  if (minMatch) {
    targetDate.setMinutes(targetDate.getMinutes() + parseInt(minMatch[1], 10));
    dateModified = true;
    isRelativeDuration = true;
    matchPhrases.push(minMatch[0].trim());
  }
  if (secMatch) {
    targetDate.setSeconds(targetDate.getSeconds() + parseInt(secMatch[1], 10));
    dateModified = true;
    isRelativeDuration = true;
    matchPhrases.push(secMatch[0].trim());
  }

  // B. Special relative days
  if (!dateModified) {
    if (/\b(day after tomorrow|day-after-tomorrow)\b/i.test(text) || /परसों/i.test(text) || /நாளை மறுநாள்/i.test(text) || /ఎల్లుండి/i.test(text) || /ನಾಳಿದ್ದು/i.test(text)) {
      targetDate.setDate(targetDate.getDate() + 2);
      dateModified = true;
      const phrase = text.match(/\b(day after tomorrow|day-after-tomorrow)\b/i)?.[0] || text.match(/परसों|நாளை மறுநாள்|ఎల్లుండి|ನಾಳಿದ್ದು/)?.[0] || '';
      if (phrase) matchPhrases.push(phrase);
    } else if (/\btomorrow\b/i.test(text) || /\bकल\b/i.test(text) || /நாளை/i.test(text) || /రేపు/i.test(text) || /నాಳೆ/i.test(text)) {
      targetDate.setDate(targetDate.getDate() + 1);
      dateModified = true;
      const phrase = text.match(/\btomorrow\b/i)?.[0] || text.match(/कल|நாளை|రేపు|నాಳೆ/)?.[0] || '';
      if (phrase) matchPhrases.push(phrase);
    } else if (/\b(after a week|in a week|next week|one week)\b/i.test(text) || /एक हफ्ते/i.test(text) || /ஒரு வாரம்/i.test(text) || /ఒక వారం/i.test(text) || /ಒಂದು ವಾರ/i.test(text)) {
      targetDate.setDate(targetDate.getDate() + 7);
      dateModified = true;
      const phrase = text.match(/\b(after a week|in a week|next week|one week)\b/i)?.[0] || text.match(/एक हफ्ते|ஒரு வாரம்|ఒక వారం|ಒಂದು ವಾರ/)?.[0] || '';
      if (phrase) matchPhrases.push(phrase);
    }
  }

  // C. Weekdays (e.g. "on Monday", "next Friday")
  if (!dateModified) {
    const weekdayMap = {
      sun: 0, sunday: 0,
      mon: 1, monday: 1,
      tue: 2, tuesday: 2,
      wed: 3, wednesday: 3,
      thu: 4, thursday: 4,
      fri: 5, friday: 5,
      sat: 6, saturday: 6
    };

    const weekdayRegex = /\b(?:on\s+|next\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tue|wed|thu|fri|sat)\b/i;
    const weekdayMatch = text.match(weekdayRegex);
    if (weekdayMatch) {
      const targetDay = weekdayMap[weekdayMatch[1]];
      const currentDay = targetDate.getDay();
      let diff = (targetDay + 7 - currentDay) % 7;
      if (diff === 0) diff = 7;
      targetDate.setDate(targetDate.getDate() + diff);
      dateModified = true;
      matchPhrases.push(weekdayMatch[0]);
    }
  }

  // D. Specific Calendar Dates (e.g. "on July 5", "June 28th")
  if (!dateModified) {
    const monthMap = {
      jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3,
      may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7, sep: 8, september: 8,
      oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11
    };

    const monthDayRegex = /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?\b/;
    const dayMonthRegex = /\b(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/;

    let dateMatch = text.match(monthDayRegex);
    let monthIndex, dayNum;

    if (dateMatch) {
      monthIndex = monthMap[dateMatch[1]];
      dayNum = parseInt(dateMatch[2], 10);
      matchPhrases.push(dateMatch[0]);
    } else {
      dateMatch = text.match(dayMonthRegex);
      if (dateMatch) {
        monthIndex = monthMap[dateMatch[2]];
        dayNum = parseInt(dateMatch[1], 10);
        matchPhrases.push(dateMatch[0]);
      }
    }

    if (dateMatch && monthIndex !== undefined && !isNaN(dayNum)) {
      targetDate.setMonth(monthIndex);
      targetDate.setDate(dayNum);
      if (targetDate.getTime() < Date.now() - 60000) {
        targetDate.setFullYear(targetDate.getFullYear() + 1);
      }
      dateModified = true;
    }
  }

  // E. Absolute time of day (e.g. "at 4:30 pm", "at 16:00", "at 9 am", "at 8 o'clock")
  const timeRegex1 = /\bat\s+(\d{1,2}):(\d{2})\s*(am|pm)?\b/;
  const timeRegex2 = /\bat\s+(\d{1,2})\s*(am|pm)\b/;
  const timeRegex3 = /\bat\s+(\d{1,2})\s*o'clock\b/;

  let hour = 9;
  let minute = 0;
  let absoluteTimeMatched = false;

  let tMatch = text.match(timeRegex1);
  if (tMatch) {
    hour = parseInt(tMatch[1], 10);
    minute = parseInt(tMatch[2], 10);
    const meridian = tMatch[3];
    if (meridian === 'pm' && hour < 12) hour += 12;
    if (meridian === 'am' && hour === 12) hour = 0;
    absoluteTimeMatched = true;
    matchPhrases.push(tMatch[0]);
  } else {
    tMatch = text.match(timeRegex2);
    if (tMatch) {
      hour = parseInt(tMatch[1], 10);
      minute = 0;
      const meridian = tMatch[2];
      if (meridian === 'pm' && hour < 12) hour += 12;
      if (meridian === 'am' && hour === 12) hour = 0;
      absoluteTimeMatched = true;
      matchPhrases.push(tMatch[0]);
    } else {
      tMatch = text.match(timeRegex3);
      if (tMatch) {
        hour = parseInt(tMatch[1], 10);
        minute = 0;
        absoluteTimeMatched = true;
        matchPhrases.push(tMatch[0]);
      }
    }
  }

  // Apply final clock settings
  if (absoluteTimeMatched) {
    targetDate.setHours(hour, minute, 0, 0);
  } else if (dateModified && !isRelativeDuration) {
    targetDate.setHours(9, 0, 0, 0);
  } else if (!dateModified) {
    targetDate.setSeconds(targetDate.getSeconds() + 60);
  }

  // Calculate final duration seconds
  const durationSeconds = Math.max(1, Math.round((targetDate.getTime() - Date.now()) / 1000));

  // 3. Clean up the task description (removing all matching phrases)
  let cleanTask = input;

  // Remove generic prefixes in multiple languages
  cleanTask = cleanTask
    .replace(/^(remind me to|remind me|please remind me to|please remind me|please|मुझे याद दिलाना|मुझे याद दिलाएं|எனக்கு நினைவூட்டு|నాకు గుర్తు చేయి|ನನಗೆ ನೆನಪಿಸು)\b/i, '')
    .trim();

  // Remove all matched dates, times, durations
  matchPhrases.forEach(phrase => {
    const escaped = escapeRegExp(phrase);
    // Remove both space-padded and word-boundary matches
    const regex = new RegExp(`(?:\\s+)?${escaped}(?:\\s+)?`, 'gi');
    cleanTask = cleanTask.replace(regex, ' ');
  });

  // Remove recurrence phrases from the final title
  if (recurIntervalMatch) {
    cleanTask = cleanTask.replace(new RegExp(`(?:\\s+)?${escapeRegExp(recurIntervalMatch[0])}(?:\\s+)?`, 'gi'), ' ');
  } else if (recurMatch) {
    cleanTask = cleanTask.replace(new RegExp(`(?:\\s+)?${escapeRegExp(recurMatch[0])}(?:\\s+)?`, 'gi'), ' ');
  }

  // Clean up dangling postpositions in Indian languages (e.g. "में", "को", "இல்", "லோ", "లో", "కు", "కి", "ಗೆ", "ನಂತರ", "बाद")
  // Using unicode range checks or explicit characters
  cleanTask = cleanTask
    .replace(/(?:^|\s+)(में|को|पर|को|இல்|லோ|లో|కు|కి|ಗೆ|ನಂತರ|बाद|க்காக|ஆக)(?:\s+|$)/gi, ' ')
    .trim();

  // Remove priority words
  cleanTask = cleanTask
    .replace(/\b(urgent|high|medium|low)\s+(priority)?\b/i, '')
    .replace(/\b(priority)\b/i, '')
    .trim();

  // Remove trailing and leading punctuation/whitespace/dangling symbols
  cleanTask = cleanTask.replace(/^[,\-\s\u0900-\u097F\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF]+|[,\-\s]+$/g, '').trim();

  // Capitalize first letter (English only)
  if (cleanTask.length > 0) {
    if (/^[A-Za-z]/.test(cleanTask)) {
      cleanTask = cleanTask.charAt(0).toUpperCase() + cleanTask.slice(1);
    }
  } else {
    cleanTask = 'Unspecified Reminder';
  }

  // Convert targetDate to local ISO format for datetime-local (YYYY-MM-DDTHH:mm)
  const tzoffset = targetDate.getTimezoneOffset() * 60000;
  const targetDateTime = new Date(targetDate.getTime() - tzoffset).toISOString().slice(0, 16);

  return {
    title: cleanTask,
    durationSeconds,
    priority,
    category,
    targetDateTime,
    isRecurring,
    recurInterval,
    recurUnit
  };
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
