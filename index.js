#!/usr/bin/env node

const program = require("commander");
const appInfo = require("./package.json");

program.allowUnknownOption();
program.version(appInfo.version);

program.parse(process.argv);