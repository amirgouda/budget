/**
 * Payment methods handlers
 * Shared logic for both Express and Vercel
 */

const db = require('../db');

/**
 * Get all payment methods handler
 */
async function getPaymentMethodsHandler(req, res) {
  try {
    const result = await db.query(
      'SELECT id, name, icon, is_default FROM payment_methods ORDER BY is_default DESC, name'
    );

    res.json({
      paymentMethods: result.rows,
    });
  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({ error: 'Failed to get payment methods' });
  }
}

/**
 * Get global default payment method handler
 */
async function getDefaultPaymentMethodHandler(req, res) {
  try {
    const result = await db.query(
      `SELECT id, name, icon, is_default
       FROM payment_methods
       WHERE is_default = TRUE
       LIMIT 1`
    );

    res.json({
      defaultPaymentMethod: result.rows.length > 0 ? result.rows[0] : null,
    });
  } catch (error) {
    console.error('Get default payment method error:', error);
    res.status(500).json({ error: 'Failed to get default payment method' });
  }
}

/**
 * Create payment method handler (admin only)
 */
async function createPaymentMethodHandler(req, res) {
  try {
    const { name, icon, isDefault } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Payment method name is required' });
    }

    // If setting as default, unset current default
    if (isDefault) {
      await db.query('UPDATE payment_methods SET is_default = FALSE WHERE is_default = TRUE');
    }

    const result = await db.query(
      `INSERT INTO payment_methods (name, icon, is_default)
       VALUES ($1, $2, $3)
       RETURNING id, name, icon, is_default`,
      [name, icon || null, isDefault || false]
    );

    res.status(201).json({
      success: true,
      paymentMethod: result.rows[0],
    });
  } catch (error) {
    if (error.code === '23505') { // Unique constraint violation
      return res.status(400).json({ error: 'Payment method with this name already exists' });
    }
    console.error('Create payment method error:', error);
    res.status(500).json({ error: 'Failed to create payment method' });
  }
}

/**
 * Update payment method handler (admin only)
 */
async function updatePaymentMethodHandler(req, res) {
  try {
    const { id } = req.params;
    const { name, icon, isDefault } = req.body;

    // Verify payment method exists
    const existingResult = await db.query(
      'SELECT id FROM payment_methods WHERE id = $1',
      [id]
    );
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Payment method not found' });
    }

    // If setting as default, unset current default first
    if (isDefault) {
      await db.query('UPDATE payment_methods SET is_default = FALSE WHERE is_default = TRUE AND id != $1', [id]);
    }

    const updates = [];
    const params = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount}`);
      params.push(name);
      paramCount++;
    }

    if (icon !== undefined) {
      updates.push(`icon = $${paramCount}`);
      params.push(icon);
      paramCount++;
    }

    if (isDefault !== undefined) {
      updates.push(`is_default = $${paramCount}`);
      params.push(isDefault);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(id);
    const result = await db.query(
      `UPDATE payment_methods
       SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING id, name, icon, is_default`,
      params
    );

    res.json({
      success: true,
      paymentMethod: result.rows[0],
    });
  } catch (error) {
    if (error.code === '23505') { // Unique constraint violation
      return res.status(400).json({ error: 'Payment method with this name already exists' });
    }
    console.error('Update payment method error:', error);
    res.status(500).json({ error: 'Failed to update payment method' });
  }
}

/**
 * Delete payment method handler (admin only)
 */
async function deletePaymentMethodHandler(req, res) {
  try {
    const { id } = req.params;

    // Verify payment method exists
    const existingResult = await db.query(
      'SELECT id, is_default FROM payment_methods WHERE id = $1',
      [id]
    );
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Payment method not found' });
    }

    // Check if it's being used in spendings
    const usageResult = await db.query(
      'SELECT COUNT(*) as count FROM spendings WHERE payment_method_id = $1',
      [id]
    );
    const usageCount = parseInt(usageResult.rows[0].count);

    if (usageCount > 0) {
      return res.status(400).json({
        error: `Cannot delete payment method. It is used in ${usageCount} spending record(s).`,
      });
    }

    // Delete the payment method
    await db.query('DELETE FROM payment_methods WHERE id = $1', [id]);

    // If it was the default, set the first available as default
    if (existingResult.rows[0].is_default) {
      const firstMethod = await db.query(
        'SELECT id FROM payment_methods ORDER BY id LIMIT 1'
      );
      if (firstMethod.rows.length > 0) {
        await db.query(
          'UPDATE payment_methods SET is_default = TRUE WHERE id = $1',
          [firstMethod.rows[0].id]
        );
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete payment method error:', error);
    res.status(500).json({ error: 'Failed to delete payment method' });
  }
}

/**
 * Set global default payment method handler (admin only)
 */
async function setDefaultPaymentMethodHandler(req, res) {
  try {
    const { paymentMethodId } = req.body;

    if (!paymentMethodId) {
      return res.status(400).json({ error: 'Payment method ID is required' });
    }

    // Verify payment method exists
    const methodResult = await db.query(
      'SELECT id FROM payment_methods WHERE id = $1',
      [paymentMethodId]
    );
    if (methodResult.rows.length === 0) {
      return res.status(404).json({ error: 'Payment method not found' });
    }

    // Unset current default
    await db.query('UPDATE payment_methods SET is_default = FALSE WHERE is_default = TRUE');

    // Set new default
    await db.query(
      'UPDATE payment_methods SET is_default = TRUE WHERE id = $1',
      [paymentMethodId]
    );

    // Get updated payment method details
    const updatedResult = await db.query(
      `SELECT id, name, icon, is_default
       FROM payment_methods
       WHERE id = $1`,
      [paymentMethodId]
    );

    res.json({
      success: true,
      defaultPaymentMethod: updatedResult.rows[0],
    });
  } catch (error) {
    console.error('Set default payment method error:', error);
    res.status(500).json({ error: 'Failed to set default payment method' });
  }
}

module.exports = {
  getPaymentMethodsHandler,
  getDefaultPaymentMethodHandler,
  createPaymentMethodHandler,
  updatePaymentMethodHandler,
  deletePaymentMethodHandler,
  setDefaultPaymentMethodHandler,
};
