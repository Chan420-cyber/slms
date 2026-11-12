
const pool = require("../config/db");

// 1. Member check-in
const checkIn = async (req, res) => {
  const connection = await pool.getConnection();
  let transactionStarted = false;

  try {
    const { member_id, seat_id } = req.body;
    const check_in_by = req.user.id || req.user.userId || null;

    if (!member_id) {
      return res.status(400).json({
        message: "Member ID is required"
      });
    }

    await connection.beginTransaction();
    transactionStarted = true;

    // Lock member row to prevent simultaneous check-ins
    const [members] = await connection.execute(
      `SELECT member_id, full_name
       FROM members
       WHERE member_id = ? AND status = 'ACTIVE'
       FOR UPDATE`,
      [member_id]
    );

    if (!members.length) {
      await connection.rollback();
      transactionStarted = false;

      return res.status(404).json({
        message: "Active member not found"
      });
    }

    // Prevent multiple open attendance sessions
    const [existingAttendance] = await connection.execute(
      `SELECT attendance_id
       FROM attendance
       WHERE member_id = ?
         AND status = 'CHECKED_IN'
       LIMIT 1`,
      [member_id]
    );

    if (existingAttendance.length) {
      await connection.rollback();
      transactionStarted = false;

      return res.status(409).json({
        message: "Member is already checked in"
      });
    }

    // Find valid membership for today
    const [memberships] = await connection.execute(
      `SELECT membership_id
       FROM memberships
       WHERE member_id = ?
         AND status = 'ACTIVE'
         AND start_date <= CURRENT_DATE()
         AND end_date >= CURRENT_DATE()
       ORDER BY end_date DESC
       LIMIT 1`,
      [member_id]
    );

    if (!memberships.length) {
      await connection.rollback();
      transactionStarted = false;

      return res.status(400).json({
        message: "Member does not have a valid membership today"
      });
    }

    const membership_id = memberships[0].membership_id;

    // Validate seat if supplied
    if (seat_id) {
      const [seats] = await connection.execute(
        `SELECT seat_id, seat_type, status
         FROM seats
         WHERE seat_id = ?
         FOR UPDATE`,
        [seat_id]
      );

      if (!seats.length) {
        await connection.rollback();
        transactionStarted = false;

        return res.status(404).json({
          message: "Seat not found"
        });
      }

      const seat = seats[0];

      if (seat.status !== "AVAILABLE") {
        await connection.rollback();
        transactionStarted = false;

        return res.status(400).json({
          message: "Seat is not available"
        });
      }

      let validSeat = false;

      if (seat.seat_type === "FIXED") {
        const [allocations] = await connection.execute(
          `SELECT allocation_id
           FROM seat_allocations
           WHERE member_id = ?
             AND seat_id = ?
             AND status = 'ACTIVE'
             AND start_date <= CURRENT_DATE()
             AND (end_date IS NULL OR end_date >= CURRENT_DATE())
           LIMIT 1`,
          [member_id, seat_id]
        );

        validSeat = allocations.length > 0;
      }

      if (seat.seat_type === "FLEXIBLE") {
        const [bookings] = await connection.execute(
          `SELECT booking_id
           FROM bookings
           WHERE member_id = ?
             AND seat_id = ?
             AND booking_date = CURRENT_DATE()
             AND start_time <= NOW()
             AND end_time > NOW()
             AND status = 'CONFIRMED'
           LIMIT 1`,
          [member_id, seat_id]
        );

        validSeat = bookings.length > 0;
      }

      if (!validSeat) {
        await connection.rollback();
        transactionStarted = false;

        return res.status(400).json({
          message: "Member does not have a valid allocation or booking for this seat"
        });
      }
    }

    // Create attendance record
    const [result] = await connection.execute(
      `INSERT INTO attendance
       (member_id, membership_id, seat_id, check_in, check_in_by, status)
       VALUES (?, ?, ?, NOW(), ?, 'CHECKED_IN')`,
      [member_id, membership_id, seat_id || null, check_in_by]
    );

    await connection.commit();
    transactionStarted = false;

    res.status(201).json({
      message: "Member checked in successfully",
      attendance_id: result.insertId,
      member_id,
      membership_id,
      seat_id: seat_id || null,
      status: "CHECKED_IN"
    });

  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    console.error("Check-in error:", error);

    res.status(500).json({
      message: "Failed to check in member",
      errorDetails: error.message
    });
  } finally {
    connection.release();
  }
};


