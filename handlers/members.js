/**
 * Member handlers
 * Shared logic for both Express and Vercel
 * Admin only
 */

const db = require('../db');
const auth = require('../auth');

/**
 * Get all members handler
 */
async function getMembersHandler(req, res) {
  try {
    const result = await db.query(
      `SELECT 
        id,
        username,
        role,
        created_at
      FROM users
      ORDER BY username`
    );

    res.json({
      members: result.rows,
    });
  } catch (error) {
    console.error('Get members error:', error);
    res.status(500).json({ error: 'Failed to get members' });
  }
}

/**
 * Create member handler
 */
async function createMemberHandler(req, res) {
  try {
    const { username, password, role = 'member' } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    if (role !== 'admin' && role !== 'member') {
      return res.status(400).json({ error: 'Role must be admin or member' });
    }

    // Check if username already exists
    const existing = await db.query('SELECT id FROM users WHERE username = $1', [username]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    const passwordHash = await auth.hashPassword(password);

    const result = await db.query(
      `INSERT INTO users (username, password_hash, role)
       VALUES ($1, $2, $3)
       RETURNING id, username, role, created_at`,
      [username, passwordHash, role]
    );

    res.status(201).json({
      success: true,
      member: result.rows[0],
    });
  } catch (error) {
    console.error('Create member error:', error);
    res.status(500).json({ error: 'Failed to create member' });
  }
}

/**
 * Update member handler
 */
async function updateMemberHandler(req, res) {
  try {
    const { id } = req.params;
    const { username, password, role } = req.body;

    // Check if user exists
    const existing = await db.query('SELECT id, role FROM users WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Prevent changing the last admin's role
    if (role && role !== 'admin' && existing.rows[0].role === 'admin') {
      const adminCount = await db.query("SELECT COUNT(*) FROM users WHERE role = 'admin'");
      if (parseInt(adminCount.rows[0].count) <= 1) {
        return res.status(400).json({ error: 'Cannot remove the last admin' });
      }
    }

    const updates = [];
    const params = [];
    let paramCount = 1;

    if (username !== undefined) {
      // Check if new username conflicts
      const usernameCheck = await db.query(
        'SELECT id FROM users WHERE username = $1 AND id != $2',
        [username, id]
      );
      if (usernameCheck.rows.length > 0) {
        return res.status(409).json({ error: 'Username already exists' });
      }
      updates.push(`username = $${paramCount}`);
      params.push(username);
      paramCount++;
    }

    if (password !== undefined) {
      const passwordHash = await auth.hashPassword(password);
      updates.push(`password_hash = $${paramCount}`);
      params.push(passwordHash);
      paramCount++;
    }

    if (role !== undefined) {
      if (role !== 'admin' && role !== 'member') {
        return res.status(400).json({ error: 'Role must be admin or member' });
      }
      updates.push(`role = $${paramCount}`);
      params.push(role);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(id);
    const result = await db.query(
      `UPDATE users 
       SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING id, username, role, created_at`,
      params
    );

    res.json({
      success: true,
      member: result.rows[0],
    });
  } catch (error) {
    console.error('Update member error:', error);
    res.status(500).json({ error: 'Failed to update member' });
  }
}

/**
 * Delete member handler
 */
async function deleteMemberHandler(req, res) {
  try {
    const { id } = req.params;

    // Check if user exists
    const existing = await db.query('SELECT id, role FROM users WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Prevent deleting the last admin
    if (existing.rows[0].role === 'admin') {
      const adminCount = await db.query("SELECT COUNT(*) FROM users WHERE role = 'admin'");
      if (parseInt(adminCount.rows[0].count) <= 1) {
        return res.status(400).json({ error: 'Cannot delete the last admin' });
      }
    }

    // Prevent deleting yourself
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Check if user has created categories (which would prevent deletion)
    const categoriesCheck = await db.query(
      'SELECT COUNT(*) FROM spending_categories WHERE created_by = $1',
      [id]
    );
    const categoryCount = parseInt(categoriesCheck.rows[0].count);
    
    if (categoryCount > 0) {
      // Set created_by to NULL for categories created by this user before deletion
      await db.query(
        'UPDATE spending_categories SET created_by = NULL WHERE created_by = $1',
        [id]
      );
    }

    await db.query('DELETE FROM users WHERE id = $1', [id]);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete member error:', error);
    // Check for foreign key constraint errors
    if (error.code === '23503' || error.message.includes('foreign key')) {
      return res.status(400).json({ 
        error: 'Cannot delete member: user has associated records that prevent deletion',
        details: error.message 
      });
    }
    res.status(500).json({ error: 'Failed to delete member', details: error.message });
  }
}

module.exports = {
  getMembersHandler,
  createMemberHandler,
  updateMemberHandler,
  deleteMemberHandler,
};


