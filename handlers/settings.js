/**
 * Settings handlers
 * Handles app-wide settings like month_start_day
 */

const db = require('../db');
const dateHelpers = require('../utils/dateHelpers');

/**
 * Get all settings handler
 * Returns all app settings
 */
async function getSettingsHandler(req, res) {
  try {
    const result = await db.query('SELECT key, value FROM app_settings');
    
    // Convert array of rows to object
    const settings = {};
    result.rows.forEach(row => {
      settings[row.key] = row.value;
    });

    res.json({ settings });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to get settings' });
  }
}

/**
 * Update setting handler
 * Updates a specific setting (admin only)
 */
async function updateSettingHandler(req, res) {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (!key || value === undefined) {
      return res.status(400).json({ error: 'Key and value are required' });
    }

    // Validate month_start_day
    if (key === 'month_start_day') {
      const day = parseInt(value, 10);
      if (isNaN(day) || day < 1 || day > 31) {
        return res.status(400).json({ error: 'month_start_day must be a number between 1 and 31' });
      }
    }

    // Update or insert setting
    const result = await db.query(
      `INSERT INTO app_settings (key, value, updated_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (key) 
       DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP
       RETURNING key, value`,
      [key, String(value)]
    );

    // Clear cache if month_start_day was updated
    if (key === 'month_start_day') {
      dateHelpers.clearMonthStartDayCache();
    }

    res.json({
      success: true,
      setting: result.rows[0],
    });
  } catch (error) {
    console.error('Update setting error:', error);
    res.status(500).json({ error: 'Failed to update setting' });
  }
}

module.exports = {
  getSettingsHandler,
  updateSettingHandler,
};
