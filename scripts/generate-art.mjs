import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const palettes = [
  ["#13072d", "#8a46ce", "#e3a2fd", "#ff8bcb"],
  ["#061d33", "#1a78aa", "#8ce4e5", "#f4dbb8"],
  ["#1d0a35", "#633acc", "#e159a9", "#f6bc73"],
  ["#081d30", "#1688a1", "#86ebe4", "#eaaefa"],
  ["#210c27", "#b12d87", "#ff7f98", "#ffc785"],
  ["#0b153b", "#5160ba", "#b49aff", "#f5d9c9"],
  ["#0d1c35", "#5865a0", "#a8b7ec", "#f4c7ec"],
  ["#1c1035", "#a44b9c", "#df88be", "#edd8a3"],
  ["#362010", "#c36e49", "#e6b270", "#f3e0b9"],
  ["#152643", "#357c91", "#93cfbd", "#e2caa0"],
  ["#1a0a30", "#7457b5", "#e5a3d2", "#ebd39f"],
  ["#08152d", "#2b679a", "#72c4d3", "#b78bda"],
];
mkdirSync("public/art", { recursive: true });
for (let i = 0; i < palettes.length; i++) {
  const [dark, base, light, accent] = palettes[i];
  const angle = i * 23;
  const orbX = 390 + ((i * 73) % 280),
    orbY = 280 + ((i * 97) % 230);
  const rings = Array.from(
    { length: 6 },
    (_, j) =>
      `<ellipse cx="${orbX}" cy="${orbY}" rx="${160 + j * 41}" ry="${65 + j * 29}" fill="none" stroke="${j % 2 ? accent : light}" stroke-opacity="${0.45 - j * 0.05}" stroke-width="${j < 2 ? 5 : 2}" transform="rotate(${angle + j * 17} ${orbX} ${orbY})"/>`,
  ).join("");
  const stars = Array.from({ length: 35 }, (_, j) => {
    const x = (j * 187 + i * 83) % 800,
      y = (j * 223 + i * 137) % 800,
      r = j % 7 === 0 ? 2.4 : 0.8;
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity="${0.28 + (j % 5) * 0.11}"/>`;
  }).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800"><defs><radialGradient id="bg" cx="64%" cy="38%" r="75%"><stop stop-color="${base}"/><stop offset=".55" stop-color="${dark}"/><stop offset="1" stop-color="#080915"/></radialGradient><radialGradient id="orb" cx="28%" cy="24%" r="75%"><stop stop-color="#fff"/><stop offset=".18" stop-color="${light}"/><stop offset=".55" stop-color="${base}"/><stop offset="1" stop-color="${dark}"/></radialGradient><filter id="blur"><feGaussianBlur stdDeviation="45"/></filter><filter id="shadow"><feGaussianBlur stdDeviation="18"/></filter><linearGradient id="ribbon" x1="0" x2="1" y1="0" y2="1"><stop stop-color="${accent}" stop-opacity=".9"/><stop offset="1" stop-color="${light}" stop-opacity=".1"/></linearGradient></defs><rect width="800" height="800" fill="url(#bg)"/><ellipse cx="${orbX + 40}" cy="${orbY + 80}" rx="260" ry="210" fill="${accent}" opacity=".32" filter="url(#blur)"/>${stars}<g opacity=".75">${rings}</g><path d="M-110 600 C180 ${380 + angle} 470 ${770 - angle} 900 280" fill="none" stroke="url(#ribbon)" stroke-width="${70 + i * 3}" opacity=".5" filter="url(#blur)"/><circle cx="${orbX + 12}" cy="${orbY + 20}" r="${170 + (i % 4) * 10}" fill="#000" opacity=".5" filter="url(#shadow)"/><circle cx="${orbX}" cy="${orbY}" r="${170 + (i % 4) * 10}" fill="url(#orb)"/><ellipse cx="${orbX - 25}" cy="${orbY - 35}" rx="95" ry="45" fill="#fff" opacity=".12" transform="rotate(-30 ${orbX - 25} ${orbY - 35})"/><path d="M-50 710 Q280 465 815 455" fill="none" stroke="${accent}" stroke-opacity=".4" stroke-width="3"/><path d="M-50 735 Q280 490 815 480" fill="none" stroke="${light}" stroke-opacity=".18" stroke-width="2"/><text x="46" y="752" font-family="Georgia,serif" font-size="21" letter-spacing="7" fill="#fff" opacity=".65">NEXUS / ${String(i + 1).padStart(2, "0")}</text></svg>`;
  writeFileSync(join("public/art", `nft-${i + 1}.svg`), svg);
}
