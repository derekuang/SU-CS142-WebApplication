/**
 * URL routing table.
 *
 * Maps every URL to its controller, attaching the shared `requireLogin` guard
 * (and the upload middleware) where the original web server did. The route
 * order matters: `/user/list` must precede `/user/:id`.
 */

const express = require("express");

const requireLogin = require("../middleware/requireLogin.js");
const uploadPhoto = require("../middleware/upload.js");

const adminController = require("../controllers/adminController.js");
const userController = require("../controllers/userController.js");
const photoController = require("../controllers/photoController.js");
const commentController = require("../controllers/commentController.js");
const activityController = require("../controllers/activityController.js");
const testController = require("../controllers/testController.js");

const router = express.Router();

// System / connectivity - deliberately left open (see requireLogin).
router.get("/", testController.root);
router.get("/test/:p1", testController.test);

// Authentication and session.
router.post("/admin/login", adminController.login);
router.post("/admin/logout", adminController.logout);
router.get("/admin/currentUser", requireLogin, adminController.currentUser);
router.delete(
  "/admin/currentUser",
  requireLogin,
  adminController.deleteAccount,
);

// Users.
router.post("/user", userController.register);
router.get("/user/list", requireLogin, userController.list);
router.get("/user/:id", requireLogin, userController.detail);

// Photos.
router.get("/photosOfUser/:id", requireLogin, photoController.photosOfUser);
router.get("/usageOfUser/:id", requireLogin, photoController.getUsage);
router.get("/mentionsOfUser/:id", requireLogin, photoController.getMentions);
router.post(
  "/photos/new",
  requireLogin,
  uploadPhoto.single("uploadedphoto"),
  photoController.addPhoto,
);
router.delete("/photos/:photo_id", requireLogin, photoController.deletePhoto);

// Likes.
router.post("/likesOfPhoto/:photo_id", requireLogin, photoController.likePhoto);
router.delete(
  "/likesOfPhoto/:photo_id",
  requireLogin,
  photoController.unlikePhoto,
);

// Favorites.
router.get("/favorites", requireLogin, photoController.getFavorites);
router.post(
  "/photos/:photo_id/favorite",
  requireLogin,
  photoController.favoritePhoto,
);
router.delete(
  "/photos/:photo_id/favorite",
  requireLogin,
  photoController.unfavoritePhoto,
);

// Comments.
router.post(
  "/commentsOfPhoto/:photo_id",
  requireLogin,
  commentController.addComment,
);
router.delete(
  "/commentsOfPhoto/:photo_id/:comment_id",
  requireLogin,
  commentController.deleteComment,
);

// Activities.
router.get(
  "/activities/byUser",
  requireLogin,
  activityController.listByUser,
);
router.get("/activities", requireLogin, activityController.list);

module.exports = router;
