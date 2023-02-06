const express = require("express");
const util = require("../util");
const userRouter = express.Router();
const dbo = require("../db/conn");

userRouter.get("/loginStatus", (req, res) => {
  if (req.user) {
    res.send({
      loggedIn: true,
      username: req.user.username,
    });
  } else {
    res.send({
      loggedIn: false,
    });
  }
});

module.exports = {
  router: userRouter,
};
