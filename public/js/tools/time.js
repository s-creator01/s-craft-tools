// S Craft — Time Tools Engine (100% Client-Side Pure JavaScript & Web Audio)

// Synthesize pleasant chime when countdown finishes (zero external audio files)
export function playChimeSound() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880.00, audioCtx.currentTime + 0.15); // A5

    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 1.2);
  } catch (err) {
    console.warn('Web Audio chime unavailable:', err);
  }
}

/**
 * Date Difference Calculator
 * Accurately calculates years, months, days, weeks, and total days
 */
export function calculateDateDifference(startDateStr, endDateStr, inclusive = false) {
  const d1 = new Date(startDateStr);
  const d2 = new Date(endDateStr);

  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) {
    throw new Error('Please select valid start and end dates.');
  }

  // Ensure d1 <= d2
  const inverted = d1 > d2;
  let start = new Date(inverted ? d2 : d1);
  let end = new Date(inverted ? d1 : d2);

  if (inclusive) {
    end.setDate(end.getDate() + 1);
  }

  const diffMs = end.getTime() - start.getTime();
  const totalDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const totalWeeks = Math.floor(totalDays / 7);
  const remDays = totalDays % 7;

  // Exact calendar years, months, days breakdown
  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();

  if (days < 0) {
    months--;
    const prevMonthLastDay = new Date(end.getFullYear(), end.getMonth(), 0).getDate();
    days += prevMonthLastDay;
  }
  if (months < 0) {
    years--;
    months += 12;
  }

  return {
    inverted,
    totalDays,
    totalWeeks,
    remainingDays: remDays,
    years,
    months,
    days
  };
}

/**
 * Add / Subtract from Date
 */
export function adjustDate(baseDateStr, amount, unit = 'days', operation = 'add') {
  const date = new Date(baseDateStr);
  if (isNaN(date.getTime())) throw new Error('Invalid base date');

  const factor = operation === 'subtract' ? -1 : 1;
  const num = (parseInt(amount) || 0) * factor;

  const result = new Date(date);
  switch (unit) {
    case 'days':
      result.setDate(result.getDate() + num);
      break;
    case 'weeks':
      result.setDate(result.getDate() + num * 7);
      break;
    case 'months':
      result.setMonth(result.getMonth() + num);
      break;
    case 'years':
      result.setFullYear(result.getFullYear() + num);
      break;
  }

  return {
    date: result,
    formatted: result.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }),
    iso: result.toISOString().split('T')[0]
  };
}

/**
 * Time Zone Converter
 */
export function convertTimeZone(datetimeStr, sourceTz, targetTzs = ['UTC', 'America/New_York', 'Europe/London', 'Asia/Tokyo', 'Asia/Dubai', 'Australia/Sydney']) {
  const date = new Date(datetimeStr);
  if (isNaN(date.getTime())) throw new Error('Invalid date/time input');

  return targetTzs.map(tz => {
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short'
      });
      return {
        timeZone: tz,
        formatted: formatter.format(date)
      };
    } catch {
      return { timeZone: tz, formatted: 'Unsupported Timezone' };
    }
  });
}

/**
 * Duration Converter
 */
export function convertDuration(value, sourceUnit = 'seconds') {
  const val = parseFloat(value) || 0;
  let seconds = 0;

  switch (sourceUnit) {
    case 'seconds': seconds = val; break;
    case 'minutes': seconds = val * 60; break;
    case 'hours': seconds = val * 3600; break;
    case 'days': seconds = val * 86400; break;
    case 'weeks': seconds = val * 604800; break;
  }

  return {
    seconds: seconds.toLocaleString(),
    minutes: (seconds / 60).toFixed(2),
    hours: (seconds / 3600).toFixed(2),
    days: (seconds / 86400).toFixed(2),
    weeks: (seconds / 604800).toFixed(2)
  };
}

/**
 * Timestamp Converter
 */
export function convertTimestamp(input) {
  let ms = 0;
  const num = Number(input);

  if (!isNaN(num) && num > 0) {
    // Check if seconds or milliseconds
    ms = num < 10000000000 ? num * 1000 : num;
  } else {
    // Try parse as date string
    const d = new Date(input);
    if (!isNaN(d.getTime())) {
      ms = d.getTime();
    } else {
      throw new Error('Please enter a valid Unix timestamp or date string.');
    }
  }

  const date = new Date(ms);
  return {
    unixSeconds: Math.floor(ms / 1000),
    unixMilliseconds: ms,
    utc: date.toUTCString(),
    local: date.toLocaleString(),
    iso: date.toISOString()
  };
}

/**
 * Age Calculator
 */
export function calculateAge(birthDateStr) {
  const birthDate = new Date(birthDateStr);
  const today = new Date();

  if (isNaN(birthDate.getTime()) || birthDate > today) {
    throw new Error('Please enter a valid birth date in the past.');
  }

  let years = today.getFullYear() - birthDate.getFullYear();
  let months = today.getMonth() - birthDate.getMonth();
  let days = today.getDate() - birthDate.getDate();

  if (days < 0) {
    months--;
    const prevMonthLastDay = new Date(today.getFullYear(), today.getMonth(), 0).getDate();
    days += prevMonthLastDay;
  }
  if (months < 0) {
    years--;
    months += 12;
  }

  // Next birthday countdown
  let nextBday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
  if (nextBday < today) {
    nextBday.setFullYear(today.getFullYear() + 1);
  }
  const daysUntilNext = Math.ceil((nextBday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  const totalDays = Math.floor((today.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24));

  return {
    years,
    months,
    days,
    totalDays,
    daysUntilNext
  };
}

export function countBusinessDays(startISO,endISO,{inclusive=true,holidays=[]}={}) {
  const parse = value => { if(!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new RangeError('Choose valid dates.'); const [year,month,day]=value.split('-').map(Number); const date=new Date(Date.UTC(year,month-1,day)); if(date.getUTCFullYear()!==year||date.getUTCMonth()!==month-1||date.getUTCDate()!==day) throw new RangeError('Choose valid dates.'); return date; };
  let cursor=parse(startISO), end=parse(endISO); const direction=cursor<=end?1:-1; const excluded=new Set(holidays); let total=0;
  while(direction===1?cursor<=end:cursor>=end) { const key=cursor.toISOString().slice(0,10), day=cursor.getUTCDay(); if(day!==0&&day!==6&&!excluded.has(key)) total++; cursor.setUTCDate(cursor.getUTCDate()+direction); }
  if(!inclusive) { const endDay=end.getUTCDay(); if(endDay!==0&&endDay!==6&&!excluded.has(end.toISOString().slice(0,10))) total--; }
  return total*direction;
}

export function addBusinessDays(startISO,amount,{holidays=[]}={}) {
  if(!Number.isInteger(Number(amount))||Math.abs(Number(amount))>100000) throw new RangeError('Enter a whole number of business days.');
  const [year,month,day]=startISO.split('-').map(Number); let cursor=new Date(Date.UTC(year,month-1,day));
  if(cursor.toISOString().slice(0,10)!==startISO) throw new RangeError('Choose a valid date.');
  let remaining=Math.abs(Number(amount)), direction=Number(amount)<0?-1:1; const excluded=new Set(holidays);
  while(remaining) { cursor.setUTCDate(cursor.getUTCDate()+direction); const weekday=cursor.getUTCDay(); if(weekday!==0&&weekday!==6&&!excluded.has(cursor.toISOString().slice(0,10))) remaining--; }
  return cursor.toISOString().slice(0,10);
}
