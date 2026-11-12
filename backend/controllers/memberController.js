const pool = require("../config/db");
const crypto = require("crypto");

// Generate unique member code
const generateMemberCode = () => {
  return `MEM-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
};

// 1. Register a new member
const createMember = async (req, res) => {
  try {
    const {
      full_name,
      email,
      phone,
      address,
      emergency_contact
    } = req.body;

    if (!full_name || !phone) {
      return res.status(400).json({
        message: "Full name and phone are required"
      });
    }

    const member_code = generateMemberCode();

    const [result] = await pool.execute(
      `INSERT INTO members
      (member_code, full_name, email, phone, address, emergency_contact)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [
        member_code,
        full_name,
        email || null,
        phone,
        address || null,
        emergency_contact || null
      ]
    );

    res.status(201).json({
      message: "Member registered successfully",
      member: {
        member_id: result.insertId,
        member_code,
        full_name,
        email: email || null,
        phone,
        status: "ACTIVE"
      }
    });

  } catch (error) {
    console.error("Create member error:", error);

    res.status(500).json({
      message: "Failed to register member"
    });
  }
};

// 2. Get all members with search and filtering
const getAllMembers = async (req, res) => {
  try {
    const {
      search = "",
      status,
      page = 1,
      limit = 10
    } = req.query;

    // Ensure they are strictly integers
    const pageNumber = Math.max(1, Number(page) || 1);
    const pageSize = Math.floor(Math.min(100, Math.max(1, Number(limit) || 10)));
    const offset = Math.floor((pageNumber - 1) * pageSize);

    const conditions = [];
    const params = [];

    if (search.trim()) {
      conditions.push(
        "(full_name LIKE ? OR member_code LIKE ? OR phone LIKE ? OR email LIKE ?)"
      );

      const keyword = `%${search.trim()}%`;

      params.push(keyword, keyword, keyword, keyword);
    }

    if (status) {
      const allowedStatuses = ["ACTIVE", "INACTIVE", "SUSPENDED"];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          message: "Invalid member status"
        });
      }

      conditions.push("status = ?");
      params.push(status);
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    // FIX: Inline pageSize and offset directly into the query string.
    // mysql2/TiDB do not allow LIMIT/OFFSET to be bound parameters in execute().
    const [members] = await pool.execute(
      `SELECT * FROM members
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT ${pageSize} OFFSET ${offset}`,
      params
    );

    const [countResult] = await pool.execute(
      `SELECT COUNT(*) AS total
       FROM members ${whereClause}`,
      params
    );

    const total = Number(countResult[0].total);

    res.status(200).json({
      message: "Members retrieved successfully",
      members,
      pagination: {
        currentPage: pageNumber,
        limit: pageSize,
        totalMembers: total,
        totalPages: Math.ceil(total / pageSize)
      }
    });

  } catch (error) {
    console.error("Get members error:", error);

    res.status(500).json({
      message: "Failed to retrieve members"
    });
  }
};

// 3. Get member by ID
const getMemberById = async (req, res) => {
  try {
    const { id } = req.params;

    const [members] = await pool.execute(
      "SELECT * FROM members WHERE member_id = ?",
      [id]
    );

    if (members.length === 0) {
      return res.status(404).json({
        message: "Member not found"
      });
    }

    res.status(200).json({
      member: members[0]
    });

  } catch (error) {
    console.error("Get member error:", error);

    res.status(500).json({
      message: "Failed to retrieve member"
    });
  }
};

// 4. Update member information
const updateMember = async (req, res) => {
  try {
    const { id } = req.params;

    const allowedFields = [
      "full_name",
      "email",
      "phone",
      "address",
      "emergency_contact"
    ];

    const updates = [];
    const values = [];

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        if (
          (field === "full_name" || field === "phone") &&
          !req.body[field]
        ) {
          return res.status(400).json({
            message: `${field} cannot be empty`
          });
        }

        updates.push(`${field} = ?`);
        values.push(req.body[field] || null);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({
        message: "No valid fields provided for update"
      });
    }

    const [result] = await pool.execute(
      `UPDATE members
       SET ${updates.join(", ")}
       WHERE member_id = ?`,
      [...values, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Member not found or no changes made"
      });
    }

    res.status(200).json({
      message: "Member updated successfully"
    });

  } catch (error) {
    console.error("Update member error:", error);

    res.status(500).json({
      message: "Failed to update member"
    });
  }
};

// 5. Change member status
const updateMemberStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = [
      "ACTIVE",
      "INACTIVE",
      "SUSPENDED"
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid member status"
      });
    }

    const [result] = await pool.execute(
      "UPDATE members SET status = ? WHERE member_id = ?",
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Member not found"
      });
    }

    res.status(200).json({
      message: "Member status updated successfully",
      status
    });

  } catch (error) {
    console.error("Status update error:", error);

    res.status(500).json({
      message: "Failed to update member status"
    });
  }
};

// 6. Renew membership
const renewMembership = async (req, res) => {
  try {
    const { id } = req.params;

    res.status(200).json({ message: "Membership renewed successfully!" });
  } catch (error) {
    console.error("Error renewing membership:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = {
  createMember,
  getAllMembers,
  getMemberById,
  updateMember,
  updateMemberStatus,
  renewMembership
};