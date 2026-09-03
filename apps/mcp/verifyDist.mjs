// Publish guard for jiscribe-mcp.
// `dist/` is gitignored and no build runs on publish, so `npm publish` would
// otherwise succeed on a stale or absent build and ship a package that installs
// but cannot answer. This makes that fail loudly instead.
//   node verifyDist.mjs

import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const packageDir = dirname(fileURLToPath(import.meta.url));
const distDir = join(packageDir, "dist");

/** Files without which the shipped server is silently degraded or dead on arrival */
const REQUIRED_FILES = [
	"index.mjs",
	"client/index.html",
	"node_modules/@jiscribe/doc-schema/assets/jiscribe.schema.json",
];

const problems = [];

for (const relativePath of REQUIRED_FILES) {
	try {
		await stat(join(distDir, relativePath));
	} catch {
		problems.push(`missing dist/${relativePath}`);
	}
}

// The measurement fonts are the one missing piece doc-tools does not report:
// it drops unknown families to a character-count estimate without erroring
const fontsDir = join(distDir, "node_modules", "@fontsource");
const stagedFamilies = await readdir(fontsDir).catch(() => []);
if (stagedFamilies.length === 0) {
	problems.push(
		"no measurement fonts staged under dist/node_modules/@fontsource",
	);
}

// A build made before the version was bumped would ship the old number in the
// MCP handshake, which is what clients display
const { version } = JSON.parse(
	await readFile(join(packageDir, "package.json"), "utf8"),
);
const bundle = await readFile(join(distDir, "index.mjs"), "utf8").catch(
	() => "",
);
if (bundle !== "" && !bundle.includes(`version:"${version}"`)) {
	problems.push(
		`dist/index.mjs does not announce version ${version} — rebuild after bumping it (src/server.ts carries the same literal)`,
	);
}

if (problems.length > 0) {
	console.error(
		[
			"dist/ is not publishable. Run `pnpm --filter jiscribe-mcp build` from the",
			"repository root (never with the working directory inside engine/).",
			...problems.map((problem) => `  - ${problem}`),
		].join("\n"),
	);
	process.exit(1);
}

console.log(
	`dist/ verified: ${stagedFamilies.length} font families, version ${version}`,
);
