const moment = require("moment");
const chalk = require("chalk");

exports.log = (message, level = "info") => {
  let m = `[${moment().format("YYYY-MM-DD HH:mm:ss")}] ${message}`;
  if (level == "error") {
    console.log(chalk.redBright(m));
  } else {
    console.log(chalk.blackBright(m));
  }
};
