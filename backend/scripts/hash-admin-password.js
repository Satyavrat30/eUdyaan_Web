/**
 * Usage: node scripts/hash-admin-password.js yourpassword
 * Copy the output hash into your .env as ADMIN_PASSWORD_HASH=...
 */
const bcrypt = require("bcryptjs");
const password = process.argv[2];
if (!password) { console.error("Usage: node scripts/hash-admin-password.js <password>"); process.exit(1); }
bcrypt.hash(password, 12).then(hash => {
  console.log("\nAdd this to your backend/.env:\n");
  console.log(`ADMIN_PASSWORD_HASH=${hash}\n`);
}).catch(err => { console.error(err); process.exit(1); });
