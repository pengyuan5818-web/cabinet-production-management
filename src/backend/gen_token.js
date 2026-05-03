const http = require('http');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'cabinet-factory-dev-key-2026';

// Try to directly generate a valid token for the admin user and test it
const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/cabinet_factory' });

async function main() {
  const users = await pool.query(`SELECT id, username, role FROM sys_user WHERE username='admin' LIMIT 1`);
  if (users.rows.length === 0) { console.log('no admin user'); return; }
  const user = users.rows[0];
  console.log('admin user:', user);

  // Generate a token like auth.js would
  const token = jwt.sign(
    { userId: user.id, username: user.username, type: 'system' },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
  console.log('Generated token:', token.substring(0, 50) + '...');

  // Test it
  const opts = {
    hostname: 'localhost', port: 3000,
    path: '/api/customers/list', method: 'GET',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
  };
  const req = http.request(opts, res => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => console.log('customer list response:', res.statusCode, d.substring(0, 200)));
  });
  req.on('error', console.error);
  req.end();

  await pool.end();
}

main().catch(console.error);
