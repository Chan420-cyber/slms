
const pool = require("../config/db");

// 1. Record a payment
const createPayment = async (req, res) => {
  try {
    const {
      member_id,
      membership_id,
      amount,
      payment_method,
      transaction_reference,
      payment_status = "SUCCESS"
    } = req.body;

    const recorded_by = req.user.id || req.user.userId || null;

    const validMethods = [
      "CASH",
      "UPI",
      "CARD",
      "BANK_TRANSFER",
      "OTHER"
    ];

    const validStatuses = [
      "PENDING",
      "SUCCESS",
      "FAILED"
    ];

    if (!member_id || amount === undefined || amount === null) {
      return res.status(400).json({
        message: "Member ID and amount are required"
      });
    }

    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({
        message: "Amount must be greater than zero"
      });
    }

    if (!validMethods.includes(payment_method)) {
      return res.status(400).json({
        message: "Invalid payment method"
      });
    }

    if (!validStatuses.includes(payment_status)) {
      return res.status(400).json({
        message: "Invalid payment status"
      });
    }

    // Verify member exists
    const [members] = await pool.execute(
      "SELECT member_id FROM members WHERE member_id = ?",
      [member_id]
    );

    if (!members.length) {
      return res.status(404).json({
        message: "Member not found"
      });
    }

    // Verify membership belongs to this member
    if (membership_id) {
      const [memberships] = await pool.execute(
        `SELECT membership_id
         FROM memberships
         WHERE membership_id = ? AND member_id = ?`,
        [membership_id, member_id]
      );

      if (!memberships.length) {
        return res.status(400).json({
          message: "Membership does not belong to this member"
        });
      }
    }

    const [result] = await pool.execute(
      `INSERT INTO payments
       (
         member_id,
         membership_id,
         amount,
         payment_method,
         transaction_reference,
         payment_status,
         paid_at,
         recorded_by
       )
       VALUES (?, ?, ?, ?, ?, ?, NOW(), ?)`,
      [
        member_id,
        membership_id || null,
        Number(amount),
        payment_method,
        transaction_reference || null,
        payment_status,
        recorded_by
      ]
    );

    res.status(201).json({
      message: "Payment recorded successfully",
      payment_id: result.insertId,
      member_id,
      membership_id: membership_id || null,
      amount: Number(amount),
      payment_method,
      payment_status
    });

  } catch (error) {
    console.error("Create payment error:", error);

    res.status(500).json({
      message: "Failed to record payment"
    });
  }
};