// 2. Member check-out
const checkOut = async (req, res) => {
  try {
    const { id } = req.params;
    const check_out_by = req.user.id || req.user.userId || null;

    const [result] = await pool.execute(
      `UPDATE attendance
       SET check_out = NOW(),
           check_out_by = ?,
           status = 'CHECKED_OUT'
       WHERE attendance_id = ?
         AND status = 'CHECKED_IN'
         AND check_out IS NULL`,
      [check_out_by, id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        message: "Active attendance record not found"
      });
    }

    const [records] = await pool.execute(
      `SELECT
        attendance_id,
        member_id,
        seat_id,
        check_in,
        check_out,
        TIMESTAMPDIFF(MINUTE, check_in, check_out) AS duration_minutes,
        status
       FROM attendance
       WHERE attendance_id = ?`,
      [id]
    );

    res.status(200).json({
      message: "Member checked out successfully",
      attendance: records[0]
    });

  } catch (error) {
    console.error("Check-out error:", error);

    res.status(500).json({
      message: "Failed to check out member"
    });
  }
};


// 3. Get all attendance records
const getAllAttendance = async (req, res) => {
  try {
    const { member_id, status, date } = req.query;

    const conditions = [];
    const params = [];

    if (member_id) {
      conditions.push("a.member_id = ?");
      params.push(member_id);
    }

    if (status) {
      if (!["CHECKED_IN", "CHECKED_OUT"].includes(status)) {
        return res.status(400).json({
          message: "Invalid attendance status"
        });
      }

      conditions.push("a.status = ?");
      params.push(status);
    }

    if (date) {
      conditions.push("DATE(a.check_in) = ?");
      params.push(date);
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const [records] = await pool.execute(
      `SELECT
        a.attendance_id,
        a.member_id,
        m.full_name,
        a.membership_id,
        a.seat_id,
        s.seat_number,
        a.check_in,
        a.check_out,
        TIMESTAMPDIFF(
          MINUTE,
          a.check_in,
          COALESCE(a.check_out, NOW())
        ) AS duration_minutes,
        a.status
       FROM attendance a
       JOIN members m ON a.member_id = m.member_id
       LEFT JOIN seats s ON a.seat_id = s.seat_id
       ${whereClause}
       ORDER BY a.check_in DESC`,
      params
    );

    res.status(200).json({
      total: records.length,
      attendance: records
    });

  } catch (error) {
    console.error("Get attendance error:", error);

    res.status(500).json({
      message: "Failed to retrieve attendance"
    });
  }
};


// 4. Get attendance by ID
const getAttendanceById = async (req, res) => {
  try {
    const { id } = req.params;

    const [records] = await pool.execute(
      `SELECT
        a.*,
        m.full_name,
        s.seat_number,
        TIMESTAMPDIFF(
          MINUTE,
          a.check_in,
          COALESCE(a.check_out, NOW())
        ) AS duration_minutes
       FROM attendance a
       JOIN members m ON a.member_id = m.member_id
       LEFT JOIN seats s ON a.seat_id = s.seat_id
       WHERE a.attendance_id = ?`,
      [id]
    );

    if (!records.length) {
      return res.status(404).json({
        message: "Attendance record not found"
      });
    }

    res.status(200).json({
      attendance: records[0]
    });

  } catch (error) {
    console.error("Get attendance record error:", error);

    res.status(500).json({
      message: "Failed to retrieve attendance record"
    });
  }
};


// 5. Today's attendance summary
const getTodayAttendance = async (req, res) => {
  try {
    const [summary] = await pool.execute(
      `SELECT
        COUNT(*) AS total_check_ins,
        SUM(status = 'CHECKED_IN') AS currently_inside,
        SUM(status = 'CHECKED_OUT') AS checked_out
       FROM attendance
       WHERE DATE(check_in) = CURRENT_DATE()`
    );

    res.status(200).json({
      date: new Date().toISOString().slice(0, 10),
      summary: summary[0]
    });

  } catch (error) {
    console.error("Today's attendance error:", error);

    res.status(500).json({
      message: "Failed to retrieve today's attendance"
    });
  }
};


module.exports = {
  checkIn,
  checkOut,
  getAllAttendance,
  getAttendanceById,
  getTodayAttendance
};
