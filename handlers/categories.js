/**
 * Category handlers
 * Shared logic for both Express and Vercel
 * Admin only
 */

const db = require('../db');

/**
 * Get all categories handler
 */
async function getCategoriesHandler(req, res) {
  try {
    const result = await db.query(
      `SELECT 
        c.id,
        c.name,
        c.monthly_budget,
        c.created_by,
        c.created_at,
        u.username as created_by_name
      FROM spending_categories c
      LEFT JOIN users u ON c.created_by = u.id
      ORDER BY c.name`
    );

    res.json({
      categories: result.rows,
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to get categories' });
  }
}

/**
 * Create category handler
 */
async function createCategoryHandler(req, res) {
  try {
    const { name, monthlyBudget } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const budget = parseFloat(monthlyBudget || 0);
    if (isNaN(budget) || budget < 0) {
      return res.status(400).json({ error: 'Monthly budget must be a non-negative number' });
    }

    // Check if category already exists
    const existing = await db.query('SELECT id FROM spending_categories WHERE name = $1', [name]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Category already exists' });
    }

    const result = await db.query(
      `INSERT INTO spending_categories (name, monthly_budget, created_by)
       VALUES ($1, $2, $3)
       RETURNING id, name, monthly_budget, created_by, created_at`,
      [name, budget, req.user.id]
    );

    res.status(201).json({
      success: true,
      category: result.rows[0],
    });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
}

/**
 * Update category handler
 */
async function updateCategoryHandler(req, res) {
  try {
    const { id } = req.params;
    const { name, monthlyBudget } = req.body;

    // Check if category exists
    const existing = await db.query('SELECT id FROM spending_categories WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const updates = [];
    const params = [];
    let paramCount = 1;

    if (name !== undefined) {
      // Check if new name conflicts with existing category
      const nameCheck = await db.query(
        'SELECT id FROM spending_categories WHERE name = $1 AND id != $2',
        [name, id]
      );
      if (nameCheck.rows.length > 0) {
        return res.status(409).json({ error: 'Category name already exists' });
      }
      updates.push(`name = $${paramCount}`);
      params.push(name);
      paramCount++;
    }

    if (monthlyBudget !== undefined) {
      const budget = parseFloat(monthlyBudget);
      if (isNaN(budget) || budget < 0) {
        return res.status(400).json({ error: 'Monthly budget must be a non-negative number' });
      }
      updates.push(`monthly_budget = $${paramCount}`);
      params.push(budget);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(id);
    const result = await db.query(
      `UPDATE spending_categories 
       SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING id, name, monthly_budget, created_by, created_at`,
      params
    );

    res.json({
      success: true,
      category: result.rows[0],
    });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
}

/**
 * Delete category handler
 */
async function deleteCategoryHandler(req, res) {
  try {
    const { id } = req.params;

    // Check if category exists
    const existing = await db.query('SELECT id FROM spending_categories WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Check if category has spendings
    const spendingsCheck = await db.query('SELECT COUNT(*) FROM spendings WHERE category_id = $1', [id]);
    if (parseInt(spendingsCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete category with existing spendings. Delete spendings first.' 
      });
    }

    await db.query('DELETE FROM spending_categories WHERE id = $1', [id]);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
}

module.exports = {
  getCategoriesHandler,
  createCategoryHandler,
  updateCategoryHandler,
  deleteCategoryHandler,
};


