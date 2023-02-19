const express = require("express");
const util = require("../util");
const courseRouter = express.Router();
const dbo = require("../db/conn");
const templateCourse = require("../db/templateCourse");
const ObjectId = require("mongodb").ObjectId;

// Get list of courses
courseRouter.get("/", async (req, res) => {
  // Check for authentication
  if (!req.user) {
    res.status(401).json("You are not logged in!");
    return;
  }

  // Send back list of courses
  const db = dbo.getDb();
  const query = { userID: req.user.id };
  const result = await db.collection("Courses").find(query).toArray();
  res.send(result.map((course) => course.title));
});

// Add a new course
courseRouter.post("/", async (req, res) => {
  // Check for authentication
  if (!req.user) {
    res.status(401).json("You are not logged in!");
    return;
  }

  // Check to make sure course doesn't already exist
  const { title } = req.body;
  const db = dbo.getDb();
  const query = { title: title, userID: req.user.id };
  const result = await db.collection("Courses").findOne(query);
  if (result) {
    res.status(400).json("A course by this name already exists!");
    return;
  }

  // Add course
  const newCourse = {
    title: title,
    userID: req.user.id,
    root: templateCourse.root,
    desiredScore: 90,
  };

  await db.collection("Courses").insertOne(newCourse);
  res.status(200).send("Course created successfully.");
});

// Get specific course
courseRouter.get("/:title", async (req, res) => {
  // Check for authentication
  if (!req.user) {
    res.status(401).json("You are not logged in!");
    return;
  }

  // Check that course exists
  const title = req.params.title;
  const db = dbo.getDb();
  const query = { title: title, userID: req.user.id };
  const result = await db.collection("Courses").findOne(query);
  if (!result) {
    res.status(404).json("You don't have a course by that name!");
    return;
  }

  // Respond with course
  res.send({
    title: result.title,
    root: result.root,
    desiredScore: result.desiredScore,
  });
});

// Update specific course
courseRouter.put("/:title", async (req, res) => {
  // Check for authentication
  if (!req.user) {
    res.status(401).json("You are not logged in!");
    return;
  }

  // Make sure course with that title exists
  const originalTitle = req.params.title;
  const db = dbo.getDb();
  const query = { title: originalTitle, userID: req.user.id };
  const existingCourse = await db.collection("Courses").findOne(query);
  if (!existingCourse) {
    res.status(404).json("That course doesn't exist!");
    return;
  }

  // Check if another course already has this name
  const sameName = await db.collection("Courses").findOne({
    title: req.body.title,
    userID: req.user.id,
  });
  if (sameName && sameName.title !== originalTitle) {
    res.status(400).json("You already have a course with this name.");
    return;
  }

  // Finally, update course
  const newData = {
    $set: {
      title: req.body.title,
      root: req.body.root,
      desiredScore: req.body.desiredScore,
    },
  };
  db.collection("Courses").updateOne(query, newData, function (err, response) {
    res.json(response);
  });
});

// Delete specific course
courseRouter.delete("/:title", async (req, res) => {
  // Check for authentication
  if (!req.user) {
    res.status(401).json("You are not logged in!");
    return;
  }

  // Make sure course with that title exists
  const title = req.params.title;
  const db = dbo.getDb();
  const query = { title: title, userID: req.user.id };
  const existingCourse = await db.collection("Courses").findOne(query);
  if (!existingCourse) {
    res.status(404).json("That course doesn't exist!");
    return;
  }

  // Finally, delete course
  db.collection("Courses").deleteOne(query, function (err, obj) {
    if (err) throw err;
    res.json(obj);
  });
});

module.exports = {
  router: courseRouter,
};
