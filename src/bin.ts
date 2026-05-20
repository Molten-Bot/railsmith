#!/usr/bin/env node
import process from "node:process";
import { runCli } from "./cli.js";

/* node:coverage disable */
process.stdout.on("error", exitCleanlyOnEpipe);
process.stderr.on("error", exitCleanlyOnEpipe);

function exitCleanlyOnEpipe(error: { code?: string }): void {
  if (error.code === "EPIPE") {
    process.exit(0);
  }

  throw error;
}
/* node:coverage enable */

process.exitCode = runCli();
