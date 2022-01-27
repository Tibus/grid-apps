const fs = require("fs");
const { exec, spawn } = require("child_process");

function log(message, color = "\x1b[33m%s\x1b[0m") {
  console.log(color, ``);
  console.log(color, `***************************`);
  console.log(color, message);
  console.log(color, `***************************`);
  console.log("\x1b[0m");
}

async function execute(...command) {

  await new Promise((res) => {
    const { spawn } = require("child_process");
    command = command.join(" && ");
    log("run : "+ command, "\x1b[2m");

    const process = exec(command, () => {
      res();
    });

    process.stdout.on("data", function (data) {
      // console.log("\x1b[0m");
      console.log(data);
    });

    process.stderr.on("data", function (data) {
      // console.log("\x1b[31m");
      console.log(data);
      // console.log("\x1b[0m");
    });
  });
}

(async () => {
  const VERSION = require('../package.json').version;

  log("VERSION : "+VERSION, "\x1b[34m");

  await execute("npm install");
  await execute("git add --all");
  await execute("git diff-index --quiet HEAD || git commit -m \"Bump " + VERSION + "\"");
  await execute("git tag " + VERSION + "");
  await execute("git push");
  await execute("git push --tags");
  await execute("npm publish");

  log("UPDATE COMPLETED", "\x1b[34m");
})()