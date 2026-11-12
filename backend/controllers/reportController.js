
const pool = require("../config/db");

// 1. Financial overview
const getFinancialOverview = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    if ((start_date && !end_date) || (!start_date && end_date)) {
      return res.status(400).json({
        message: "Provide both start_date and end_date"
      });
    }

    if (start_date && end_date && start_date > end_date) {
      return res.status(400).json({
        message: "Start date cannot be after end date"
      });
    }

    const paymentConditions = [];
    const paymentParams = [];

    const expenseConditions = [];
    const expenseParams = [];

    if (start_date && end_date) {
      paymentConditions.push("DATE(p.paid_at) BETWEEN ? AND ?");
      paymentParams.push(start_date, end_date);

      expenseConditions.push("e.expense_date BETWEEN ? AND ?");
      expenseParams.push(start_date, end_date);
    }

    const paymentWhere = paymentConditions.length
      ? `WHERE ${paymentConditions.join(" AND ")}`
      : "";

    const expenseWhere = expenseConditions.length
      ? `WHERE ${expenseConditions.join(" AND ")}`
      : "";

    const [paymentSummary] = await pool.execute(
      `SELECT
        COALESCE(SUM(
          CASE WHEN p.payment_status = 'SUCCESS'
          THEN p.amount ELSE 0 END
        ), 0) AS total_successful_payments,

        COALESCE(SUM(
          CASE WHEN p.payment_status = 'REFUNDED'
          THEN p.amount ELSE 0 END
        ), 0) AS total_refunds,

        COALESCE(SUM(
          CASE WHEN p.payment_status = 'PENDING'
          THEN p.amount ELSE 0 END
        ), 0) AS total_pending
       FROM payments p
       ${paymentWhere}`,
      paymentParams
    );

    const [expenseSummary] = await pool.execute(
      `SELECT
        COALESCE(SUM(e.amount), 0) AS total_expenses
       FROM expenses e
       ${expenseWhere}`,
      expenseParams
    );

    const successful = Number(
      paymentSummary[0].total_successful_payments
    );

    const refunds = Number(
      paymentSummary[0].total_refunds
    );

    const expenses = Number(
      expenseSummary[0].total_expenses
    );

    const netRevenue = successful - refunds;
    const netIncome = netRevenue - expenses;

    res.status(200).json({
      period: {
        start_date: start_date || "All time",
        end_date: end_date || "Today"
      },
      financial_summary: {
        total_successful_payments: successful,
        total_refunds: refunds,
        net_revenue: netRevenue,
        total_pending_payments: Number(
          paymentSummary[0].total_pending
        ),
        total_expenses: expenses,
        net_income: netIncome
      }
    });

  } catch (error) {
    console.error("Financial overview error:", error);

    res.status(500).json({
      message: "Failed to generate financial overview"
    });
  }
};


// 2. Monthly revenue and expenses
const getMonthlyReport = async (req, res) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();

    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return res.status(400).json({
        message: "Please provide a valid year"
      });
    }

    const [revenue] = await pool.execute(
      `SELECT
        MONTH(p.paid_at) AS month_number,
        COALESCE(SUM(
          CASE WHEN p.payment_status = 'SUCCESS'
          THEN p.amount ELSE 0 END
        ), 0) AS successful_payments,
        COALESCE(SUM(
          CASE WHEN p.payment_status = 'REFUNDED'
          THEN p.amount ELSE 0 END
        ), 0) AS refunds
       FROM payments p
       WHERE YEAR(p.paid_at) = ?
       GROUP BY MONTH(p.paid_at)
       ORDER BY month_number`,
      [year]
    );

    const [expenses] = await pool.execute(
      `SELECT
        MONTH(expense_date) AS month_number,
        COALESCE(SUM(amount), 0) AS total_expenses
       FROM expenses
       WHERE YEAR(expense_date) = ?
       GROUP BY MONTH(expense_date)
       ORDER BY month_number`,
      [year]
    );

    const report = Array.from({ length: 12 }, (_, index) => {
      const monthNumber = index + 1;

      const revenueRow = revenue.find(
        row => Number(row.month_number) === monthNumber
      );

      const expenseRow = expenses.find(
        row => Number(row.month_number) === monthNumber
      );

      const successful = Number(
        revenueRow?.successful_payments || 0
      );

      const refunds = Number(revenueRow?.refunds || 0);
      const totalExpenses = Number(
        expenseRow?.total_expenses || 0
      );

      const netRevenue = successful - refunds;

      return {
        month: monthNumber,
        successful_payments: successful,
        refunds,
        net_revenue: netRevenue,
        total_expenses: totalExpenses,
        net_income: netRevenue - totalExpenses
      };
    });

    res.status(200).json({
      year,
      monthly_report: report
    });

  } catch (error) {
    console.error("Monthly report error:", error);

    res.status(500).json({
      message: "Failed to generate monthly report"
    });
  }
};


