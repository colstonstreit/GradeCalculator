const express = require("express");
const util = require("../util");
const userRouter = express.Router();
const dbo = require("../db/conn");

userRouter.get("/loginStatus", (req, res) => {
  res.json({
    loggedIn: !!req.user,
  });
});

module.exports = {
  router: userRouter,
};
