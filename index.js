var encoding = require("./lib/encoding.js");

module.exports = {
  TextEncoder: encoding.TextEncoder,
  TextDecoder: encoding.TextDecoder,
  Indexes: require("./lib/encoding-indexes.js")
};
