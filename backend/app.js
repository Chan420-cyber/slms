const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors({
    origin: [
    "http://localhost:5173",
    "http://localhost:5174"
  ]
}));

app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        message: "Study Lounge Management API is running"
    });
});

//Authentication routes
app.use("/api/auth", require("./routes/authRoutes"));

//Member routes
app.use("/api/members", require("./routes/memberRoutes"));

//Membership Plan routes
app.use("/api/membership-plans", require("./routes/membershipPlanRoutes"));

//Membership routes
app.use("/api/memberships", require("./routes/membershipRoutes"));

//Zone routes
app.use("/api/zones", require("./routes/zoneRoutes"));

//Seat routes
app.use("/api/seats", require("./routes/seatRoutes"));

//Allocation routes
app.use("/api/allocations", require("./routes/allocationRoutes"));

//Booking routes
app.use("/api/bookings", require("./routes/bookingRoutes"));

//Attendance routes
app.use("/api/attendance", require("./routes/attendanceRoutes"));

//Payment routes
app.use("/api/payments", require("./routes/paymentRoutes"));

//Expense routes
app.use("/api/expenses", require("./routes/expenseRoutes"));

//Report routes
app.use("/api/reports", require("./routes/reportRoutes"));

//Dashboard routes
app.use("/api/dashboard", require("./routes/dashboardRoutes"));

//User routes
app.use("/api/users", require("./routes/userRoutes"));

module.exports = app;