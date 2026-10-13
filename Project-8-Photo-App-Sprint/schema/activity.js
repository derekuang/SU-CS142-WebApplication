"use strict";

const mongoose = require("mongoose");

const ACTIVITY_TYPES = require("../server/models/activityTypes.js");

/**
 * Define the Mongoose Schema for an Activity.
 *
 * One document records one thing a user did, in the order it happened:
 *   - user_id  the user who performed the action (the actor).
 *   - type     which kind of action it was (see activityTypes.js).
 *   - date_time when it happened. Seed data passes the photo/comment time so a
 *              freshly loaded database still reads as a history.
 *   - photo_id only for photo uploads and comments; absent for
 *              register/login/logout. `default: undefined` keeps the field
 *              absent (a `photo_id: null` would still be queryable, but omitting
 *              it matches how the visibility query checks for its absence).
 */
const activitySchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  type: {
    type: String,
    enum: Object.values(ACTIVITY_TYPES),
    required: true,
  },
  date_time: { type: Date, default: Date.now },
  photo_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Photo",
    default: undefined,
  },
});

/**
 * Create a Mongoose Model for an Activity using the activitySchema.
 */
const Activity = mongoose.model("Activity", activitySchema);

/**
 * Make this available to our application.
 */
module.exports = Activity;