// 2. Get all payments with optional filters
const getAllPayments = async (req, res) => {
  try {
    const { member_id, payment_status, payment_method } = req.query;

    const conditions = [];
    const params = [];

    if (member_id) {
      conditions.push("p.member_id = ?");
      params.push(member_id);
    }

    if (payment_status) {
      conditions.push("p.payment_status = ?");
      params.push(payment_status);
    }

    if (payment_method) {
      conditions.push("p.payment_method = ?");
      params.push(payment_method);
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const [payments] = await pool.execute(
      `SELECT
         p.*,
         m.full_name,
         m.member_code
       FROM payments p
       JOIN members m ON p.member_id = m.member_id
       ${whereClause}
       ORDER BY p.payment_id DESC`,
      params
    );

    res.status(200).json({
      total: payments.length,
      payments
    });

  } catch (error) {
    console.error("Get payments error:", error);

    res.status(500).json({
      message: "Failed to retrieve payments"
    });
  }
};


// 3. Get payment by ID
const getPaymentById = async (req, res) => {
  try {
    const { id } = req.params;

    const [payments] = await pool.execute(
      `SELECT
         p.*,
         m.full_name,
         m.member_code,
         m.phone
       FROM payments p
       JOIN members m ON p.member_id = m.member_id
       WHERE p.payment_id = ?`,
      [id]
    );

    if (!payments.length) {
      return res.status(404).json({
        message: "Payment not found"
      });
    }

    res.status(200).json({
      payment: payments[0]
    });

  } catch (error) {
    console.error("Get payment error:", error);

    res.status(500).json({
      message: "Failed to retrieve payment"
    });
  }
};


// 4. Get payment history for a member
const getMemberPayments = async (req, res) => {
  try {
    const { memberId } = req.params;

    const [payments] = await pool.execute(
      `SELECT
         payment_id,
         membership_id,
         amount,
         payment_method,
         transaction_reference,
         payment_status,
         paid_at
       FROM payments
       WHERE member_id = ?
       ORDER BY payment_id DESC`,
      [memberId]
    );

    const [summary] = await pool.execute(
      `SELECT
         COALESCE(SUM(
           CASE WHEN payment_status = 'SUCCESS'
           THEN amount ELSE 0 END
         ), 0) AS total_paid,
         COALESCE(SUM(
           CASE WHEN payment_status = 'PENDING'
           THEN amount ELSE 0 END
         ), 0) AS total_pending,
         COALESCE(SUM(
           CASE WHEN payment_status = 'REFUNDED'
           THEN amount ELSE 0 END
         ), 0) AS total_refunded
       FROM payments
       WHERE member_id = ?`,
      [memberId]
    );

    res.status(200).json({
      member_id: Number(memberId),
      summary: summary[0],
      payments
    });

  } catch (error) {
    console.error("Member payment history error:", error);

    res.status(500).json({
      message: "Failed to retrieve member payment history"
    });
  }
};


// 5. Update payment status
const updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_status } = req.body;

    const validStatuses = [
      "PENDING",
      "SUCCESS",
      "FAILED",
      "REFUNDED"
    ];

    if (!validStatuses.includes(payment_status)) {
      return res.status(400).json({
        message: "Invalid payment status"
      });
    }

    const [existing] = await pool.execute(
      `SELECT payment_status
       FROM payments
       WHERE payment_id = ?`,
      [id]
    );

    if (!existing.length) {
      return res.status(404).json({
        message: "Payment not found"
      });
    }

    const currentStatus = existing[0].payment_status;

    // A refunded payment cannot be marked successful again
    if (currentStatus === "REFUNDED") {
      return res.status(400).json({
        message: "A refunded payment cannot be changed"
      });
    }

    // Only successful payments can be refunded
    if (
      payment_status === "REFUNDED" &&
      currentStatus !== "SUCCESS"
    ) {
      return res.status(400).json({
        message: "Only successful payments can be refunded"
      });
    }

    const [result] = await pool.execute(
      `UPDATE payments
       SET payment_status = ?
       WHERE payment_id = ?`,
      [payment_status, id]
    );

    res.status(200).json({
      message: "Payment status updated successfully",
      payment_id: Number(id),
      previous_status: currentStatus,
      payment_status
    });

  } catch (error) {
    console.error("Update payment status error:", error);

    res.status(500).json({
      message: "Failed to update payment status"
    });
  }
};


// 6. Generate payment receipt data
const getPaymentReceipt = async (req, res) => {
  try {
    const { id } = req.params;

    const [receipts] = await pool.execute(
      `SELECT
         p.payment_id,
         p.amount,
         p.payment_method,
         p.transaction_reference,
         p.payment_status,
         p.paid_at,
         m.member_code,
         m.full_name,
         m.phone,
         mp.plan_name
       FROM payments p
       JOIN members m
         ON p.member_id = m.member_id
       LEFT JOIN memberships ms
         ON p.membership_id = ms.membership_id
       LEFT JOIN membership_plans mp
         ON ms.plan_id = mp.plan_id
       WHERE p.payment_id = ?`,
      [id]
    );

    if (!receipts.length) {
      return res.status(404).json({
        message: "Receipt not found"
      });
    }

    if (receipts[0].payment_status !== "SUCCESS") {
      return res.status(400).json({
        message: "A receipt is available only for successful payments"
      });
    }

    res.status(200).json({
      receipt: {
        receipt_number: `SLMS-${receipts[0].payment_id}`,
        ...receipts[0]
      }
    });

  } catch (error) {
    console.error("Receipt error:", error);

    res.status(500).json({
      message: "Failed to generate receipt"
    });
  }
};


module.exports = {
  createPayment,
  getAllPayments,
  getPaymentById,
  getMemberPayments,
  updatePaymentStatus,
  getPaymentReceipt
};
