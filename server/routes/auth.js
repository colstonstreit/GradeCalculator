const express = require("express");
const { getHashedPassword } = require("../util");
const util = require("../util");
const authRouter = express.Router();
const dbo = require("../db/conn");
const templateCourse = require("../db/templateCourse");

const authTokenMap = {};

// Create new Account
authRouter.post("/register", async (req, res) => {

  const { username, password, confirmPassword } = req.body;
  const db = dbo.getDb();
  const usedUsername = await db.collection("Users").findOne({ username: username});

  if (usedUsername) {
    util.redirect(res, "/register", { error: "Username already exists!"});
  } else if (password !== confirmPassword) {
    util.redirect(res, "/register", { error: "Passwords don't match!" });
  } else {

    const newUser = {
      username: username,
      hashedPassword: util.getHashedPassword(password),
      courses: [templateCourse]
    };
    await db.collection("Users").insertOne(newUser);
    util.redirect(res, "/login", { success: "Registered successfully!" });
  }
});

// Log into Account
authRouter.post("/login", async (req, res) => {

  if (req.user) {
    util.redirect(res, "/home", { info: "You are already logged in!" });
    return;
  }

  const { username, password } = req.body;
  const hashedPassword = util.getHashedPassword(password);
  const query = { username: username, hashedPassword: hashedPassword };
  const db = dbo.getDb();

  const user = await db.collection("Users").findOne(query);
  // Check result and authenticate if necessary
  if (user) {
    const authToken = util.generateAuthToken();
    authTokenMap[authToken] = user;
    res.cookie("AuthToken", authToken, { maxAge: 3600000 });
    res.redirect("/home");
  } else {
    util.redirect(res, "/login", { error: "Invalid password!" });
  }
});

// Log out
authRouter.post("/logout", (req, res) => {
  if (req.user) {
    delete authTokenMap[req.authToken];
    res.clearCookie("AuthToken");
  }
  res.redirect("/login");
})

// Check to see if logged in
authRouter.post("/isLoggedIn", (req, res) => {
  res.send(req.user ? true : false)
})

module.exports = {
  router: authRouter,
  authTokenMap: authTokenMap
};