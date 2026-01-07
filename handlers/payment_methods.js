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
      'SELECT id, name, icon FROM payment_methods ORDER BY name'
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
 * Get user's default payment method handler
 */
async function getDefaultPaymentMethodHandler(req, res) {
  try {
    const userId = req.user.id;

    const result = await db.query(
      `SELECT u.default_payment_method_id, pm.id, pm.name, pm.icon
       FROM users u
       LEFT JOIN payment_methods pm ON u.default_payment_method_id = pm.id
       WHERE u.id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      defaultPaymentMethod: result.rows[0].default_payment_method_id
        ? {
            id: result.rows[0].id,
            name: result.rows[0].name,
            icon: result.rows[0].icon,
          }
        : null,
    });
  } catch (error) {
    console.error('Get default payment method error:', error);
    res.status(500).json({ error: 'Failed to get default payment method' });
  }
}

/**
 * Set user's default payment method handler
 */
async function setDefaultPaymentMethodHandler(req, res) {
  try {
    const userId = req.user.id;
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

    // Update user's default payment method
    await db.query(
      'UPDATE users SET default_payment_method_id = $1 WHERE id = $2',
      [paymentMethodId, userId]
    );

    // Get updated payment method details
    const updatedResult = await db.query(
      `SELECT pm.id, pm.name, pm.icon
       FROM payment_methods pm
       WHERE pm.id = $1`,
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
  setDefaultPaymentMethodHandler,
};

