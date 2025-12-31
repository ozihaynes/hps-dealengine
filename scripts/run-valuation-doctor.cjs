const { spawnSync } = require("node:child_process");
const path = require("node:path");

function canRun(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: "ignore" });
  return r.status === 0;
}

function pickPwsh() {
  // Prefer pwsh everywhere; fall back to Windows PowerShell if needed.
  const candidates = process.platform === "win32"
    ? ["pwsh", "powershell"]
    : ["pwsh"];

  for (const c of candidates) {
    // --version is supported by pwsh; Windows PowerShell may not support --version consistently,
    // so we test with a minimal -Command instead.
    const ok = (c === "pwsh")
      ? canRun(c, ["--version"])
      : canRun(c, ["-NoLogo", "-NoProfile", "-Command", "$PSVersionTable.PSVersion.Major"]);

    if (ok) return c;
  }
  return null;
}

const exe = pickPwsh();
if (!exe) {
  console.error("FAIL: PowerShell not found. Install PowerShell 7 (pwsh) or ensure Windows PowerShell (powershell) is available.");
  process.exit(1);
}

const ps1Path = path.resolve(__dirname, "doctor-valuation-spine.ps1");

const args = (exe === "pwsh")
  ? ["-NoLogo", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", ps1Path]
  : ["-NoLogo", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", ps1Path];

const res = spawnSync(exe, args, { stdio: "inherit" });
process.exit(res.status ?? 1);
