/**
 * Writes THIRD-PARTY-NOTICES.txt from what the built package ships: the server
 * bundle dist/index.mjs and the viewer inlined into dist/client/index.html,
 * each read back from its source map, and the fonts under dist/client/assets/
 * and dist/node_modules/@fontsource/. The rest is scripts/thirdPartyNotices.mjs
 * at the repository root, shared with the VSCode extension.
 *
 * Run `pnpm --filter jiscribe-mcp generate:notices` after a build; `--check`
 * fails instead of writing, which is what CI runs.
 */
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { runThirdPartyNotices } from "../../../scripts/thirdPartyNotices.mjs";

const mcpDir = dirname(dirname(fileURLToPath(import.meta.url)));
const distDir = join(mcpDir, "dist");

/** Where build.mjs moves the viewer's maps, out of the shipped dist/client/ */
const viewerSourcemapsDir = join(distDir, "viewer-sourcemaps");

const viewerSourcemaps = (() => {
	try {
		return readdirSync(viewerSourcemapsDir).map((one) =>
			join(viewerSourcemapsDir, one),
		);
	} catch {
		return [];
	}
})();

runThirdPartyNotices({
	shippingDir: mcpDir,
	sourceMapPaths: [
		join(distDir, "index.mjs.map"),
		// Named even when none was found, so the missing map is what gets reported
		...(viewerSourcemaps.length > 0
			? viewerSourcemaps
			: [join(viewerSourcemapsDir, "index.js.map")]),
	],
	buildCommand: "pnpm build:mcp",
	fontDirs: [
		join(distDir, "client", "assets"),
		join(distDir, "node_modules", "@fontsource"),
	],
	intro: [
		"The jiscribe-mcp package bundles the following third-party software and",
		"assets — code compiled into the server (dist/index.mjs) and into its viewer",
		"(dist/client/index.html), the icon drawings generated into them, and the",
		"font files shipped alongside them. Their license texts are reproduced",
		"below. All of them are open source except the AWS Architecture Icons, the",
		"Microsoft Azure Architecture Icons, the Microsoft Entra architecture icons",
		"and the Google Cloud product icons, whose sections state the terms they",
		"are redistributed under.",
	],
	fontSectionLead: [
		"The font files under dist/client/assets/ (the viewer's; the KaTeX_* ones",
		"there come with katex, under its own section) and",
		"dist/node_modules/@fontsource/ (the server's, for measuring text) come",
		"from these packages, which repackage the families as published at",
		"https://github.com/google/fonts. Copyright notice of each, as it appears",
		"in the package's own LICENSE:",
	],
	lucideDestination: "jiscribe-mcp's own source",
});
