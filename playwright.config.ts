import { defineConfig, devices } from "@playwright/test";
import { spawnSync } from "node:child_process";

/** A free port, found once in the main process; workers inherit it through the environment. */
function freePort(): string {
  const r = spawnSync(
    process.execPath,
    ["-e", "const s=require('net').createServer();s.listen(0,'127.0.0.1',()=>{console.log(s.address().port);s.close()})"],
    { encoding: "utf8" },
  );
  const port = r.stdout.trim();
  if (r.status !== 0 || !/^\d+$/.test(port)) throw new Error(`no free port: ${r.stderr}`);
  return port;
}

const port = (process.env.TC2_E2E_PORT ??= freePort());
const baseURL = `http://127.0.0.1:${port}`;

const sizes = [
  { name: "phone", viewport: { width: 360, height: 640 } },
  { name: "desktop", viewport: { width: 1920, height: 1080 } },
] as const;
const engines = [
  { name: "chromium", device: devices["Desktop Chrome"] },
  { name: "firefox", device: devices["Desktop Firefox"] },
  { name: "webkit", device: devices["Desktop Safari"] },
] as const;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  fullyParallel: true,
  reporter: [["list"]],
  use: { baseURL },
  projects: engines.flatMap((e) =>
    sizes.map((s) => ({
      name: `${e.name}-${s.name}`,
      use: { ...e.device, viewport: s.viewport, deviceScaleFactor: 1 },
    })),
  ),
  // The test build (acceptance.md, Test build), served at the root and under /transmission-control-2/ as GitHub Pages serves it.
  webServer: {
    command: "bun scripts/build.ts --test && bun scripts/serve.ts --test",
    url: `${baseURL}/sandbox.html`,
    env: { PORT: port },
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
