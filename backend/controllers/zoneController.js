
const pool = require("../config/db");

// 1. Create zone
const createZone = async (req, res) => {
  try {
    const { zone_name, description } = req.body;

    if (!zone_name || !zone_name.trim()) {
      return res.status(400).json({
        message: "Zone name is required"
      });
    }

    const [result] = await pool.execute(
      `INSERT INTO zones (zone_name, description)
       VALUES (?, ?)`,
      [zone_name.trim(), description || null]
    );

    res.status(201).json({
      message: "Zone created successfully",
      zone_id: result.insertId
    });

  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "A zone with this name already exists"
      });
    }

    console.error("Create zone error:", error);

    res.status(500).json({
      message: "Failed to create zone"
    });
  }
};

// 2. Get all zones
const getAllZones = async (req, res) => {
  try {
    const { status, search } = req.query;

    const conditions = [];
    const params = [];

    if (status) {
      if (!["ACTIVE", "INACTIVE"].includes(status)) {
        return res.status(400).json({
          message: "Invalid zone status"
        });
      }

      conditions.push("z.status = ?");
      params.push(status);
    }

    if (search) {
      conditions.push("z.zone_name LIKE ?");
      params.push(`%${search.trim()}%`);
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const [zones] = await pool.execute(
      `SELECT
        z.zone_id,
        z.zone_name,
        z.description,
        z.status,
        COUNT(s.seat_id) AS total_seats
       FROM zones z
       LEFT JOIN seats s ON z.zone_id = s.zone_id
       ${whereClause}
       GROUP BY
        z.zone_id,
        z.zone_name,
        z.description,
        z.status
       ORDER BY z.zone_id DESC`,
      params
    );

    res.status(200).json({
      total: zones.length,
      zones
    });

  } catch (error) {
    console.error("Get zones error:", error);

    res.status(500).json({
      message: "Failed to retrieve zones"
    });
  }
};

// 3. Get zone by ID
const getZoneById = async (req, res) => {
  try {
    const { id } = req.params;

    const [zones] = await pool.execute(
      `SELECT
        z.zone_id,
        z.zone_name,
        z.description,
        z.status,
        COUNT(s.seat_id) AS total_seats
       FROM zones z
       LEFT JOIN seats s ON z.zone_id = s.zone_id
       WHERE z.zone_id = ?
       GROUP BY
        z.zone_id,
        z.zone_name,
        z.description,
        z.status`,
      [id]
    );

    if (!zones.length) {
      return res.status(404).json({
        message: "Zone not found"
      });
    }

    res.status(200).json({
      zone: zones[0]
    });

  } catch (error) {
    console.error("Get zone error:", error);

    res.status(500).json({
      message: "Failed to retrieve zone"
    });
  }
};

// 4. Update zone
const updateZone = async (req, res) => {
  try {
    const { id } = req.params;
    const { zone_name, description } = req.body;

    const updates = [];
    const values = [];

    if (Object.hasOwn(req.body, "zone_name")) {
      if (
        typeof zone_name !== "string" ||
        !zone_name.trim()
      ) {
        return res.status(400).json({
          message: "Zone name cannot be empty"
        });
      }

      updates.push("zone_name = ?");
      values.push(zone_name.trim());
    }

    if (Object.hasOwn(req.body, "description")) {
      updates.push("description = ?");
      values.push(description || null);
    }

    if (!updates.length) {
      return res.status(400).json({
        message: "No valid fields provided"
      });
    }

    const [result] = await pool.execute(
      `UPDATE zones
       SET ${updates.join(", ")}
       WHERE zone_id = ?`,
      [...values, id]
    );

    if (result.affectedRows === 0) {
      const [existing] = await pool.execute(
        "SELECT zone_id FROM zones WHERE zone_id = ?",
        [id]
      );

      if (!existing.length) {
        return res.status(404).json({
          message: "Zone not found"
        });
      }
    }

    res.status(200).json({
      message: "Zone updated successfully"
    });

  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "A zone with this name already exists"
      });
    }

    console.error("Update zone error:", error);

    res.status(500).json({
      message: "Failed to update zone"
    });
  }
};

// 5. Change zone status
const updateZoneStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["ACTIVE", "INACTIVE"].includes(status)) {
      return res.status(400).json({
        message: "Status must be ACTIVE or INACTIVE"
      });
    }

    const [result] = await pool.execute(
      `UPDATE zones
       SET status = ?
       WHERE zone_id = ?`,
      [status, id]
    );

    if (result.affectedRows === 0) {
      const [existing] = await pool.execute(
        "SELECT zone_id FROM zones WHERE zone_id = ?",
        [id]
      );

      if (!existing.length) {
        return res.status(404).json({
          message: "Zone not found"
        });
      }
    }

    res.status(200).json({
      message: "Zone status updated successfully",
      status
    });

  } catch (error) {
    console.error("Zone status error:", error);

    res.status(500).json({
      message: "Failed to update zone status"
    });
  }
};

module.exports = {
  createZone,
  getAllZones,
  getZoneById,
  updateZone,
  updateZoneStatus
};
