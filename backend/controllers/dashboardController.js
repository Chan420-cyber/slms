
const pool = require("../config/db");

const getDashboardOverview = async (req, res) => {
  try {
    // 1. Member statistics
    const [memberStats] = await pool.execute(`
      SELECT
        COUNT(*) AS total_members,
        SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END)
          AS active_members,
        SUM(CASE WHEN status = 'INACTIVE' THEN 1 ELSE 0 END)
          AS inactive_members,
        SUM(CASE WHEN status = 'SUSPENDED' THEN 1 ELSE 0 END)
          AS suspended_members
      FROM members
    `);

    // 2. Membership statistics
    const [membershipStats] = await pool.execute(`
      SELECT
        COUNT(*) AS total_memberships,
        SUM(
          CASE
            WHEN status = 'ACTIVE'
              AND CURDATE() BETWEEN start_date AND end_date
            THEN 1 ELSE 0
          END
        ) AS active_memberships,
        SUM(
          CASE
            WHEN status = 'EXPIRED' OR
              (status = 'ACTIVE' AND end_date < CURDATE())
            THEN 1 ELSE 0
          END
        ) AS expired_memberships
      FROM memberships
    `);

    // 3. Attendance statistics
    const [attendanceStats] = await pool.execute(`
      SELECT
        COUNT(
          CASE WHEN DATE(check_in) = CURDATE()
          THEN 1 END
        ) AS today_check_ins,
        COUNT(
          CASE WHEN status = 'CHECKED_IN'
          THEN 1 END
        ) AS currently_checked_in
      FROM attendance
    `);

    // 4. Seat statistics
    const [seatStats] = await pool.execute(`
      SELECT
        COUNT(*) AS total_seats,
        SUM(CASE WHEN status = 'AVAILABLE'
          THEN 1 ELSE 0 END) AS available_seats,
        SUM(CASE WHEN status = 'MAINTENANCE'
          THEN 1 ELSE 0 END) AS maintenance_seats,
        SUM(CASE WHEN status = 'INACTIVE'
          THEN 1 ELSE 0 END) AS inactive_seats
      FROM seats
    `);

    // 5. Currently occupied seats
    const [occupiedStats] = await pool.execute(`
      SELECT COUNT(DISTINCT seat_id) AS occupied_seats
      FROM attendance
      WHERE status = 'CHECKED_IN'
        AND seat_id IS NOT NULL
    `);

    // 6. Today's revenue
    const [todayRevenue] = await pool.execute(`
      SELECT
        COALESCE(SUM(
          CASE WHEN payment_status = 'SUCCESS'
          THEN amount ELSE 0 END
        ), 0) AS revenue,
        COALESCE(SUM(
          CASE WHEN payment_status = 'PENDING'
          THEN amount ELSE 0 END
        ), 0) AS pending_payments
      FROM payments
      WHERE DATE(paid_at) = CURDATE()
    `);

    // 7. Monthly revenue
    const [monthlyRevenue] = await pool.execute(`
      SELECT
        COALESCE(SUM(
          CASE WHEN payment_status = 'SUCCESS'
          THEN amount ELSE 0 END
        ), 0) AS revenue
      FROM payments
      WHERE YEAR(paid_at) = YEAR(CURDATE())
        AND MONTH(paid_at) = MONTH(CURDATE())
    `);

    // 8. Today's expenses
    const [todayExpenses] = await pool.execute(`
      SELECT COALESCE(SUM(amount), 0) AS expenses
      FROM expenses
      WHERE expense_date = CURDATE()
    `);

    // 9. Monthly expenses
    const [monthlyExpenses] = await pool.execute(`
      SELECT COALESCE(SUM(amount), 0) AS expenses
      FROM expenses
      WHERE YEAR(expense_date) = YEAR(CURDATE())
        AND MONTH(expense_date) = MONTH(CURDATE())
    `);

    // Convert database numeric values into JavaScript numbers
    const members = memberStats[0];
    const memberships = membershipStats[0];
    const attendance = attendanceStats[0];
    const seats = seatStats[0];

    const todayIncome = Number(todayRevenue[0].revenue);
    const todayExpense = Number(todayExpenses[0].expenses);

    const monthlyIncome = Number(monthlyRevenue[0].revenue);
    const monthlyExpense = Number(monthlyExpenses[0].expenses);

    res.status(200).json({
      success: true,
      dashboard: {
        members: {
          total: Number(members.total_members),
          active: Number(members.active_members),
          inactive: Number(members.inactive_members),
          suspended: Number(members.suspended_members)
        },

        memberships: {
          total: Number(memberships.total_memberships),
          active: Number(memberships.active_memberships),
          expired: Number(memberships.expired_memberships)
        },

        attendance: {
          today_check_ins: Number(attendance.today_check_ins),
          currently_checked_in:
            Number(attendance.currently_checked_in)
        },

        seats: {
          total: Number(seats.total_seats),
          available: Number(seats.available_seats),
          occupied: Number(occupiedStats[0].occupied_seats),
          maintenance: Number(seats.maintenance_seats),
          inactive: Number(seats.inactive_seats)
        },

        finances: {
          today_revenue: todayIncome,
          today_expenses: todayExpense,
          today_net_income: todayIncome - todayExpense,

          monthly_revenue: monthlyIncome,
          monthly_expenses: monthlyExpense,
          monthly_net_income: monthlyIncome - monthlyExpense,

          pending_payments:
            Number(todayRevenue[0].pending_payments)
        }
      }
    });

  } catch (error) {
    console.error("Dashboard overview error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load dashboard overview"
    });
  }
};

const getRecentActivity = async (req, res) => {
  try {
    const [activities] = await pool.execute(`
      SELECT *
      FROM (
        -- Member check-ins
        SELECT
          m.full_name AS member,
          'Checked in' AS activity,
          a.check_in AS activity_time,
          'Active' AS status
        FROM attendance a
        JOIN members m ON a.member_id = m.member_id
        WHERE a.check_in IS NOT NULL

        UNION ALL

        -- Member check-outs
        SELECT
          m.full_name AS member,
          'Checked out' AS activity,
          a.check_out AS activity_time,
          'Completed' AS status
        FROM attendance a
        JOIN members m ON a.member_id = m.member_id
        WHERE a.check_out IS NOT NULL

        UNION ALL

        -- Payments
        SELECT
          m.full_name AS member,
          'Payment recorded' AS activity,
          p.paid_at AS activity_time,
          CASE
            WHEN p.payment_status = 'SUCCESS' THEN 'Completed'
            WHEN p.payment_status = 'PENDING' THEN 'Pending'
            WHEN p.payment_status = 'FAILED' THEN 'Failed'
            ELSE p.payment_status
          END AS status
        FROM payments p
        JOIN members m ON p.member_id = m.member_id
        WHERE p.paid_at IS NOT NULL

      ) AS recent_activities
      ORDER BY activity_time DESC
      LIMIT 10
    `);

    res.status(200).json({
      success: true,
      count: activities.length,
      activities
    });

  } catch (error) {
    console.error("Recent activity error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load recent activity"
    });
  }
};

module.exports = {
  getDashboardOverview,
  getRecentActivity
};
