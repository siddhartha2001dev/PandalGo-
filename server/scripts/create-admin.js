import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { User } from '../src/models/User.js';
import { connectDB } from '../src/config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export async function createAdmin() {
  const email = process.argv[2] || process.env.ADMIN_EMAIL || 'admin@pandalgo.com';
  const password = process.argv[3] || process.env.ADMIN_PASSWORD;
  const name = process.argv[4] || process.env.ADMIN_NAME || 'PandalGo Admin';

  if (!password) {
    throw new Error('Provide an admin password as the third argument or set ADMIN_PASSWORD in the environment.');
  }

  console.log(`[Admin Setup] Initializing owner/admin account for: ${email}`);

  try {
    await connectDB();

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    if (existingUser) {
      existingUser.role = 'admin';
      existingUser.name = name;
      existingUser.passwordHash = passwordHash;
      await existingUser.save();
      console.log(`✅ Successfully updated existing user to Owner/Admin: ${email}`);
    } else {
      const admin = await User.create({
        name,
        email: email.toLowerCase(),
        passwordHash,
        role: 'admin',
      });
      console.log(`✅ Successfully created new Owner/Admin account: ${admin.email}`);
    }

    console.log(`\n==============================================`);
    console.log(`👑 Admin Credentials:`);
    console.log(`   Email:    ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`==============================================\n`);
  } catch (err) {
    console.error('❌ Failed to create admin account:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  createAdmin();
}
