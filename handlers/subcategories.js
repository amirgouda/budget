/**
 * Subcategory handlers
 * Shared logic for both Express and Vercel
 */

const db = require('../db');

/**
 * Get subcategories by category handler
 */
async function getSubcategoriesHandler(req, res) {
  try {
    const { categoryId, search } = req.query;

    if (!categoryId) {
      return res.status(400).json({ error: 'Category ID is required' });
    }

    let query = `
      SELECT 
        s.id,
        s.name,
        s.category_id,
        s.created_by,
        s.created_at
      FROM subcategories s
      WHERE s.category_id = $1
    `;
    const params = [categoryId];
    let paramCount = 2;

    if (search) {
      query += ` AND s.name ILIKE $${paramCount}`;
      params.push(`%${search}%`);
      paramCount++;
    }

    query += ' ORDER BY s.name LIMIT 20';

    const result = await db.query(query, params);

    res.json({
      subcategories: result.rows,
    });
  } catch (error) {
    console.error('Get subcategories error:', error);
    res.status(500).json({ error: 'Failed to get subcategories' });
  }
}

/**
 * Create subcategory handler
 */
async function createSubcategoryHandler(req, res) {
  try {
    const { name, categoryId } = req.body;

    if (!name || !categoryId) {
      return res.status(400).json({ error: 'Name and category ID are required' });
    }

    // Check if category exists
    const categoryCheck = await db.query('SELECT id FROM spending_categories WHERE id = $1', [categoryId]);
    if (categoryCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Check if subcategory already exists for this category
    const existing = await db.query(
      'SELECT id FROM subcategories WHERE name = $1 AND category_id = $2',
      [name.trim(), categoryId]
    );

    if (existing.rows.length > 0) {
      return res.json({
        success: true,
        subcategory: existing.rows[0],
        alreadyExists: true,
      });
    }

    const result = await db.query(
      `INSERT INTO subcategories (name, category_id, created_by)
       VALUES ($1, $2, $3)
       RETURNING id, name, category_id, created_by, created_at`,
      [name.trim(), categoryId, req.user.id]
    );

    res.status(201).json({
      success: true,
      subcategory: result.rows[0],
      alreadyExists: false,
    });
  } catch (error) {
    console.error('Create subcategory error:', error);
    if (error.code === '23505') { // Unique constraint violation
      return res.status(409).json({ error: 'Subcategory already exists for this category' });
    }
    res.status(500).json({ error: 'Failed to create subcategory' });
  }
}

module.exports = {
  getSubcategoriesHandler,
  createSubcategoryHandler,
};

