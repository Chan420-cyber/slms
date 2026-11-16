const pool = require("../config/db");
const bcrypt = require("bcryptjs");

// 1. Get all staff/users
const getAllUsers = async (req, res) => {
  try {
    const [users] = await pool.execute(
      `SELECT user_id, username, email, role, status, created_at 
       FROM users 
       ORDER BY created_at DESC`
    );
    res.status(200).json({ total: users.length, users });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ message: "Failed to retrieve users" });
  }
};

// 2. Create a new staff account
const createUser = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!["ADMIN", "STAFF"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    // Check for duplicates
    const [existing] = await pool.execute(
      "SELECT user_id FROM users WHERE username = ? OR email = ?",
      [username, email]
    );

    if (existing.length > 0) {
      return res.status(409).json({ message: "Username or email already exists" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const [result] = await pool.execute(
      `INSERT INTO users (username, email, password_hash, role) 
       VALUES (?, ?, ?, ?)`,
      [username, email, password_hash, role]
    );

    res.status(201).json({
      message: "Staff account created successfully",
      user_id: result.insertId,
      username,
      email,
      role,
      status: "ACTIVE"
    });
  } catch (error) {
    console.error("Create user error:", error);
    res.status(500).json({ message: "Failed to create user" });
  }
};

// 3. Update user status (Active/Inactive)
const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["ACTIVE", "INACTIVE"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    // Prevent admin from deactivating themselves
    if (req.user.id === Number(id) && status === "INACTIVE") {
      return res.status(400).json({ message: "You cannot deactivate your own account" });
    }

    const [result] = await pool.execute(
      "UPDATE users SET status = ? WHERE user_id = ?",
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "User status updated", status });
  } catch (error) {
    console.error("Update status error:", error);
    res.status(500).json({ message: "Failed to update user status" });
  }
};

// 4. Change Password (For the logged-in user)
const changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const userId = req.user.id || req.user.userId;

    if (!current_password || !new_password) {
      return res.status(400).json({ message: "Both current and new passwords are required" });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    // Get current user
    const [users] = await pool.execute(
      "SELECT password_hash FROM users WHERE user_id = ?",
      [userId]
    );

    if (!users.length) {
      return res.status(404).json({ message: "User not found" });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(current_password, users[0].password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: "Incorrect current password" });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const new_hash = await bcrypt.hash(new_password, salt);

    await pool.execute(
      "UPDATE users SET password_hash = ? WHERE user_id = ?",
      [new_hash, userId]
    );

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ message: "Failed to change password" });
  }
};

module.exports = {
  getAllUsers,
  createUser,
  updateUserStatus,
  changePassword
};