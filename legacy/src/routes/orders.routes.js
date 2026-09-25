const router = require("express").Router();
const { protect, restrictTo } = require("../middleware/auth");
const {
  listOrders,
  createOrder,
  approveOrder,
  rejectOrder,
  fulfillOrder,
  cancelOrder,
} = require("../controllers/orders.controller");

router.get("/", protect, listOrders);

router.post("/", protect, createOrder);

router.post(
  "/:id/approve",
  protect,
  restrictTo("admin", "superadmin"),
  approveOrder
);

router.post(
  "/:id/reject",
  protect,
  restrictTo("admin", "superadmin"),
  rejectOrder
);

router.post(
  "/:id/fulfill",
  protect,
  restrictTo("admin", "superadmin"),
  fulfillOrder
);

router.post("/:id/cancel", protect, cancelOrder);

module.exports = router;
