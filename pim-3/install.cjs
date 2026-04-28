#!/usr/bin/env node

const { spawn } = require("child_process");
const path = require("path");

const cwd = process.cwd();

console.log("Starting npm install...");
console.log("Working directory:", cwd);

const proc = spawn("npm", ["install"], {
  cwd: cwd,
  stdio: "inherit",
  shell: true,
});

proc.on("exit", (code) => {
  console.log("\nInstall process exited with code:", code);
  process.exit(code);
});

proc.on("error", (err) => {
  console.error("Error starting install:", err);
  process.exit(1);
});
