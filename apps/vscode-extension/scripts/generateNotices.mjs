/**
 * Writes THIRD-PARTY-NOTICES.txt from what the built extension ships: the code
 * in dist/*.js, read back from their source maps, and the fonts under
 * dist/fonts/. The rest is scripts/thirdPartyNotices.mjs at the repository root,
 * shared with jiscribe-mcp.
 *
 * Run `pnpm --filter jiscribe generate:notices` after a build; `--check` fails
 * instead of writing, which is what CI runs.
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { runThirdPartyNotices } from "../../../scripts/thirdPartyNotices.mjs";

const extensionDir = dirname(dirname(fileURLToPath(import.meta.url)));
const distDir = join(extensionDir, "dist");

runThirdPartyNotices({
	shippingDir: extensionDir,
	sourceMapPaths: [
		join(distDir, "webview.js.map"),
		join(distDir, "extension.js.map"),
	],
	buildCommand: "pnpm build:vscode",
	fontDirs: [join(distDir, "fonts")],
	intro: [
		"The Jiscribe extension bundles the following third-party software and",
		"assets — code compiled into the extension, the icon drawings generated into",
		"it, and the font files shipped alongside it. Their license texts are",
		"reproduced below. All of them are open source except the AWS Architecture",
		"Icons, the Microsoft Azure Architecture Icons, the Microsoft Entra",
		"architecture icons and the Google Cloud product icons, whose sections",
		"state the terms they are redistributed under.",
	],
	fontSectionLead: [
		"The font files under dist/fonts/ come from these packages, which repackage",
		"the families as published at https://github.com/google/fonts. Copyright",
		"notice of each, as it appears in the package's own LICENSE:",
	],
	lucideDestination: "the extension's own source",
});
