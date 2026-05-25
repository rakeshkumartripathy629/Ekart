const mongoose = require("mongoose");
const cartItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId },
    name: String,
    emoji: String,
    brand: String,
    image: String,
    price: Number,
    mrp: Number,
    qty: { type: Number, default: 1, min: 1 },
    variant: { type: String, default: "" },
    seller: String,
  },
  { _id: true },
);
const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      unique: true,
    },
    items: [cartItemSchema],
    couponCode: String,
    couponDiscount: { type: Number, default: 0 },
  },
  { timestamps: true },
);
cartSchema.virtual("subtotal").get(function () {
  return this.items.reduce((s, i) => s + i.price * i.qty, 0);
});
cartSchema.virtual("mrpTotal").get(function () {
  return this.items.reduce((s, i) => s + i.mrp * i.qty, 0);
});
cartSchema.virtual("savings").get(function () {
  return this.mrpTotal - this.subtotal;
});
cartSchema.virtual("itemCount").get(function () {
  return this.items.reduce((s, i) => s + i.qty, 0);
});
cartSchema.virtual("deliveryCharge").get(function () {
  return this.subtotal >= 499 ? 0 : 29;
});
cartSchema.virtual("total").get(function () {
  return Math.max(0, this.subtotal - this.couponDiscount + this.deliveryCharge);
});
cartSchema.set("toJSON", { virtuals: true });
cartSchema.set("toObject", { virtuals: true });
module.exports = mongoose.model("Cart", cartSchema);
