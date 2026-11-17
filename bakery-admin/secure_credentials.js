import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

const username = 'admin@10.0.2.15';
const password = 'VgJtYcvhjjNVYk1kI9dVi3i0GE';

const salt = bcrypt.genSaltSync(12);
const hash = bcrypt.hashSync(password, salt);

console.log('Generated hash for', username);
console.log('Hash:', hash);
console.log('Self-test match:', bcrypt.compareSync(password, hash));

// 1. Update bakery admin database.json
const adminDbPath = 'C:/Users/user/Desktop/bakery admin/data/database.json';
if (fs.existsSync(adminDbPath)) {
  const db = JSON.parse(fs.readFileSync(adminDbPath, 'utf8'));
  db.admin = {
    username,
    passwordHash: hash,
    updatedAt: new Date().toISOString()
  };
  fs.writeFileSync(adminDbPath, JSON.stringify(db, null, 2), 'utf8');
  console.log('Updated bakery admin/data/database.json');
}

// 2. Update bakery system database.json if exists
const sysDbPath = 'C:/Users/user/Desktop/bakery system/data/database.json';
if (fs.existsSync(sysDbPath)) {
  const db = JSON.parse(fs.readFileSync(sysDbPath, 'utf8'));
  db.admin = {
    username,
    passwordHash: hash,
    updatedAt: new Date().toISOString()
  };
  fs.writeFileSync(sysDbPath, JSON.stringify(db, null, 2), 'utf8');
  console.log('Updated bakery system/data/database.json');
}

// 3. Create .env in bakery admin
const envContent = `# ==============================================================================
# BakerAdmin Enterprise Hardened Production Configuration
# ==============================================================================
PORT=5000
NODE_ENV=production

# Admin Master Credentials
ADMIN_USERNAME=admin@10.0.2.15
ADMIN_PASSWORD=VgJtYcvhjjNVYk1kI9dVi3i0GE

# Cryptographic Token Secret
JWT_SECRET=4f8b9e1c2d3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c
DEFAULT_OFFLINE_HOURS=72
`;

fs.writeFileSync('C:/Users/user/Desktop/bakery admin/.env', envContent, 'utf8');
fs.writeFileSync('C:/Users/user/Desktop/bakery system/.env', envContent, 'utf8');
console.log('Created .env files in bakery admin and bakery system');

