/**
 * CommonJS test double for the ESM-only `stemmer` package.
 *
 * The `stemmer` package ships as ESM only, which Jest's default CJS runtime
 * cannot require. search.js calls it as a word -> stem function, so this
 * double delegates to natural's Porter stemmer to keep the same semantics.
 */

const natural = require('natural');

module.exports = function stemmer(word) {
  return natural.PorterStemmer.stem(String(word));
};
