const crypto = require('crypto');

module.exports = {

  // Wrapper function around res.redirect() to easily add query parameters to URL
  redirect: function(res, url, queryParams={}) {
    let finalUrl = url;
    let firstMessage = true;
    for (const key of Object.keys(queryParams)) {
      if (!firstMessage) finalUrl += '&';
      if (firstMessage) {
        finalUrl += '?';
        firstMessage = false;
      }
      finalUrl += `${key}=${encodeURIComponent(queryParams[key])}`;
    }
    res.redirect(finalUrl);
  },

  // Hash Password
  getHashedPassword: function(password) {
    const sha256 = crypto.createHash('sha256');
    const hash = sha256.update(password).digest('hex');
    return hash;
  },

  // Generate random authentication token
  generateAuthToken: function() {
    return crypto.randomBytes(30).toString('hex');
  }
}