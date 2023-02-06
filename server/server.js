const express = require("express");
const app = express();

// Bring in environment variables
require("dotenv").config({ path: "./config.env" });

// Allow sending JSON, reading request body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Read Cookies
const cookieParser = require("cookie-parser");
app.use(cookieParser());

// Get routers
const auth = require("./routes/auth");
const user = require("./routes/user");
const course = require("./routes/courses");

// Add Auth Status
app.use((req, res, next) => {
  const authToken = req.cookies["AuthToken"];
  req.user = auth.authTokenMap[authToken];
  req.authToken = authToken;
  next();
});

// Log
app.use((req, res, next) => {
  if (req.originalUrl.startsWith("/api"))
    console.log(req.originalUrl, req.body);
  next();
});

// Use Routers
app.use("/api/auth", auth.router);
app.use("/api/user", user.router);
app.use("/api/courses", course.router);

// Default to React App for other routing
const path = require("path");
app.use(express.static("../client/build"));
app.get("*", (req, res) =>
  res.sendFile(path.resolve("..", "client", "build", "index.html"))
);

// Get connection to MongoDB Database
const dbo = require("./db/conn");

// Connect to database before listening for incoming requests
const port = process.env.PORT || 5000;
app.listen(port, () => {
  dbo.connectToServer((err) => {
    if (err) console.error(err);
  });
  console.log(`Server is running on port: ${port}`);
});
