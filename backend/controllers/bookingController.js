const pool = require("../config/db");

// 1. Create a flexible seat booking
const createBooking = async (req, res) => {
  const connection = await pool.getConnection();
  let transactionStarted = false;

  try {
    const { member_id, seat_id, booking_date, start_time, end_time } = req.body;
    
    // Fix for undefined booked_by
    const booked_by = req.user.id || req.user.userId || null;

    if (!member_id || !seat_id || !booking_date || !start_time || !end_time) {
      return res.status(400).json({
        message: "Member, seat, booking date, start time and end time are required"
      });
    }

    // Normalize times to YYYY-MM-DD HH:MM:SS
    const normalizedStart = String(start_time).replace("T", " ").slice(0, 19);
    const normalizedEnd = String(end_time).replace("T", " ").slice(0, 19);
    const requestedDate = String(booking_date).slice(0, 10);

    const dateTimePattern = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

    if (
      !dateTimePattern.test(normalizedStart) ||
      !dateTimePattern.test(normalizedEnd) ||
      normalizedEnd <= normalizedStart
    ) {
      return res.status(400).json({
        message: "Invalid date-time values. End time must be after start time"
      });
    }

    if (
      normalizedStart.slice(0, 10) !== requestedDate ||
      normalizedEnd.slice(0, 10) !== requestedDate
    ) {
      return res.status(400).json({
        message: "Booking date must match the date in start and end times"
      });
    }

    await connection.beginTransaction();
    transactionStarted = true;

    // Lock the seat to prevent simultaneous overlapping bookings
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
      return res.status(404).json({ message: "Seat not found" });
    }

    const seat = seats[0];

    if (seat.seat_type !== "FLEXIBLE") {
      await connection.rollback();
      transactionStarted = false;
      return res.status(400).json({
        message: "Only FLEXIBLE seats can be booked"
      });
    }

    if (seat.status !== "AVAILABLE") {
      await connection.rollback();
      transactionStarted = false;
      return res.status(400).json({
        message: "This seat is not currently available"
      });
    }

    // Check that the member is active
    const [members] = await connection.execute(
      `SELECT member_id
       FROM members
       WHERE member_id = ? AND status = 'ACTIVE'`,
      [member_id]
    );

    if (!members.length) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(404).json({
        message: "Active member not found"
      });
    }

    // Check active membership on the booking date
    const [memberships] = await connection.execute(
      `SELECT membership_id
       FROM memberships
       WHERE member_id = ?
         AND status = 'ACTIVE'
         AND start_date <= ?
         AND end_date >= ?
       LIMIT 1`,
      [member_id, requestedDate, requestedDate]
    );

    if (!memberships.length) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(400).json({
        message: "Member does not have an active membership on this date"
      });
    }

    // Check for overlapping confirmed bookings
    // Use normalizedStart and normalizedEnd here!
    const [conflicts] = await connection.execute(
      `SELECT booking_id
       FROM bookings
       WHERE seat_id = ?
         AND status = 'CONFIRMED'
         AND start_time < ?
         AND end_time > ?
       LIMIT 1`,
      [seat_id, normalizedEnd, normalizedStart]
    );

    if (conflicts.length) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(409).json({
        message: "This seat is already booked during that time"
      });
    }

    // Insert using normalizedStart and normalizedEnd
    const [result] = await connection.execute(
      `INSERT INTO bookings
       (member_id, seat_id, booking_date, start_time, end_time, booked_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        member_id,
        seat_id,
        requestedDate,
        normalizedStart,
        normalizedEnd,
        booked_by
      ]
    );

    await connection.commit();
    transactionStarted = false;

    res.status(201).json({
      message: "Seat booked successfully",
      booking_id: result.insertId,
      member_id,
      seat_id,
      booking_date: requestedDate,
      start_time: normalizedStart,
      end_time: normalizedEnd,
      status: "CONFIRMED"
    });

  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    console.error("Create booking error:", error);

    res.status(500).json({
      message: "Failed to create booking",
      errorDetails: error.message // Added this so you can debug easily!
    });
  } finally {
    connection.release();
  }
};

// 2. Get all bookings with optional filters
const getAllBookings = async (req, res) => {
  try {
    const { status, member_id, seat_id, booking_date } = req.query;

    const conditions = [];
    const params = [];

    if (status) {
      const allowedStatuses = ["CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid booking status" });
      }

      conditions.push("b.status = ?");
      params.push(status);
    }

    if (member_id) {
      conditions.push("b.member_id = ?");
      params.push(member_id);
    }

    if (seat_id) {
      conditions.push("b.seat_id = ?");
      params.push(seat_id);
    }

    if (booking_date) {
      conditions.push("b.booking_date = ?");
      params.push(booking_date);
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const [bookings] = await pool.execute(
      `SELECT
        b.booking_id,
        b.member_id,
        m.full_name,
        b.seat_id,
        s.seat_number,
        z.zone_name,
        b.booking_date,
        b.start_time,
        b.end_time,
        b.status,
        b.booked_by,
        b.created_at
       FROM bookings b
       JOIN members m ON b.member_id = m.member_id
       JOIN seats s ON b.seat_id = s.seat_id
       JOIN zones z ON s.zone_id = z.zone_id
       ${whereClause}
       ORDER BY b.booking_date DESC, b.start_time ASC`,
      params
    );

    res.status(200).json({
      total: bookings.length,
      bookings
    });

  } catch (error) {
    console.error("Get bookings error:", error);
    res.status(500).json({ message: "Failed to retrieve bookings" });
  }
};

// 3. Get one booking
const getBookingById = async (req, res) => {
  try {
    const { id } = req.params;

    const [bookings] = await pool.execute(
      `SELECT
        b.*,
        m.full_name,
        s.seat_number,
        z.zone_name
       FROM bookings b
       JOIN members m ON b.member_id = m.member_id
       JOIN seats s ON b.seat_id = s.seat_id
       JOIN zones z ON s.zone_id = z.zone_id
       WHERE b.booking_id = ?`,
      [id]
    );

    if (!bookings.length) {
      return res.status(404).json({ message: "Booking not found" });
    }

    res.status(200).json({ booking: bookings[0] });

  } catch (error) {
    console.error("Get booking error:", error);
    res.status(500).json({ message: "Failed to retrieve booking" });
  }
};

// 4. Cancel a booking
const cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.execute(
      `UPDATE bookings
       SET status = 'CANCELLED'
       WHERE booking_id = ?
         AND status = 'CONFIRMED'`,
      [id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: "Confirmed booking not found" });
    }

    res.status(200).json({ message: "Booking cancelled successfully" });

  } catch (error) {
    console.error("Cancel booking error:", error);
    res.status(500).json({ message: "Failed to cancel booking" });
  }
};

// 5. Update booking status
const updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = ["COMPLETED", "NO_SHOW"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Status must be COMPLETED or NO_SHOW" });
    }

    const [result] = await pool.execute(
      `UPDATE bookings
       SET status = ?
       WHERE booking_id = ?
         AND status = 'CONFIRMED'`,
      [status, id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: "Confirmed booking not found" });
    }

    res.status(200).json({
      message: `Booking marked as ${status}`,
      booking_id: id,
      status
    });

  } catch (error) {
    console.error("Update booking status error:", error);
    res.status(500).json({ message: "Failed to update booking status" });
  }
};

module.exports = {
  createBooking,
  getAllBookings,
  getBookingById,
  cancelBooking,
  updateBookingStatus
};