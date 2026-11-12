
const pool = require("../config/db");

// 1. Create a seat
const createSeat = async (req, res) => {
  try {
    const { zone_id, seat_number, seat_type } = req.body;

    if (!zone_id || !seat_number || !seat_type) {
      return res.status(400).json({
        message: "Zone ID, seat number and seat type are required"
      });
    }

    if (!["FIXED", "FLEXIBLE"].includes(seat_type)) {
      return res.status(400).json({
        message: "Seat type must be FIXED or FLEXIBLE"
      });
    }

    const [zones] = await pool.execute(
      `SELECT zone_id
       FROM zones
       WHERE zone_id = ? AND status = 'ACTIVE'`,
      [zone_id]
    );

    if (!zones.length) {
      return res.status(404).json({
        message: "Active zone not found"
      });
    }

    const [result] = await pool.execute(
      `INSERT INTO seats (zone_id, seat_number, seat_type)
       VALUES (?, ?, ?)`,
      [zone_id, seat_number.trim(), seat_type]
    );

    res.status(201).json({
      message: "Seat created successfully",
      seat: {
        seat_id: result.insertId,
        zone_id,
        seat_number: seat_number.trim(),
        seat_type,
        status: "AVAILABLE"
      }
    });

  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "This seat number already exists in this zone"
      });
    }

    console.error("Create seat error:", error);

    res.status(500).json({
      message: "Failed to create seat"
    });
  }
};

// 2. Get all seats with optional filters
const getAllSeats = async (req, res) => {
  try {
    const { zone_id, seat_type, status, search } = req.query;

    const conditions = [];
    const params = [];

    if (zone_id) {
      conditions.push("s.zone_id = ?");
      params.push(zone_id);
    }

    if (seat_type) {
      if (!["FIXED", "FLEXIBLE"].includes(seat_type)) {
        return res.status(400).json({
          message: "Invalid seat type"
        });
      }

      conditions.push("s.seat_type = ?");
      params.push(seat_type);
    }

    if (status) {
      const allowedStatuses = [
        "AVAILABLE",
        "MAINTENANCE",
        "INACTIVE"
      ];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          message: "Invalid seat status"
        });
      }

      conditions.push("s.status = ?");
      params.push(status);
    }

    if (search) {
      conditions.push("s.seat_number LIKE ?");
      params.push(`%${search.trim()}%`);
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const [seats] = await pool.execute(
      `SELECT
        s.seat_id,
        s.zone_id,
        z.zone_name,
        s.seat_number,
        s.seat_type,
        s.status,
        s.created_at
       FROM seats s
       JOIN zones z ON s.zone_id = z.zone_id
       ${whereClause}
       ORDER BY z.zone_name, s.seat_number`,
      params
    );

    res.status(200).json({
      total: seats.length,
      seats
    });

  } catch (error) {
    console.error("Get seats error:", error);

    res.status(500).json({
      message: "Failed to retrieve seats"
    });
  }
};

// 3. Get seat by ID
const getSeatById = async (req, res) => {
  try {
    const { id } = req.params;

    const [seats] = await pool.execute(
      `SELECT
        s.*,
        z.zone_name
       FROM seats s
       JOIN zones z ON s.zone_id = z.zone_id
       WHERE s.seat_id = ?`,
      [id]
    );

    if (!seats.length) {
      return res.status(404).json({
        message: "Seat not found"
      });
    }

    res.status(200).json({
      seat: seats[0]
    });

  } catch (error) {
    console.error("Get seat error:", error);

    res.status(500).json({
      message: "Failed to retrieve seat"
    });
  }
};

// 4. Update seat information
const updateSeat = async (req, res) => {
  try {
    const { id } = req.params;
    const { zone_id, seat_number, seat_type } = req.body;

    const updates = [];
    const values = [];

    if (Object.hasOwn(req.body, "zone_id")) {
      if (!zone_id) {
        return res.status(400).json({
          message: "Zone ID is required"
        });
      }

      const [zones] = await pool.execute(
        `SELECT zone_id FROM zones
         WHERE zone_id = ? AND status = 'ACTIVE'`,
        [zone_id]
      );

      if (!zones.length) {
        return res.status(404).json({
          message: "Active zone not found"
        });
      }

      updates.push("zone_id = ?");
      values.push(zone_id);
    }

    if (Object.hasOwn(req.body, "seat_number")) {
      if (
        typeof seat_number !== "string" ||
        !seat_number.trim()
      ) {
        return res.status(400).json({
          message: "Seat number cannot be empty"
        });
      }

      updates.push("seat_number = ?");
      values.push(seat_number.trim());
    }

    if (Object.hasOwn(req.body, "seat_type")) {
      if (!["FIXED", "FLEXIBLE"].includes(seat_type)) {
        return res.status(400).json({
          message: "Invalid seat type"
        });
      }

      updates.push("seat_type = ?");
      values.push(seat_type);
    }

    if (!updates.length) {
      return res.status(400).json({
        message: "No valid fields provided"
      });
    }

    const [result] = await pool.execute(
      `UPDATE seats
       SET ${updates.join(", ")}
       WHERE seat_id = ?`,
      [...values, id]
    );

    if (result.affectedRows === 0) {
      const [existing] = await pool.execute(
        "SELECT seat_id FROM seats WHERE seat_id = ?",
        [id]
      );

      if (!existing.length) {
        return res.status(404).json({
          message: "Seat not found"
        });
      }
    }

    res.status(200).json({
      message: "Seat updated successfully"
    });

  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "This seat number already exists in this zone"
      });
    }

    console.error("Update seat error:", error);

    res.status(500).json({
      message: "Failed to update seat"
    });
  }
};

// 5. Update seat status
const updateSeatStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = [
      "AVAILABLE",
      "MAINTENANCE",
      "INACTIVE"
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid seat status"
      });
    }

    const [result] = await pool.execute(
      `UPDATE seats
       SET status = ?
       WHERE seat_id = ?`,
      [status, id]
    );

    if (result.affectedRows === 0) {
      const [existing] = await pool.execute(
        "SELECT seat_id FROM seats WHERE seat_id = ?",
        [id]
      );

      if (!existing.length) {
        return res.status(404).json({
          message: "Seat not found"
        });
      }
    }

    res.status(200).json({
      message: "Seat status updated successfully",
      status
    });

  } catch (error) {
    console.error("Seat status error:", error);

    res.status(500).json({
      message: "Failed to update seat status"
    });
  }
};

module.exports = {
  createSeat,
  getAllSeats,
  getSeatById,
  updateSeat,
  updateSeatStatus
};
