
require("dotenv").config();

const bcrypt = require("bcryptjs");
const pool = require("../config/db");

async function createAdmin() {
  try {
    const { ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;

    if (!ADMIN_USERNAME || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
      throw new Error("Admin environment variables are missing.");
    }

    const [existing] = await pool.execute(
      "SELECT user_id FROM users WHERE email = ?",
      [ADMIN_EMAIL]
    );

    if (existing.length > 0) {
      console.log("Admin account already exists.");
      return;
    }

    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);

    await pool.execute(
      `INSERT INTO users (username, email, password_hash, role)
       VALUES (?, ?, ?, 'ADMIN')`,
      [ADMIN_USERNAME, ADMIN_EMAIL, hashedPassword]
    );

    console.log("Admin account created successfully!");
  } catch (error) {
    console.error("Error creating admin:", error.message);
  } finally {
    await pool.end();
  }
}

createAdmin();
