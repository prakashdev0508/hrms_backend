const express = require("express");
const app = express();
const cors = require("cors");
const colors = require("colors");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const { connectDB } = require("./utils/db");
const mainRoute = require("./routes/mainRoute");
const orginazation = require("./routes/orginazation.route");
const payment = require("./routes/payment.route");
const attendence = require("./routes/attendence.route");
const leave = require("./routes/leave.route");
const website = require("./website/routes/website.mainroute")
const dashboard = require("./routes/crm.dashboard")


dotenv.config();
connectDB();
 
app.use(cors());
app.use(cookieParser());
app.use(express.json());

const PORT = process.env.PORT || 5000;

//Routes
app.use("/api/v1", mainRoute);
app.use("/api/v1/organization", orginazation);
app.use("/api/v1/payment", payment);
app.use("/api/v1/attendence", attendence);
app.use("/api/v1/leave", leave);
app.use("/api/v1/website", website);
app.use("/api/v1/crm/dashboard", dashboard);

//Error Handling
app.use((error, req, res, next) => {
  const errorMessage = error.message || "Something went wrong";
  const errorStatus = error.status || 500;

  res.status(errorStatus).json({
    success: false,
    status: errorStatus,
    message: errorMessage,
  });
});

app.get("/", (req, res) => {
  res.json({ message: "Woking Fine" });
});

app.listen(PORT, () => {
  console.log(`App is running on port ${PORT}`.gray.bold);
});