// 3. Revenue by payment method
const getPaymentMethodReport = async (req, res) => {
  try {
    const [report] = await pool.execute(
      `SELECT
        payment_method,
        COUNT(*) AS transaction_count,
        COALESCE(SUM(
          CASE WHEN payment_status = 'SUCCESS'
          THEN amount ELSE 0 END
        ), 0) AS successful_amount,
        COALESCE(SUM(
          CASE WHEN payment_status = 'REFUNDED'
          THEN amount ELSE 0 END
        ), 0) AS refunded_amount
       FROM payments
       GROUP BY payment_method
       ORDER BY successful_amount DESC`
    );

    res.status(200).json({
      payment_method_report: report
    });

  } catch (error) {
    console.error("Payment method report error:", error);

    res.status(500).json({
      message: "Failed to generate payment method report"
    });
  }
};


// 4. Expenses by category
const getExpenseCategoryReport = async (req, res) => {
  try {
    const [report] = await pool.execute(
      `SELECT
        category,
        COUNT(*) AS expense_count,
        COALESCE(SUM(amount), 0) AS total_amount
       FROM expenses
       GROUP BY category
       ORDER BY total_amount DESC`
    );

    res.status(200).json({
      expense_category_report: report
    });

  } catch (error) {
    console.error("Expense category report error:", error);

    res.status(500).json({
      message: "Failed to generate expense category report"
    });
  }
};


// 5. Daily revenue report
const getDailyRevenueReport = async (req, res) => {
  try {
    const date = req.query.date ||
      new Date().toISOString().slice(0, 10);

    const [report] = await pool.execute(
      `SELECT
        COALESCE(SUM(
          CASE WHEN payment_status = 'SUCCESS'
          THEN amount ELSE 0 END
        ), 0) AS successful_payments,
        COALESCE(SUM(
          CASE WHEN payment_status = 'REFUNDED'
          THEN amount ELSE 0 END
        ), 0) AS refunds,
        COUNT(*) AS transaction_count
       FROM payments
       WHERE DATE(paid_at) = ?`,
      [date]
    );

    const [expenseResult] = await pool.execute(
      `SELECT COALESCE(SUM(amount), 0) AS total_expenses
       FROM expenses
       WHERE expense_date = ?`,
      [date]
    );

    const successful = Number(
      report[0].successful_payments
    );

    const refunds = Number(report[0].refunds);
    const expenses = Number(expenseResult[0].total_expenses);

    res.status(200).json({
      date,
      successful_payments: successful,
      refunds,
      net_revenue: successful - refunds,
      total_expenses: expenses,
      net_income: successful - refunds - expenses,
      transaction_count: Number(report[0].transaction_count)
    });

  } catch (error) {
    console.error("Daily revenue error:", error);

    res.status(500).json({
      message: "Failed to generate daily revenue report"
    });
  }
};


module.exports = {
  getFinancialOverview,
  getMonthlyReport,
  getPaymentMethodReport,
  getExpenseCategoryReport,
  getDailyRevenueReport
};
