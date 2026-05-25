const crypto = require("crypto");
const User = require("../models/User");
const Cart = require("../models/Cart");
const Wishlist = require("../models/Wishlist");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const {
  sendTokenResponse,
  generateAccessToken,
  verifyRefreshToken,
} = require("../services/token.service");
const {
  publishUserRegistered,
  publishPasswordReset,
} = require("../events/publishers");

exports.register = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;
  if (await User.findOne({ email }))
    throw ApiError.conflict("Email already registered");

  const user = await User.create({ name, email, password, phone });

  // Create empty cart & wishlist in auth-service DB
  await Promise.all([
    Cart.create({ user: user._id, items: [] }),
    Wishlist.create({ user: user._id, products: [] }),
  ]);

  // ✅ Publish via Kafka + RabbitMQ (no direct call to notification-service)
  await publishUserRegistered(user);

  sendTokenResponse(
    user,
    201,
    res,
    "Registration successful! Welcome to ShopKart 🎉",
  );
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.comparePassword(password)))
    throw ApiError.unauthorized("Invalid email or password");
  if (!user.isActive)
    throw ApiError.forbidden("Account deactivated. Contact support.");
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });
  sendTokenResponse(user, 200, res, "Login successful");
});

exports.getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  ApiResponse.success(res, "Profile fetched", { user });
});

exports.refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) throw ApiError.badRequest("Refresh token required");
  const decoded = verifyRefreshToken(refreshToken);
  const user = await User.findById(decoded.id);
  if (!user || !user.isActive)
    throw ApiError.unauthorized("Invalid refresh token");
  const token = generateAccessToken(user._id);
  ApiResponse.success(res, "Token refreshed", { token });
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const { name, phone } = req.body;
  const updates = { name, phone };
  if (req.file) updates.avatar = `/uploads/avatars/${req.file.filename}`;
  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true,
  });
  ApiResponse.success(res, "Profile updated", { user });
});

exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select("+password");
  if (!(await user.comparePassword(currentPassword)))
    throw ApiError.unauthorized("Current password is incorrect");
  user.password = newPassword;
  await user.save();
  sendTokenResponse(user, 200, res, "Password changed successfully");
});

exports.forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) throw ApiError.notFound("No account with this email");
  const token = crypto.randomBytes(32).toString("hex");
  user.resetPasswordToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
  user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
  await user.save({ validateBeforeSave: false });
  const resetUrl = `${process.env.CLIENT_URL || "http://localhost:3000"}/reset-password?token=${token}`;

  // ✅ Kafka + RabbitMQ — no direct email call here
  await publishPasswordReset(user, resetUrl);

  ApiResponse.success(res, "Password reset link sent to your email");
});

exports.resetPassword = asyncHandler(async (req, res) => {
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.body.token)
    .digest("hex");
  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() },
  });
  if (!user) throw ApiError.badRequest("Invalid or expired reset token");
  user.password = req.body.newPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();
  sendTokenResponse(user, 200, res, "Password reset successful");
});

exports.addAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const { isDefault, ...addressData } = req.body;
  if (isDefault || user.addresses.length === 0) {
    user.addresses.forEach((a) => (a.isDefault = false));
    addressData.isDefault = true;
  }
  user.addresses.push(addressData);
  await user.save();
  ApiResponse.created(res, "Address added", { addresses: user.addresses });
});

exports.updateAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const addr = user.addresses.id(req.params.addressId);
  if (!addr) throw ApiError.notFound("Address not found");
  if (req.body.isDefault) user.addresses.forEach((a) => (a.isDefault = false));
  Object.assign(addr, req.body);
  await user.save();
  ApiResponse.success(res, "Address updated", { addresses: user.addresses });
});

exports.deleteAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  user.addresses = user.addresses.filter(
    (a) => a._id.toString() !== req.params.addressId,
  );
  await user.save();
  ApiResponse.success(res, "Address deleted", { addresses: user.addresses });
});

exports.setDefaultAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  user.addresses.forEach(
    (a) => (a.isDefault = a._id.toString() === req.params.addressId),
  );
  await user.save();
  ApiResponse.success(res, "Default address updated", {
    addresses: user.addresses,
  });
});
