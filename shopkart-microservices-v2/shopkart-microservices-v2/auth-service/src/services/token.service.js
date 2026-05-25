const jwt = require("jsonwebtoken");
const S = process.env.JWT_SECRET || "shopkart_secret";
const RE = process.env.JWT_REFRESH_EXPIRES || "30d";
const AE = process.env.JWT_ACCESS_EXPIRES || "7d";
exports.generateAccessToken = (id) => jwt.sign({ id }, S, { expiresIn: AE });
exports.generateRefreshToken = (id) =>
  jwt.sign({ id }, S + "_refresh", { expiresIn: RE });
exports.verifyRefreshToken = (t) => jwt.verify(t, S + "_refresh");
exports.sendTokenResponse = (user, statusCode, res, message = "Success") => {
  const token = exports.generateAccessToken(user._id);
  const refreshToken = exports.generateRefreshToken(user._id);
  res
    .status(statusCode)
    .json({
      success: true,
      message,
      token,
      refreshToken,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar,
        shopkartBalance: user.shopkartBalance,
        totalOrders: user.totalOrders,
      },
    });
};
