const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const addressSchema = new mongoose.Schema(
  {
    label: { type: String, default: "Home", enum: ["Home", "Work", "Other"] },
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    addressLine1: { type: String, required: true },
    addressLine2: String,
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    landmark: String,
    isDefault: { type: Boolean, default: false },
  },
  { _id: true, timestamps: true },
);
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: { type: String, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    avatar: { type: String, default: "" },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    addresses: [addressSchema],
    shopkartBalance: { type: Number, default: 0 },
    totalOrders: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    lastLogin: Date,
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
  },
  { timestamps: true },
);
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await require("bcryptjs").hash(this.password, 12);
  next();
});
userSchema.methods.comparePassword = async function (p) {
  return require("bcryptjs").compare(p, this.password);
};
userSchema.methods.toJSON = function () {
  const o = this.toObject();
  delete o.password;
  delete o.resetPasswordToken;
  delete o.resetPasswordExpires;
  return o;
};
module.exports = mongoose.model("User", userSchema);
