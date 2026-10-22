#!/usr/bin/env node
import { main } from "../src/cli.js";

main().catch((error) => {
  console.error(`\nskillcrate: ${error.message}`);
  process.exitCode = error.exitCode ?? 1;
});
