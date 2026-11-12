const pool = require("../config/db");

// 1. Assign a fixed seat
const createAllocation = async (req, res) => {
  // 1. Destructure and validate BEFORE getting a connection
  const { member_id, seat_id, start_date, end_date } = req.body;
  // const assigned_by = req.user.id;
  const assigned_by = req.user.id || req.user.userId || null;

  if (!member_id || !seat_id || !start_date) {
    return res.status(400).json({
      message: "Member ID, seat ID and start date are required"
    });
  }

  if (end_date && end_date < start_date) {
    return res.status(400).json({
      message: "End date cannot be before start date"
    });
  }

  // 2. Only get a connection when we are ready for database work
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Lock the seat so concurrent assignments cannot pass together
    const [seats] = await connection.execute(
      `SELECT seat_id, seat_type, status
       FROM seats
       WHERE seat_id = ?
       FOR UPDATE`,
      [seat_id]
    );

    if (!seats.length) {
      await connection.rollback();
      return res.status(404).json({ message: "Seat not found" });
    }

    const seat = seats[0];

    if (seat.seat_type !== "FIXED") {
      await connection.rollback();
      return res.status(400).json({
        message: "Only FIXED seats can be allocated"
      });
    }

    if (seat.status !== "AVAILABLE") {
      await connection.rollback();
      return res.status(400).json({
        message: "This seat is not available for allocation"
      });
    }

    // Check member
    const [members] = await connection.execute(
      `SELECT member_id
       FROM members
       WHERE member_id = ? AND status = 'ACTIVE'`,
      [member_id]
    );

    if (!members.length) {
      await connection.rollback();
      return res.status(404).json({
        message: "Active member not found"
      });
    }

    // Check for an active membership covering the allocation period
    const membershipEnd = end_date || start_date;

    const [memberships] = await connection.execute(
      `SELECT membership_id
       FROM memberships
       WHERE member_id = ?
         AND status = 'ACTIVE'
         AND start_date <= ?
         AND end_date >= ?
       LIMIT 1`,
      [member_id, start_date, membershipEnd]
    );

    if (!memberships.length) {
      await connection.rollback();
      return res.status(400).json({
        message: "Member does not have an active membership covering this period"
      });
    }

    // Check whether this seat is already allocated during the requested period
    const [seatConflicts] = await connection.execute(
      `SELECT allocation_id
       FROM seat_allocations
       WHERE seat_id = ?
         AND status = 'ACTIVE'
         AND start_date <= ?
         AND (end_date IS NULL OR end_date >= ?)
       LIMIT 1`,
      [seat_id, end_date || "9999-12-31", start_date]
    );

    if (seatConflicts.length) {
      await connection.rollback();
      return res.status(409).json({
        message: "This seat is already allocated during the requested period"
      });
    }

    // Check whether member already has another fixed seat during this period
    const [memberConflicts] = await connection.execute(
      `SELECT allocation_id
       FROM seat_allocations
       WHERE member_id = ?
         AND status = 'ACTIVE'
         AND start_date <= ?
         AND (end_date IS NULL OR end_date >= ?)
       LIMIT 1`,
      [member_id, end_date || "9999-12-31", start_date]
    );

    if (memberConflicts.length) {
      await connection.rollback();
      return res.status(409).json({
        message: "Member already has an active seat allocation during this period"
      });
    }

    const [result] = await connection.execute(
      `INSERT INTO seat_allocations
       (member_id, seat_id, start_date, end_date, assigned_by)
       VALUES (?, ?, ?, ?, ?)`,
      [member_id, seat_id, start_date, end_date || null, assigned_by]
    );

    await connection.commit();

    res.status(201).json({
      message: "Fixed seat allocated successfully",
      allocation_id: result.insertId,
      member_id,
      seat_id,
      start_date,
      end_date: end_date || null,
      status: "ACTIVE"
    });

  } catch (error) {
    // 3. Only rollback if the connection actually exists
    if (connection) {
      await connection.rollback();
    }
    console.error("Create allocation error:", error);

    res.status(500).json({
      message: "Failed to allocate seat"
    });
  } finally {
    // 4. Always release the connection back to the pool
    if (connection) {
      connection.release();
    }
  }
};

// 2. Get all allocations
const getAllAllocations = async (req, res) => {
  try {
    const { status, member_id, seat_id } = req.query;

    const conditions = [];
    const params = [];

    if (status) {
      if (!["ACTIVE", "ENDED", "CANCELLED"].includes(status)) {
        return res.status(400).json({
          message: "Invalid allocation status"
        });
      }
      conditions.push("a.status = ?");
      params.push(status);
    }

    if (member_id) {
      conditions.push("a.member_id = ?");
      params.push(member_id);
    }

    if (seat_id) {
      conditions.push("a.seat_id = ?");
      params.push(seat_id);
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const [allocations] = await pool.execute(
      `SELECT
        a.allocation_id,
        a.member_id,
        m.full_name,
        a.seat_id,
        s.seat_number,
        z.zone_name,
        a.start_date,
        a.end_date,
        a.status,
        a.assigned_by,
        a.created_at
       FROM seat_allocations a
       JOIN members m ON a.member_id = m.member_id
       JOIN seats s ON a.seat_id = s.seat_id
       JOIN zones z ON s.zone_id = z.zone_id
       ${whereClause}
       ORDER BY a.allocation_id DESC`,
      params
    );

    res.status(200).json({
      total: allocations.length,
      allocations
    });

  } catch (error) {
    console.error("Get allocations error:", error);

    res.status(500).json({
      message: "Failed to retrieve allocations"
    });
  }
};

// 3. Get allocation by ID
const getAllocationById = async (req, res) => {
  try {
    const { id } = req.params;

    const [allocations] = await pool.execute(
      `SELECT
        a.*,
        m.full_name,
        s.seat_number,
        z.zone_name
       FROM seat_allocations a
       JOIN members m ON a.member_id = m.member_id
       JOIN seats s ON a.seat_id = s.seat_id
       JOIN zones z ON s.zone_id = z.zone_id
       WHERE a.allocation_id = ?`,
      [id]
    );

    if (!allocations.length) {
      return res.status(404).json({
        message: "Allocation not found"
      });
    }

    res.status(200).json({
      allocation: allocations[0]
    });

  } catch (error) {
    console.error("Get allocation error:", error);

    res.status(500).json({
      message: "Failed to retrieve allocation"
    });
  }
};

// 4. End an allocation
const endAllocation = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.execute(
      `UPDATE seat_allocations
       SET status = 'ENDED',
           end_date = LEAST(COALESCE(end_date, CURRENT_DATE), CURRENT_DATE)
       WHERE allocation_id = ?
         AND status = 'ACTIVE'`,
      [id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        message: "Active allocation not found"
      });
    }

    res.status(200).json({
      message: "Seat allocation ended successfully"
    });

  } catch (error) {
    console.error("End allocation error:", error);

    res.status(500).json({
      message: "Failed to end allocation"
    });
  }
};

// 5. Cancel an allocation
const cancelAllocation = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.execute(
      `UPDATE seat_allocations
       SET status = 'CANCELLED'
       WHERE allocation_id = ?
         AND status = 'ACTIVE'`,
      [id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        message: "Active allocation not found"
      });
    }

    res.status(200).json({
      message: "Seat allocation cancelled successfully"
    });

  } catch (error) {
    console.error("Cancel allocation error:", error);

    res.status(500).json({
      message: "Failed to cancel allocation"
    });
  }
};

module.exports = {
  createAllocation,
  getAllAllocations,
  getAllocationById,
  endAllocation,
  cancelAllocation
};