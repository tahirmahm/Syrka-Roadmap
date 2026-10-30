import { spawnSync } from "node:child_process";
const result = spawnSync(
  process.execPath,
  ["--import", "tsx", "scripts/verify-qwen-deployment.ts"],
  { stdio: "inherit", timeout: 60000 },
);
if (result.error || result.status !== 0)
  console.warn(
    "Optional Qwen deployment probe was unavailable; continuing the deterministic application build.",
  );
