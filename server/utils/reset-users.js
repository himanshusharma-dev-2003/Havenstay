/**
 * reset-users.js
 * Run this script to create or reset the admin and demo users.
 * It will NOT touch hotels or rooms data.
 *
 * Usage:
 *   node server/utils/reset-users.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('❌ MONGO_URI is not set. Check your server/.env file.');
  process.exit(1);
}

// Inline minimal User schema so we don't trigger the pre-save hook double-hash
const { Schema } = mongoose;
const userSchema = new Schema({
  name:             { type: String },
  email:            { type: String, lowercase: true, trim: true },
  password:         { type: String, select: false },
  role:             { type: String, enum: ['user', 'admin'], default: 'user' },
  refreshTokenHash: { type: String, select: false },
  isActive:         { type: Boolean, default: true },
  lastLogin:        Date,
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', userSchema);

async function resetUsers() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB Atlas');

    const users = [
      { name: 'Admin',     email: 'admin@havenstay.com', password: 'Admin@123', role: 'admin' },
      { name: 'Demo User', email: 'demo@havenstay.com',  password: 'Demo@1234', role: 'user'  },
    ];

    for (const u of users) {
      const hash = await bcrypt.hash(u.password, 12);
      const result = await User.findOneAndUpdate(
        { email: u.email },
        { name: u.name, password: hash, role: u.role, isActive: true, refreshTokenHash: null },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      console.log(`✔  ${u.role.padEnd(5)} (${u.email}) — ${result ? 'updated' : 'created'}`);
    }

    console.log('\n🎉 Done! Credentials:');
    console.log('   Admin: admin@havenstay.com / Admin@123');
    console.log('   User:  demo@havenstay.com  / Demo@1234');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

resetUsers();
