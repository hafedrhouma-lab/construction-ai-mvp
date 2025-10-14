import pool from '../../config/database.js';

class ProjectsRepository {
  /**
   * Create a new project
   */
  async create(projectData) {
    const {
      user_id,
      customer_id,
      name,
      description,
      customer_name,
      customer_email,
      metadata = {}
    } = projectData;

    // If customer_id not provided but customer_name is, try to find or create customer
    let finalCustomerId = customer_id;

    if (!finalCustomerId && customer_name) {
      // Try to find existing customer by name
      const existingCustomer = await pool.query(
        'SELECT id FROM customers WHERE user_id = $1 AND name = $2 LIMIT 1',
        [user_id, customer_name]
      );

      if (existingCustomer.rows.length > 0) {
        finalCustomerId = existingCustomer.rows[0].id;
      } else {
        // Create new customer
        const newCustomer = await pool.query(
          'INSERT INTO customers (user_id, name, email) VALUES ($1, $2, $3) RETURNING id',
          [user_id, customer_name, customer_email]
        );
        finalCustomerId = newCustomer.rows[0].id;
      }
    }

    const query = `
      INSERT INTO projects (user_id, customer_id, name, description, customer_name, customer_email, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const result = await pool.query(query, [
      user_id,
      finalCustomerId,
      name,
      description,
      customer_name,
      customer_email,
      JSON.stringify(metadata)
    ]);

    return result.rows[0];
  }

  /**
   * Find all projects
   */
  async findAll(filters = {}) {
    const { status, user_id, limit = 100, offset = 0 } = filters;

    let query = 'SELECT * FROM projects WHERE 1=1';
    const params = [];

    query += ` AND status != 'archived'`;

    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    if (user_id) {
      params.push(user_id);
      query += ` AND user_id = $${params.length}`;
    }

    query += ' ORDER BY created_at DESC';
    query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Find project by ID
   */
  async findById(id) {
    const query = 'SELECT * FROM projects WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Update project
   */
  async update(id, updates) {
    const { name, description, customer_name, customer_email, status, metadata } = updates;

    const query = `
      UPDATE projects
      SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        customer_name = COALESCE($3, customer_name),
        customer_email = COALESCE($4, customer_email),
        status = COALESCE($5, status),
        metadata = COALESCE($6, metadata),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `;

    const result = await pool.query(query, [
      name,
      description,
      customer_name,
      customer_email,
      status,
      metadata ? JSON.stringify(metadata) : null,
      id
    ]);

    return result.rows[0];
  }

  /**
   * Delete project (soft delete by archiving)
   */
  async delete(id) {
    const query = `
      UPDATE projects
      SET status = 'archived', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Get project statistics
   */
  async getStats(projectId) {
    const query = `
      SELECT
        p.id,
        p.name,
        COUNT(DISTINCT f.id) as file_count,
        COUNT(DISTINCT es.id) as session_count,
        COUNT(DISTINCT e.id) as estimate_count,
        SUM(e.total) as total_estimate_value
      FROM projects p
      LEFT JOIN files f ON f.project_id = p.id AND f.deleted_at IS NULL
      LEFT JOIN extraction_sessions es ON es.project_id = p.id
      LEFT JOIN estimates e ON e.project_id = p.id
      WHERE p.id = $1
      GROUP BY p.id, p.name
    `;

    const result = await pool.query(query, [projectId]);
    return result.rows[0];
  }
}

export default new ProjectsRepository();