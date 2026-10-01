const BaseEnvironment = require("@jest/environment-jsdom-abstract").default;
const jsdom = require("jsdom");

module.exports = class extends BaseEnvironment {
  constructor(config, context) {
    super(config, context, jsdom);
  }
};
