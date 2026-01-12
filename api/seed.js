import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
  try {
    // Check if admin exists
    const existing = await pool.query("SELECT * FROM users WHERE email = 'admin@chaishorts.com'");
    
    if (existing.rows.length > 0) {
      return res.json({ message: 'Admin already exists' });
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await pool.query(
      "INSERT INTO users (username, email, password, role) VALUES ($1, $2, $3, $4)",
      ['admin', 'admin@chaishorts.com', hashedPassword, 'admin']
    );

    res.json({ message: 'Admin user created successfully' });
  } catch (error) {
    console.error('Seed error:', error);
    res.status(500).json({ error: error.message });
  }
}
