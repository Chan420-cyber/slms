
const pool = require("../config/db");

// 1. Add an expense
const createExpense = async (req, res) => {
  try {
    const {
      expense_title,
      category,
      amount,
      expense_date,
      description
    } = req.body;

    const recorded_by = req.user.id || req.user.userId || null;

    if (!expense_title || !category || amount === undefined || amount === null) {
      return res.status(400).json({
        message: "Title, category and amount are required"
      });
    }

    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({
        message: "Amount must be greater than zero"
      });
    }

    const [result] = await pool.execute(
      `INSERT INTO expenses
       (expense_title, category, amount, expense_date, description, recorded_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        expense_title,
        category,
        Number(amount),
        expense_date || new Date().toISOString().slice(0, 10),
        description || null,
        recorded_by
      ]
    );

    res.status(201).json({
      message: "Expense recorded successfully",
      expense_id: result.insertId
    });

  } catch (error) {
    console.error("Create expense error:", error);

    res.status(500).json({
      message: "Failed to record expense"
    });
  }
};


// 2. Get all expenses with optional filters
const getAllExpenses = async (req, res) => {
  try {
    const { category, start_date, end_date } = req.query;

    const conditions = [];
    const params = [];

    if (category) {
      conditions.push("category = ?");
      params.push(category);
    }

    if (start_date) {
      conditions.push("expense_date >= ?");
      params.push(start_date);
    }

    if (end_date) {
      conditions.push("expense_date <= ?");
      params.push(end_date);
    }

    if (start_date && end_date && start_date > end_date) {
      return res.status(400).json({
        message: "Start date cannot be after end date"
      });
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const [expenses] = await pool.execute(
      `SELECT
         e.*,
         u.username AS recorded_by_username
       FROM expenses e
       LEFT JOIN users u ON e.recorded_by = u.user_id
       ${whereClause}
       ORDER BY e.expense_date DESC, e.expense_id DESC`,
      params
    );

    res.status(200).json({
      total: expenses.length,
      expenses
    });

  } catch (error) {
    console.error("Get expenses error:", error);

    res.status(500).json({
      message: "Failed to retrieve expenses"
    });
  }
};


// 3. Get one expense
const getExpenseById = async (req, res) => {
  try {
    const { id } = req.params;

    const [expenses] = await pool.execute(
      `SELECT *
       FROM expenses
       WHERE expense_id = ?`,
      [id]
    );

    if (!expenses.length) {
      return res.status(404).json({
        message: "Expense not found"
      });
    }

    res.status(200).json({
      expense: expenses[0]
    });

  } catch (error) {
    console.error("Get expense error:", error);

    res.status(500).json({
      message: "Failed to retrieve expense"
    });
  }
};


// 4. Update an expense
const updateExpense = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      expense_title,
      category,
      amount,
      expense_date,
      description
    } = req.body;

    if (!expense_title || !category || amount === undefined || amount === null || !expense_date) {
      return res.status(400).json({
        message: "Title, category, amount and expense date are required"
      });
    }

    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({
        message: "Amount must be greater than zero"
      });
    }

    const [result] = await pool.execute(
      `UPDATE expenses
       SET expense_title = ?,
           category = ?,
           amount = ?,
           expense_date = ?,
           description = ?
       WHERE expense_id = ?`,
      [
        expense_title,
        category,
        Number(amount),
        expense_date,
        description || null,
        id
      ]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        message: "Expense not found"
      });
    }

    res.status(200).json({
      message: "Expense updated successfully"
    });

  } catch (error) {
    console.error("Update expense error:", error);

    res.status(500).json({
      message: "Failed to update expense"
    });
  }
};


module.exports = {
  createExpense,
  getAllExpenses,
  getExpenseById,
  updateExpense
};
