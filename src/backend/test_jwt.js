const jwt = require('jsonwebtoken');
const db = require('./src/db');

const JWT_SECRET = process.env.JWT_SECRET || 'cabinet-factory-secret-key-2026';

// Generate a real token
const token = jwt.sign({
  userId: '9ee59a32-5cb3-4c16-a6c6-8b646972c41a',
  username: 'admin',
  type: 'system'
}, JWT_SECRET, { expiresIn: '7d' });

console.log('Generated token:', token);

// Verify it immediately
try {
  const decoded = jwt.verify(token, JWT_SECRET);
  console.log('Verified OK:', JSON.stringify(decoded));
} catch(e) {
  console.log('Verify FAILED:', e.message);
}

// Now test login and then verify the returned token
(async () => {
  const r = await db.query('SELECT * FROM sys_user WHERE username = $1', ['admin']);
  const user = r.rows[0];
  
  const bcrypt = require('bcryptjs');
  const isValid = await bcrypt.compare('admin123', user.password_hash);
  console.log('Password valid:', isValid);
  
  const newToken = jwt.sign({
    userId: user.id,
    username: user.username,
    type: 'system'
  }, JWT_SECRET, { expiresIn: '7d' });
  
  console.log('New token:', newToken);
  
  try {
    const d = jwt.verify(newToken, JWT_SECRET);
    console.log('New token verified OK:', JSON.stringify(d));
  } catch(e) {
    console.log('New token verify FAILED:', e.message);
  }
  
  process.exit();
})();
