const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const path = require("path");
const corsOptions = require("./config/cors");
const { errorHandler, notFound } = require("./middleware/error.middleware");
const routes = require("./routes/index");

const app = express();
app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV === "development") app.use(morgan("dev"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));
app.get("/api/health", (req, res) =>
  res.json({ success: true, service: "auth-service" }),
);
app.use("/api", routes);
app.use(notFound);
app.use(errorHandler);
module.exports = app;
