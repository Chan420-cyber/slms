
const pool = require("../config/db");

// 1. Create membership plan
const createPlan = async (req, res) => {
  try {
    const { plan_name, duration_days, price, description } = req.body;

    if (!plan_name || !duration_days || price === undefined) {
      return res.status(400).json({
        message: "Plan name, duration and price are required"
      });
    }

    if (
      !Number.isInteger(Number(duration_days)) ||
      Number(duration_days) <= 0 ||
      !Number.isFinite(Number(price)) ||
      Number(price) < 0
    ) {
      return res.status(400).json({
        message: "Enter a valid duration and price"
      });
    }

    const [result] = await pool.execute(
      `INSERT INTO membership_plans
       (plan_name, duration_days, price, description)
       VALUES (?, ?, ?, ?)`,
      [
        plan_name.trim(),
        Number(duration_days),
        Number(price),
        description || null
      ]
    );

    res.status(201).json({
      message: "Membership plan created successfully",
      plan_id: result.insertId
    });

  } catch (error) {
    console.error("Create plan error:", error);

    res.status(500).json({
      message: "Failed to create membership plan"
    });
  }
};

// 2. Get all membership plans
const getAllPlans = async (req, res) => {
  try {
    const { status, search } = req.query;

    const conditions = [];
    const params = [];

    if (status) {
      if (!["ACTIVE", "INACTIVE"].includes(status)) {
        return res.status(400).json({
          message: "Invalid plan status"
        });
      }

      conditions.push("status = ?");
      params.push(status);
    }

    if (search) {
      conditions.push("plan_name LIKE ?");
      params.push(`%${search.trim()}%`);
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const [plans] = await pool.execute(
      `SELECT * FROM membership_plans
       ${whereClause}
       ORDER BY created_at DESC`,
      params
    );

    res.status(200).json({
      message: "Membership plans retrieved successfully",
      total: plans.length,
      plans
    });

  } catch (error) {
    console.error("Get plans error:", error);

    res.status(500).json({
      message: "Failed to retrieve membership plans"
    });
  }
};

// 3. Get plan by ID
const getPlanById = async (req, res) => {
  try {
    const { id } = req.params;

    const [plans] = await pool.execute(
      "SELECT * FROM membership_plans WHERE plan_id = ?",
      [id]
    );

    if (plans.length === 0) {
      return res.status(404).json({
        message: "Membership plan not found"
      });
    }

    res.status(200).json({
      plan: plans[0]
    });

  } catch (error) {
    console.error("Get plan error:", error);

    res.status(500).json({
      message: "Failed to retrieve membership plan"
    });
  }
};

// 4. Update membership plan
const updatePlan = async (req, res) => {
  try {
    const { id } = req.params;

    const allowedFields = [
      "plan_name",
      "duration_days",
      "price",
      "description"
    ];

    const updates = [];
    const values = [];

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        const value = req.body[field];

        if (
          field === "plan_name" &&
          (typeof value !== "string" || !value.trim())
        ) {
          return res.status(400).json({
            message: "Plan name cannot be empty"
          });
        }

        if (
          field === "duration_days" &&
          (!Number.isInteger(Number(value)) || Number(value) <= 0)
        ) {
          return res.status(400).json({
            message: "Duration must be a positive whole number"
          });
        }

        if (
          field === "price" &&
          (!Number.isFinite(Number(value)) || Number(value) < 0)
        ) {
          return res.status(400).json({
            message: "Price must be a valid non-negative number"
          });
        }

        updates.push(`${field} = ?`);

        values.push(
          field === "plan_name" ? value.trim() :
          field === "description" ? (value || null) :
          Number(value)
        );
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({
        message: "No valid fields provided"
      });
    }

    const [result] = await pool.execute(
      `UPDATE membership_plans
       SET ${updates.join(", ")}
       WHERE plan_id = ?`,
      [...values, id]
    );

    if (result.affectedRows === 0) {
      const [existing] = await pool.execute(
        "SELECT plan_id FROM membership_plans WHERE plan_id = ?",
        [id]
      );

      if (existing.length === 0) {
        return res.status(404).json({
          message: "Membership plan not found"
        });
      }
    }

    res.status(200).json({
      message: "Membership plan updated successfully"
    });

  } catch (error) {
    console.error("Update plan error:", error);

    res.status(500).json({
      message: "Failed to update membership plan"
    });
  }
};

// 5. Activate or deactivate plan
const updatePlanStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["ACTIVE", "INACTIVE"].includes(status)) {
      return res.status(400).json({
        message: "Status must be ACTIVE or INACTIVE"
      });
    }

    const [result] = await pool.execute(
      `UPDATE membership_plans
       SET status = ?
       WHERE plan_id = ?`,
      [status, id]
    );

    if (result.affectedRows === 0) {
      const [existing] = await pool.execute(
        "SELECT plan_id FROM membership_plans WHERE plan_id = ?",
        [id]
      );

      if (existing.length === 0) {
        return res.status(404).json({
          message: "Membership plan not found"
        });
      }
    }

    res.status(200).json({
      message: "Plan status updated successfully",
      status
    });

  } catch (error) {
    console.error("Plan status error:", error);

    res.status(500).json({
      message: "Failed to update plan status"
    });
  }
};

module.exports = {
  createPlan,
  getAllPlans,
  getPlanById,
  updatePlan,
  updatePlanStatus
};
