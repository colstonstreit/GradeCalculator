const crypto = require("crypto");

module.exports = {
  // Hash Password
  getHashedPassword: function (password) {
    const sha256 = crypto.createHash("sha256");
    const hash = sha256.update(password).digest("hex");
    return hash;
  },

  // Generate random authentication token
  generateAuthToken: function () {
    return crypto.randomBytes(30).toString("hex");
  },
};
