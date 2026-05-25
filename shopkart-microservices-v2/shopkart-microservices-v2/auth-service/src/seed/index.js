require("dotenv").config();
const connectDB = require("../config/db");
const User = require("../models/User");
const run = async () => {
  await connectDB();
  const exists = await User.findOne({
    email: process.env.ADMIN_EMAIL || "admin@shopkart.com",
  });
  if (exists) {
    console.log("Admin already exists");
    process.exit(0);
  }
  await User.create({
    name: process.env.ADMIN_NAME || "ShopKart Admin",
    email: process.env.ADMIN_EMAIL || "admin@shopkart.com",
    password: process.env.ADMIN_PASSWORD || "Admin@123",
    role: "admin",
    isVerified: true,
    isActive: true,
  });
  console.log("Admin created: admin@shopkart.com / Admin@123");
  process.exit(0);
};
run().catch((e) => {
  console.error(e);
  process.exit(1);
});
