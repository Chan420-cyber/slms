
const pool = require("../config/db");

// Add days to a YYYY-MM-DD date without timezone issues
const addDays = (dateString, days) => {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
};

// Update subscription statuses based on dates
const syncMembershipStatuses = async () => {
  await pool.execute(`
    UPDATE memberships
    SET status = 'EXPIRED'
    WHERE status = 'ACTIVE'
      AND end_date < CURRENT_DATE()
  `);

  await pool.execute(`
    UPDATE memberships
    SET status = 'ACTIVE'
    WHERE status = 'PENDING'
      AND start_date <= CURRENT_DATE()
      AND end_date >= CURRENT_DATE()
  `);
};

// 1. Assign a plan to a member
const createMembership = async (req, res) => {
  try {
    const { member_id, plan_id, start_date } = req.body;

    if (!member_id || !plan_id) {
      return res.status(400).json({
        message: "Member ID and plan ID are required"
      });
    }

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Lock member row to prevent simultaneous overlapping assignments
      const [members] = await connection.execute(
        `SELECT member_id, status
         FROM members
         WHERE member_id = ?
         FOR UPDATE`,
        [member_id]
      );

      if (!members.length) {
        await connection.rollback();
        return res.status(404).json({
          message: "Member not found"
        });
      }

      if (members[0].status !== "ACTIVE") {
        await connection.rollback();
        return res.status(400).json({
          message: "Cannot assign membership to an inactive or suspended member"
        });
      }

      const [plans] = await connection.execute(
        `SELECT plan_id, plan_name, duration_days, price
         FROM membership_plans
         WHERE plan_id = ? AND status = 'ACTIVE'`,
        [plan_id]
      );

      if (!plans.length) {
        await connection.rollback();
        return res.status(404).json({
          message: "Active membership plan not found"
        });
      }

      const plan = plans[0];

      const startDate = start_date ||
        new Date().toISOString().slice(0, 10);

      if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
        await connection.rollback();
        return res.status(400).json({
          message: "Start date must use YYYY-MM-DD format"
        });
      }

      const parsedStart = new Date(`${startDate}T00:00:00Z`);

      if (
        Number.isNaN(parsedStart.getTime()) ||
        parsedStart.toISOString().slice(0, 10) !== startDate
      ) {
        await connection.rollback();
        return res.status(400).json({
          message: "Invalid start date"
        });
      }

      const endDate = addDays(
        startDate,
        Number(plan.duration_days) - 1
      );

      // Prevent overlapping active or scheduled memberships
      const [overlaps] = await connection.execute(
        `SELECT membership_id
         FROM memberships
         WHERE member_id = ?
           AND status IN ('ACTIVE', 'PENDING')
           AND start_date <= ?
           AND end_date >= ?
         LIMIT 1`,
        [member_id, endDate, startDate]
      );

      if (overlaps.length) {
        await connection.rollback();
        return res.status(409).json({
          message: "Member already has a membership covering these dates. Use the renewal operation instead."
        });
      }

      const today = new Date().toISOString().slice(0, 10);
      const status = startDate > today ? "PENDING" : "ACTIVE";

      const [result] = await connection.execute(
        `INSERT INTO memberships
        (
          member_id,
          plan_id,
          start_date,
          end_date,
          status,
          plan_name_snapshot,
          duration_days_snapshot,
          price_snapshot
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          member_id,
          plan_id,
          startDate,
          endDate,
          status,
          plan.plan_name,
          plan.duration_days,
          plan.price
        ]
      );

      await connection.commit();

      res.status(201).json({
        message: "Membership assigned successfully",
        membership: {
          membership_id: result.insertId,
          member_id,
          plan_id,
          plan_name: plan.plan_name,
          duration_days: plan.duration_days,
          price: plan.price,
          start_date: startDate,
          end_date: endDate,
          status
        }
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error("Create membership error:", error);

    res.status(500).json({
      message: "Failed to assign membership"
    });
  }
};

// 2. Get all memberships
const getAllMemberships = async (req, res) => {
  try {
    await syncMembershipStatuses();

    const { status, member_id } = req.query;

    const conditions = [];
    const params = [];

    if (status) {
      const allowed = ["ACTIVE", "EXPIRED", "CANCELLED", "PENDING"];

      if (!allowed.includes(status)) {
        return res.status(400).json({
          message: "Invalid membership status"
        });
      }

      conditions.push("ms.status = ?");
      params.push(status);
    }

    if (member_id) {
      conditions.push("ms.member_id = ?");
      params.push(member_id);
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const [memberships] = await pool.execute(
      `SELECT
        ms.*,
        m.full_name,
        m.member_code,
        mp.plan_name AS current_plan_name
       FROM memberships ms
       JOIN members m ON ms.member_id = m.member_id
       JOIN membership_plans mp ON ms.plan_id = mp.plan_id
       ${whereClause}
       ORDER BY ms.created_at DESC`,
      params
    );

    res.status(200).json({
      total: memberships.length,
      memberships
    });

  } catch (error) {
    console.error("Get memberships error:", error);

    res.status(500).json({
      message: "Failed to retrieve memberships"
    });
  }
};

// 3. Get membership by ID
const getMembershipById = async (req, res) => {
  try {
    await syncMembershipStatuses();

    const { id } = req.params;

    const [memberships] = await pool.execute(
      `SELECT
        ms.*,
        m.full_name,
        m.member_code,
        mp.plan_name AS current_plan_name
       FROM memberships ms
       JOIN members m ON ms.member_id = m.member_id
       JOIN membership_plans mp ON ms.plan_id = mp.plan_id
       WHERE ms.membership_id = ?`,
      [id]
    );

    if (!memberships.length) {
      return res.status(404).json({
        message: "Membership not found"
      });
    }

    res.status(200).json({
      membership: memberships[0]
    });

  } catch (error) {
    console.error("Get membership error:", error);

    res.status(500).json({
      message: "Failed to retrieve membership"
    });
  }
};

// 4. Renew membership
// Creates a NEW record so the old subscription remains in history.
const renewMembership = async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [currentRows] = await connection.execute(
        `SELECT *
         FROM memberships
         WHERE membership_id = ?`,
        [id]
      );

      if (!currentRows.length) {
        await connection.rollback();
        return res.status(404).json({
          message: "Membership not found"
        });
      }

      const current = currentRows[0];

      if (current.status === "CANCELLED") {
        await connection.rollback();
        return res.status(400).json({
          message: "Cancelled memberships cannot be renewed"
        });
      }

      // Lock the member record while calculating the renewal dates
      await connection.execute(
        `SELECT member_id FROM members
         WHERE member_id = ? FOR UPDATE`,
        [current.member_id]
      );

      const [plans] = await connection.execute(
        `SELECT plan_id, plan_name, duration_days, price
         FROM membership_plans
         WHERE plan_id = ? AND status = 'ACTIVE'`,
        [req.body.plan_id || current.plan_id]
      );

      if (!plans.length) {
        await connection.rollback();
        return res.status(404).json({
          message: "Active renewal plan not found"
        });
      }

      const plan = plans[0];

      const [latestRows] = await connection.execute(
        `SELECT MAX(end_date) AS latest_end_date
         FROM memberships
         WHERE member_id = ?
           AND status != 'CANCELLED'`,
        [current.member_id]
      );

      const today = new Date().toISOString().slice(0, 10);
      const latestEnd = latestRows[0].latest_end_date;

      const nextStart = latestEnd && latestEnd >= today
        ? addDays(
            typeof latestEnd === "string"
              ? latestEnd.slice(0, 10)
              : new Date(latestEnd).toISOString().slice(0, 10),
            1
          )
        : today;

      const nextEnd = addDays(
        nextStart,
        Number(plan.duration_days) - 1
      );

      const status = nextStart > today ? "PENDING" : "ACTIVE";

      const [result] = await connection.execute(
        `INSERT INTO memberships
        (
          member_id,
          plan_id,
          start_date,
          end_date,
          status,
          plan_name_snapshot,
          duration_days_snapshot,
          price_snapshot
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          current.member_id,
          plan.plan_id,
          nextStart,
          nextEnd,
          status,
          plan.plan_name,
          plan.duration_days,
          plan.price
        ]
      );

      await connection.commit();

      res.status(201).json({
        message: "Membership renewed successfully",
        membership: {
          membership_id: result.insertId,
          member_id: current.member_id,
          plan_id: plan.plan_id,
          plan_name: plan.plan_name,
          start_date: nextStart,
          end_date: nextEnd,
          status
        }
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error("Renew membership error:", error);

    res.status(500).json({
      message: "Failed to renew membership"
    });
  }
};

// 5. Cancel membership
const cancelMembership = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.execute(
      `UPDATE memberships
       SET status = 'CANCELLED'
       WHERE membership_id = ?
         AND status IN ('ACTIVE', 'PENDING')`,
      [id]
    );

    if (result.affectedRows === 0) {
      const [existing] = await pool.execute(
        `SELECT membership_id, status
         FROM memberships
         WHERE membership_id = ?`,
        [id]
      );

      if (!existing.length) {
        return res.status(404).json({
          message: "Membership not found"
        });
      }

      return res.status(400).json({
        message: "Membership cannot be cancelled in its current status"
      });
    }

    res.status(200).json({
      message: "Membership cancelled successfully"
    });

  } catch (error) {
    console.error("Cancel membership error:", error);

    res.status(500).json({
      message: "Failed to cancel membership"
    });
  }
};

module.exports = {
  createMembership,
  getAllMemberships,
  getMembershipById,
  renewMembership,
  cancelMembership
};
