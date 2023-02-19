const express = require("express");
const { getHashedPassword } = require("../util");
const util = require("../util");
const authRouter = express.Router();
const dbo = require("../db/conn");

const authTokenMap = {};

// Create new Account
authRouter.post("/register", async (req, res) => {
  const { username, password } = req.body;
  const db = dbo.getDb();
  const usedUsername = await db.collection("Users").findOne({ username: username });

  if (usedUsername) {
    res.status(400).send("Username already exists!");
  } else {
    const newUser = {
      username: username,
      hashedPassword: util.getHashedPassword(password),
    };
    const doc = await db.collection("Users").insertOne(newUser);

    const authToken = util.generateAuthToken();
    authTokenMap[authToken] = {
      username: username,
      id: doc.insertedId.toJSON(),
    };
    res.cookie("AuthToken", authToken, { maxAge: 3600000 });

    res.send("Registered successfully!");
  }
});

// Log into Account
authRouter.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = util.getHashedPassword(password);
  const query = { username: username, hashedPassword: hashedPassword };
  const db = dbo.getDb();

  const user = await db.collection("Users").findOne(query, { username: 1, _id: 1 });

  // Check result and authenticate if necessary
  if (user) {
    const authToken = util.generateAuthToken();
    authTokenMap[authToken] = {
      username: user.username,
      id: user._id.toJSON(),
    };
    res.cookie("AuthToken", authToken, { maxAge: 3600000 });
    res.send("Logged in successfully!");
  } else {
    res.status(400).send("Invalid password!");
  }
});

// Log out
authRouter.post("/logout", (req, res) => {
  if (req.user) {
    delete authTokenMap[req.authToken];
    res.clearCookie("AuthToken");
  }
  res.status(200).send();
});

module.exports = {
  router: authRouter,
  authTokenMap: authTokenMap,
};
