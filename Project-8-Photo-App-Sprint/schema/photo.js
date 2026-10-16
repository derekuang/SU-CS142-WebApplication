"use strict";

const mongoose = require("mongoose");

/**
 * Define the Mongoose Schema for a Comment.
 */
const commentSchema = new mongoose.Schema({
  // The text of the comment.
  comment: String,
  // The date and time when the comment was created.
  date_time: { type: Date, default: Date.now },
  // The ID of the user who created the comment.
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  // The IDs of the users @mentioned in this comment. Only users verified to
  // exist when the comment was added are stored here, so a mention can never
  // point at a nonexistent user.
  mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
});

/**
 * Define the Mongoose Schema for a Photo.
 */
const photoSchema = new mongoose.Schema({
  // Name of the file containing the photo (in the project8/images directory).
  file_name: String,
  // The date and time when the photo was added to the database.
  date_time: { type: Date, default: Date.now },
  // The ID of the user who created the photo. `ref` lets a query populate the
  // owner's profile (used by the mentions list).
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  // Array of comment objects representing the comments made on this photo.
  comments: [commentSchema],
  // Visibility three-state: the field being absent means the photo is visible
  // to everyone; the field being present (including an empty array) means only
  // the owner and the users listed here may see it.
  // `default: undefined` is required: without it Mongoose coerces an unset
  // array path to [], which would erase the distinction between "no list
  // specified" (public) and "empty list" (owner only).
  shared_with: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    default: undefined,
  },
  // The ids of the users who liked this photo. A plain array is enough: the
  // story only needs the count and whether the current viewer is in it. Its
  // uniqueness is what enforces the story's "a photo's like count should never
  // be greater than the total number of users" - likes are added with
  // `$addToSet` and removed with `$pull` (see photoRepo). Photos stored before
  // this field existed simply lack it and count as having no likes.
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  // The ids of the users who favorited this photo. Modeled exactly like
  // `likes`: a plain array whose uniqueness (enforced by `$addToSet`/`$pull`)
  // gives "one favorite per user per photo" and makes the toggle idempotent.
  // Storing it here (rather than on the User) means a deleted photo takes its
  // favorites with it, and lets `shapePhotos` derive `favoritedByViewer`
  // without a second query. Photos stored before this field existed simply
  // lack it and count as having no favorites.
  favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
});

/**
 * Create a Mongoose Model for a Photo using the photoSchema.
 */
const Photo = mongoose.model("Photo", photoSchema);

/**
 * Make this available to our application.
 */
module.exports = Photo;
