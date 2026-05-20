import { chmodSync } from "node:fs";

chmodSync("dist/bin.js", 0o755);
