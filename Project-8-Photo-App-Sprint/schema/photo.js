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
});

/**
 * Create a Mongoose Model for a Photo using the photoSchema.
 */
const Photo = mongoose.model("Photo", photoSchema);

/**
 * Make this available to our application.
 */
module.exports = Photo;
