const express = require("express");
const util = require("../util");
const userRouter = express.Router();
const dbo = require("../db/conn");

userRouter.get("/info", (req, res) => {
  if (req.user) {
    res.send({
      loggedIn: true,
      username: req.user.username,
      courses: req.user.courses
    });
  } else {
    res.send({
      loggedIn: false
    });
  }
});

module.exports = {
  router: userRouter
};