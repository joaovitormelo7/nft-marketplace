import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

const pages = ["/", "/nft/nft-1"];
const profiles = ["mobile", "desktop"];
mkdirSync("reports/lighthouse", { recursive: true });
const rows = [];
for (const profile of profiles)
  for (const page of pages)
    for (let run = 1; run <= 3; run++) {
      const label = `${profile}-${page === "/" ? "home" : "detail"}-${run}`;
      const args = [
        "lighthouse",
        `http://127.0.0.1:4173${page}`,
        "--chrome-flags=--headless --no-sandbox",
        "--output=html",
        "--output=json",
        `--output-path=reports/lighthouse/${label}`,
        "--only-categories=performance,accessibility,best-practices,seo",
        "--quiet",
      ];
      if (profile === "desktop") args.push("--preset=desktop");
      await new Promise((resolve, reject) => {
        const proc = spawn("npx", args, { shell: true, stdio: "inherit" });
        proc.on("exit", (code) =>
          code === 0
            ? resolve()
            : reject(new Error(`Lighthouse ${label} exited ${code}`)),
        );
      });
      rows.push(label);
    }
writeFileSync(
  "reports/lighthouse/runs.json",
  JSON.stringify(
    {
      runs: rows,
      note: "Execute npm run build e npm run preview antes desta auditoria.",
    },
    null,
    2,
  ),
);
