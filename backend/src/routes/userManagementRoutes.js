const express = require("express");
const router = express.Router();

const { authAdmin } = require("../middleware/auth");
const { requirePermission } = require("../middleware/permission");
const userManagement = require("../controllers/userManagementController");

// ─────────────── دسترسی‌های کاربر جاری ───────────────
router.get("/permissions", authAdmin, userManagement.getMyPermissions);

// ─────────────── مدیریت کاربران (فقط SUPER_ADMIN) ───────────────
router.get("/users", authAdmin, requirePermission("admins.view"), userManagement.listUsers);
router.get("/users/:id", authAdmin, requirePermission("admins.view"), userManagement.getUser);
router.post("/users", authAdmin, requirePermission("admins.manage"), userManagement.createUser);
router.put("/users/:id", authAdmin, requirePermission("admins.manage"), userManagement.updateUser);
router.post("/users/:id/disable", authAdmin, requirePermission("admins.manage"), userManagement.disableUser);
router.post("/users/:id/enable", authAdmin, requirePermission("admins.manage"), userManagement.enableUser);
router.delete("/users/:id", authAdmin, requirePermission("admins.manage"), userManagement.deleteUser);

// ─────────────── لیست نقش‌ها ───────────────
router.get("/roles", authAdmin, requirePermission("admins.view"), userManagement.getRoles);

module.exports = router;
