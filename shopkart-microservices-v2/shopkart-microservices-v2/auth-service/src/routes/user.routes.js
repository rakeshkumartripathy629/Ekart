const router = require("express").Router();
const User = require("../models/User");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { protect } = require("../middleware/auth.middleware");
const { adminOnly } = require("../middleware/admin.middleware");
const { getPagination } = require("../utils/pagination");
// Internal: order-service fetches user by id
router.get(
  "/internal/:userId",
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.userId);
    ApiResponse.success(res, "User fetched", { user });
  }),
);
// Internal: admin-service fetches user stats
router.get(
  "/internal/stats",
  asyncHandler(async (req, res) => {
    const total = await User.countDocuments({ role: "user", isActive: true });
    ApiResponse.success(res, "User stats", { total });
  }),
);
// Admin: all users
router.get(
  "/admin/all",
  protect,
  adminOnly,
  asyncHandler(async (req, res) => {
    const { search, status } = req.query;
    const { page, limit, skip } = getPagination(req.query);
    const q = { role: "user" };
    if (search)
      q.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    if (status === "active") q.isActive = true;
    if (status === "inactive") q.isActive = false;
    const [total, data] = await Promise.all([
      User.countDocuments(q),
      User.find(q)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("-password"),
    ]);
    ApiResponse.paginated(res, "Users fetched", { data, total, page, limit });
  }),
);
// Admin: toggle user
router.patch(
  "/admin/:id/toggle",
  protect,
  adminOnly,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    user.isActive = !user.isActive;
    await user.save({ validateBeforeSave: false });
    ApiResponse.success(
      res,
      `User ${user.isActive ? "activated" : "deactivated"}`,
      { isActive: user.isActive },
    );
  }),
);
// My profile
router.get(
  "/profile",
  protect,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    ApiResponse.success(res, "Profile fetched", { user });
  }),
);
module.exports = router;
