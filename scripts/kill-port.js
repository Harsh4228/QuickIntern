// Frees port 3000 before `npm run dev` starts.
// Called automatically via the "predev" npm script.
const { execSync } = require("child_process");
const PORT = process.env.PORT || 3000;

try {
  if (process.platform === "win32") {
    const out = execSync(`netstat -ano | findstr :${PORT}`, { encoding: "utf8" });
    const pids = new Set();
    out.trim().split("\n").forEach((line) => {
      const parts = line.trim().split(/\s+/);
      // Only LISTENING or ESTABLISHED lines with a PID in the last column
      if (parts.length >= 5) pids.add(parts[parts.length - 1]);
    });
    pids.forEach((pid) => {
      try {
        execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
        console.log(`Killed process PID ${pid} on port ${PORT}`);
      } catch {
        // PID may have already exited
      }
    });
  } else {
    // macOS / Linux
    execSync(`lsof -t -i:${PORT} | xargs -r kill -9`, { stdio: "ignore" });
  }
} catch {
  // netstat found nothing — port is free, carry on
}

console.log(`Port ${PORT} is ready.`);
