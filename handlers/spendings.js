/**
 * Spending handlers
 * Shared logic for both Express and Vercel
 */

const db = require('../db');

/**
 * Get spendings handler
 * Returns all spendings (shared budget). Supports optional filtering by userId, category, and date range
 */
async function getSpendingsHandler(req, res) {
  try {
    const { userId, categoryId, startDate, endDate, limit = 100 } = req.query;
    const currentUser = req.user;

    let query = `
      SELECT 
        s.id,
        s.amount,
        s.date,
        s.created_at,
        s.user_id,
        u.username as user_name,
        s.category_id,
        c.name as category_name,
        c.monthly_budget,
        s.subcategory_id,
        sc.name as subcategory_name
      FROM spendings s
      JOIN users u ON s.user_id = u.id
      JOIN spending_categories c ON s.category_id = c.id
      LEFT JOIN subcategories sc ON s.subcategory_id = sc.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    // Optional filter by userId (for admin filtering if needed)
    if (userId) {
      query += ` AND s.user_id = $${paramCount}`;
      params.push(userId);
      paramCount++;
    }

    if (categoryId) {
      query += ` AND s.category_id = $${paramCount}`;
      params.push(categoryId);
      paramCount++;
    }

    if (startDate) {
      query += ` AND s.date >= $${paramCount}`;
      params.push(startDate);
      paramCount++;
    }

    if (endDate) {
      query += ` AND s.date <= $${paramCount}`;
      params.push(endDate);
      paramCount++;
    }

    query += ` ORDER BY s.date DESC, s.created_at DESC LIMIT $${paramCount}`;
    params.push(parseInt(limit));

    const result = await db.query(query, params);

    res.json({
      spendings: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error('Get spendings error:', error);
    res.status(500).json({ error: 'Failed to get spendings' });
  }
}

/**
 * Add spending handler
 */
async function addSpendingHandler(req, res) {
  try {
    const { categoryId, amount, subcategoryId, date } = req.body;
    const userId = req.user.id;

    if (!categoryId || !amount) {
      return res.status(400).json({ error: 'Category and amount are required' });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }

    // Verify category exists
    const categoryResult = await db.query('SELECT id FROM spending_categories WHERE id = $1', [categoryId]);
    if (categoryResult.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Verify subcategory exists and belongs to category if provided
    if (subcategoryId) {
      const subcategoryResult = await db.query(
        'SELECT id FROM subcategories WHERE id = $1 AND category_id = $2',
        [subcategoryId, categoryId]
      );
      if (subcategoryResult.rows.length === 0) {
        return res.status(404).json({ error: 'Subcategory not found for this category' });
      }
    }

    const spendingDate = date || new Date().toISOString().split('T')[0];

    const result = await db.query(
      `INSERT INTO spendings (user_id, category_id, amount, subcategory_id, date)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, user_id, category_id, amount, subcategory_id, date, created_at`,
      [userId, categoryId, amountNum, subcategoryId || null, spendingDate]
    );

    // Get full spending details with category and subcategory names
    const fullResult = await db.query(
      `SELECT 
        s.id,
        s.amount,
        s.date,
        s.created_at,
        s.user_id,
        u.username as user_name,
        s.category_id,
        c.name as category_name,
        c.monthly_budget,
        s.subcategory_id,
        sc.name as subcategory_name
      FROM spendings s
      JOIN users u ON s.user_id = u.id
      JOIN spending_categories c ON s.category_id = c.id
      LEFT JOIN subcategories sc ON s.subcategory_id = sc.id
      WHERE s.id = $1`,
      [result.rows[0].id]
    );

    res.status(201).json({
      success: true,
      spending: fullResult.rows[0],
    });
  } catch (error) {
    console.error('Add spending error:', error);
    res.status(500).json({ error: 'Failed to add spending' });
  }
}

/**
 * Delete spending handler
 */
async function deleteSpendingHandler(req, res) {
  try {
    const { id } = req.params;
    const currentUser = req.user;

    // Get spending to check ownership
    const spendingResult = await db.query('SELECT user_id FROM spendings WHERE id = $1', [id]);
    if (spendingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Spending not found' });
    }

    // Only allow deletion if user owns it or is admin
    if (spendingResult.rows[0].user_id !== currentUser.id && currentUser.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this spending' });
    }

    await db.query('DELETE FROM spendings WHERE id = $1', [id]);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete spending error:', error);
    res.status(500).json({ error: 'Failed to delete spending' });
  }
}

/**
 * Get spending statistics handler
 * Returns aggregated statistics across all users (shared budget)
 */
async function getSpendingStatsHandler(req, res) {
  try {
    const { startDate, endDate } = req.query;

    let dateFilter = '';
    const params = [];
    let paramCount = 1;

    if (startDate && endDate) {
      dateFilter = `WHERE s.date >= $${paramCount} AND s.date <= $${paramCount + 1}`;
      params.push(startDate, endDate);
      paramCount += 2;
    } else {
      // Default to current month
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      dateFilter = `WHERE s.date >= $${paramCount} AND s.date <= $${paramCount + 1}`;
      params.push(firstDay, lastDay);
      paramCount += 2;
    }

    // Get total spending by category (aggregated across all users)
    let categoryStatsQuery = `
      SELECT 
        c.id,
        c.name,
        c.monthly_budget,
        COALESCE(SUM(s.amount), 0) as total_spent,
        c.monthly_budget - COALESCE(SUM(s.amount), 0) as remaining
      FROM spending_categories c
      LEFT JOIN spendings s ON c.id = s.category_id
    `;
    
    if (dateFilter) {
      categoryStatsQuery += ` ${dateFilter.replace('WHERE', 'AND')}`;
    }
    
    categoryStatsQuery += ' GROUP BY c.id, c.name, c.monthly_budget ORDER BY c.name';
    
    const categoryStats = await db.query(categoryStatsQuery, params);

    // Get total spending
    let totalQuery = 'SELECT COALESCE(SUM(amount), 0) as total FROM spendings s';
    const totalParams = [];
    let totalParamCount = 1;
    
    if (startDate && endDate) {
      totalQuery += ` WHERE s.date >= $${totalParamCount} AND s.date <= $${totalParamCount + 1}`;
      totalParams.push(startDate, endDate);
      totalParamCount += 2;
    } else {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      totalQuery += ` WHERE s.date >= $${totalParamCount} AND s.date <= $${totalParamCount + 1}`;
      totalParams.push(firstDay, lastDay);
      totalParamCount += 2;
    }
    
    const totalResult = await db.query(totalQuery, totalParams);

    res.json({
      categories: categoryStats.rows,
      total: parseFloat(totalResult.rows[0].total),
    });
  } catch (error) {
    console.error('Get spending stats error:', error);
    res.status(500).json({ error: 'Failed to get spending statistics' });
  }
}

module.exports = {
  getSpendingsHandler,
  addSpendingHandler,
  deleteSpendingHandler,
  getSpendingStatsHandler,
};

