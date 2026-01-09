/**
 * Date utility functions for custom month calculations (Frontend)
 * Handles month periods that start on any day of the month (1-31)
 */

/**
 * Get the last day of a month, handling edge cases
 * @param {number} year - Year
 * @param {number} month - Month (0-11, JavaScript Date format)
 * @returns {number} Last day of the month
 */
function getLastDayOfMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Format date as YYYY-MM-DD without timezone conversion
 * @param {number} year - Year
 * @param {number} month - Month (0-11, JavaScript Date format)
 * @param {number} day - Day of month
 * @returns {string} Formatted date string (YYYY-MM-DD)
 */
function formatLocalDate(year, month, day) {
  const y = String(year);
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Normalize a date to local midnight (00:00:00 local time)
 * This ensures consistent date comparisons without timezone issues
 * @param {Date|string} date - Date to normalize
 * @returns {Date} Date normalized to local midnight
 */
export function normalizeToLocalMidnight(date) {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Get custom month range for a given date
 * @param {Date} date - The date to calculate the period for
 * @param {number} monthStartDay - Day of month when period starts (1-31)
 * @returns {Object} {startDate: string, endDate: string} in YYYY-MM-DD format
 */
export function getCustomMonthRange(date, monthStartDay) {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-11
  const day = date.getDate();

  let startYear, startMonth, startDay;
  let endYear, endMonth, endDay;

  if (day >= monthStartDay) {
    // Current date is on or after the start day, so period started this month
    startYear = year;
    startMonth = month;
    startDay = monthStartDay;
  } else {
    // Current date is before the start day, so period started last month
    if (month === 0) {
      // January, so previous month is December of last year
      startYear = year - 1;
      startMonth = 11;
    } else {
      startYear = year;
      startMonth = month - 1;
    }
    startDay = monthStartDay;
  }

  // End date is the day before the start day of next period
  // Next period starts on monthStartDay of next month
  if (startMonth === 11) {
    // December, so next period starts in January of next year
    endYear = startYear + 1;
    endMonth = 0;
  } else {
    endYear = startYear;
    endMonth = startMonth + 1;
  }

  // End day is the day before monthStartDay of next month
  // Handle edge case: if monthStartDay is 31 and next month has fewer days
  const lastDayOfEndMonth = getLastDayOfMonth(endYear, endMonth);
  if (monthStartDay > lastDayOfEndMonth) {
    // Use last day of the month if monthStartDay exceeds it
    endDay = lastDayOfEndMonth;
  } else {
    endDay = monthStartDay - 1;
    // If endDay is 0, use last day of previous month
    if (endDay === 0) {
      if (endMonth === 0) {
        endYear = endYear - 1;
        endMonth = 11;
      } else {
        endMonth = endMonth - 1;
      }
      endDay = getLastDayOfMonth(endYear, endMonth);
    }
  }

  // Format dates as YYYY-MM-DD without timezone conversion
  // Using formatLocalDate instead of toISOString() to avoid timezone shifts
  return {
    startDate: formatLocalDate(startYear, startMonth, startDay),
    endDate: formatLocalDate(endYear, endMonth, endDay),
  };
}

/**
 * Get current custom month range
 * @param {number} monthStartDay - Day of month when period starts (1-31)
 * @returns {Object} {startDate: string, endDate: string} in YYYY-MM-DD format
 */
export function getCurrentCustomMonthRange(monthStartDay) {
  const now = new Date();
  return getCustomMonthRange(now, monthStartDay);
}

/**
 * Format date range for display
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @returns {string} Formatted date range string
 */
export function formatDateRange(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const startFormatted = start.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  
  const endFormatted = end.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  
  return `${startFormatted} - ${endFormatted}`;
}
