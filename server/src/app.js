const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth.routes");
const timeRoutes = require("./routes/time.routes");
const attendanceRoutes = require("./routes/attendance.routes");
const adminRoutes = require("./routes/admin.routes");
const employeeRoutes = require("./routes/employee.routes");


const app = express();
app.use(express.json());

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/time", timeRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/employee", employeeRoutes);

module.exports = app;
