/**
 * Rewrite `src/daemon/assets.gen.ts` from the `nuxt generate` output
 * (`ui/.output/public`) — one `with { type: "file" }` import per built asset,
 * mapped by URL pathname. `bun build --compile` then embeds every imported file
 * into the executable (T-SPAE's chosen technique: explicit file imports, not
 * whole-directory embedding — see oven-sh/bun#5445).
 *
 * Run AFTER `nuxt generate` and BEFORE `bun build --compile`:
 *   bun run ui:generate && bun run gen:assets && bun run compile
 */
import { readdirSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = fileURLToPath(new URL("..", import.meta.url));
const publicDir = join(appRoot, "ui", ".output", "public");
const outFile = join(appRoot, "src", "daemon", "assets.gen.ts");

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(abs));
    else if (entry.isFile()) out.push(abs);
  }
  return out;
}

let files: string[];
try {
  files = walk(publicDir);
} catch {
  console.error(`gen-assets: no build at ${publicDir} — run \`bun run ui:generate\` first`);
  process.exit(2);
}

const imports: string[] = [];
const entries: string[] = [];
files.forEach((abs, i) => {
  const rel = relative(publicDir, abs).split("\\").join("/");
  const pathname = `/${rel}`;
  imports.push(`import a${i} from "../../ui/.output/public/${rel}" with { type: "file" };`);
  entries.push(`  ${JSON.stringify(pathname)}: a${i},`);
});

const banner = `/**
 * GENERATED FILE — (re)written by \`scripts/gen-assets.ts\` after \`nuxt generate\`.
 * ${files.length} asset(s) from ui/.output/public. Do not edit by hand.
 */
// @ts-nocheck — \`with { type: "file" }\` imports resolve to embedded-path strings
// under bun (verified at runtime); tsc has no type story for import attributes.`;

writeFileSync(
  outFile,
  `${banner}\n${imports.join("\n")}\n\nexport const assets: Record<string, string> = {\n${entries.join("\n")}\n};\n`,
  "utf8",
);
console.log(
  `gen-assets: embedded manifest for ${files.length} asset(s) → ${relative(process.cwd(), outFile)}`,
);
