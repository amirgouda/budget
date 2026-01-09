/**
 * Date utility functions for custom month calculations
 * Handles month periods that start on any day of the month (1-31)
 */

const db = require('../db');

// Cache for month_start_day to avoid repeated DB queries
let cachedMonthStartDay = null;
let cacheTimestamp = null;
const CACHE_TTL = 60000; // 1 minute cache

/**
 * Get the month start day from database (with caching)
 * @returns {Promise<number>} Day of month (1-31)
 */
async function getMonthStartDay() {
  const now = Date.now();
  
  // Return cached value if still valid
  if (cachedMonthStartDay !== null && cacheTimestamp && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedMonthStartDay;
  }

  try {
    const result = await db.query(
      "SELECT value FROM app_settings WHERE key = 'month_start_day'"
    );
    
    if (result.rows.length > 0) {
      const day = parseInt(result.rows[0].value, 10);
      // Validate day is between 1-31
      if (day >= 1 && day <= 31) {
        cachedMonthStartDay = day;
        cacheTimestamp = now;
        return day;
      }
    }
    
    // Default to 1 if not found or invalid
    cachedMonthStartDay = 1;
    cacheTimestamp = now;
    return 1;
  } catch (error) {
    console.error('Error fetching month_start_day:', error);
    // Return default on error
    return 1;
  }
}

/**
 * Clear the cache (useful after updating the setting)
 */
function clearMonthStartDayCache() {
  cachedMonthStartDay = null;
  cacheTimestamp = null;
}

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
 * Get custom month range for a given date
 * @param {Date} date - The date to calculate the period for
 * @param {number} monthStartDay - Day of month when period starts (1-31)
 * @returns {Object} {startDate: string, endDate: string} in YYYY-MM-DD format
 */
function getCustomMonthRange(date, monthStartDay) {
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
 * @returns {Promise<Object>} {startDate: string, endDate: string} in YYYY-MM-DD format
 */
async function getCurrentCustomMonthRange() {
  const monthStartDay = await getMonthStartDay();
  const now = new Date();
  return getCustomMonthRange(now, monthStartDay);
}

/**
 * Get custom month range for a specific date (async version that fetches monthStartDay)
 * @param {Date} date - The date to calculate the period for
 * @returns {Promise<Object>} {startDate: string, endDate: string} in YYYY-MM-DD format
 */
async function getCustomMonthRangeForDate(date) {
  const monthStartDay = await getMonthStartDay();
  return getCustomMonthRange(date, monthStartDay);
}

module.exports = {
  getMonthStartDay,
  clearMonthStartDayCache,
  getCustomMonthRange,
  getCurrentCustomMonthRange,
  getCustomMonthRangeForDate,
  getLastDayOfMonth,
};
