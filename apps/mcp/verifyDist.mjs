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
	// The two guides read_drawing_guide hands back. Nothing else reads them, so
	// leaving them out ships a server whose only advice on how to draw is the
	// tool list
	"node_modules/@jiscribe/doc-schema/assets/canvas-prompt.md",
	"node_modules/@jiscribe/doc-schema/assets/authoring-json.md",
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
// it drops unknown families to a character-count estimate without erroring.
// Required is every @fontsource/* family the package actually declares, not
// just "staged something" — a partial staging degrades only the families left
// out, which this same silent-fallback behaviour would otherwise hide.
const { version, devDependencies } = JSON.parse(
	await readFile(join(packageDir, "package.json"), "utf8"),
);
const requiredFontFamilies = Object.keys(devDependencies ?? {})
	.filter((name) => name.startsWith("@fontsource/"))
	.map((name) => name.slice("@fontsource/".length));
const fontsDir = join(distDir, "node_modules", "@fontsource");
const stagedFamilies = await readdir(fontsDir).catch(() => []);
for (const family of requiredFontFamilies) {
	if (!stagedFamilies.includes(family)) {
		problems.push(
			`measurement font @fontsource/${family} not staged under dist/node_modules/@fontsource`,
		);
	}
}

// The viewer's own fonts (unicode-range split, left unbundled by build.mjs)
const clientAssetsDir = join(distDir, "client", "assets");
const clientAssetFiles = await readdir(clientAssetsDir).catch(() => []);
if (clientAssetFiles.length === 0) {
	problems.push("dist/client/assets is missing or empty (the viewer's fonts)");
}

// A build made before the version was bumped would ship the old number in the
// MCP handshake, which is what clients display. Matched loosely because a
// `--watch` build (unminified) writes `version: "x.y.z"` with a space after
// the colon, while a normal build's minifier collapses it to `version:"x.y.z"`
const escapedVersion = version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const versionPattern = new RegExp(`version\\s*:\\s*["']${escapedVersion}["']`);
const bundle = await readFile(join(distDir, "index.mjs"), "utf8").catch(
	() => "",
);
if (bundle !== "" && !versionPattern.test(bundle)) {
	problems.push(
		`dist/index.mjs does not announce version ${version} (looked for` +
			` version: "${version}" or version:"${version}") — rebuild after` +
			` bumping it (src/server.ts carries the same literal)`,
	);
}

// The third place the version is written. npm renders the top entry as this
// release's notes, and a bump that never reached the CHANGELOG ships a package
// whose newest entry describes the version before it
const changelog = await readFile(
	join(packageDir, "CHANGELOG.md"),
	"utf8",
).catch(() => "");
const topEntryVersion = changelog.match(/^## \[([^\]]+)\]/m)?.[1];
if (topEntryVersion !== version) {
	problems.push(
		`CHANGELOG.md's top entry is ${topEntryVersion ?? "absent"}, not ${version} — write this release's entry before publishing`,
	);
}

if (problems.length > 0) {
	console.error(
		[
			"jiscribe-mcp is not publishable:",
			...problems.map((problem) => `  - ${problem}`),
			"Anything wrong with dist/ is fixed by `pnpm --filter jiscribe-mcp build`",
			"from the repository root (never with the working directory inside engine/).",
		].join("\n"),
	);
	process.exit(1);
}

console.log(
	`dist/ verified: ${requiredFontFamilies.length} font families, version ${version}`,
);
