/**
 * Writes THIRD-PARTY-NOTICES.txt from what the built extension actually ships.
 *
 * Three kinds of thing end up in the package, and each is found from the build
 * output rather than from a hand-kept list, so a dependency that comes, goes or
 * moves a version cannot slip past:
 *
 * - code compiled into dist/*.js — read back from the source maps, whose input
 *   paths carry the pnpm store's `<name>@<version>`
 * - the font files under dist/fonts/ — matched against the installed
 *   @fontsource packages by the name esbuild kept in front of its hash
 * - the Lucide icon drawings generated into the shape plugin's source, whose
 *   version the generated file states in its header
 *
 * Run `pnpm --filter jiscribe generate:notices` after a build; `--check` fails
 * instead of writing, which is what CI runs.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, parse } from "node:path";
import { fileURLToPath } from "node:url";

const extensionDir = dirname(dirname(fileURLToPath(import.meta.url)));
const repoRoot = dirname(dirname(extensionDir));

/**
 * The pnpm store sits at the workspace root, which is this repository when it
 * stands alone and the private repository when it is mounted there as a
 * submodule. Walk up rather than assuming either.
 */
const storeDir = (() => {
	for (let dir = repoRoot; dir !== parse(dir).root; dir = dirname(dir)) {
		const candidate = join(dir, "node_modules", ".pnpm");
		if (existsSync(candidate)) {
			return candidate;
		}
	}
	throw new Error(
		"no node_modules/.pnpm above the extension; run pnpm install",
	);
})();
const noticesPath = join(extensionDir, "THIRD-PARTY-NOTICES.txt");
const distDir = join(extensionDir, "dist");

const RULE = "-".repeat(70);

/** Bundles whose source maps name every third-party input the extension compiles in. */
const SOURCE_MAPS = ["webview.js.map", "extension.js.map"];

/**
 * Packages that are shipped but never appear as a source-map input, with a line
 * saying why they are listed at all.
 */
const NOTES = {
	lucide:
		"The drawing of every icon the `lucideIcon` shape can render is generated\n" +
		"from this package into the extension's own source\n" +
		"(plugins/lucide-icon-shape/src/schema/icon/iconData.generated.ts).\n",
};

/** Where the Lucide version is stated, as the header of the generated icon data. */
const ICON_DATA_PATH = join(
	repoRoot,
	"plugins",
	"lucide-icon-shape",
	"src",
	"schema",
	"icon",
	"iconData.generated.ts",
);

/**
 * Directory of one package inside the pnpm store.
 *
 * @param name - Package name as it is imported, scope included (`@emotion/react`)
 * @param version - Exact version; the store directory may carry peer-dependency
 *   suffixes after it, which are matched over
 * @returns Absolute path to the package root
 */
function packageDir(name, version) {
	const prefix = `${name.replace("/", "+")}@${version}`;
	const entry = readdirSync(storeDir).find(
		(one) => one === prefix || one.startsWith(`${prefix}_`),
	);
	if (!entry) {
		throw new Error(
			`${name}@${version} is not installed under node_modules/.pnpm`,
		);
	}
	return join(storeDir, entry, "node_modules", ...name.split("/"));
}

/**
 * License text a package ships. Every license-ish file is taken in name order,
 * so dompurify's dual license (Apache text plus LICENSE-MPL) comes out whole.
 *
 * @param dir - Package root, from {@link packageDir}
 * @returns The files' contents joined by a blank line, without leading or trailing ones
 */
function licenseText(dir) {
	const files = readdirSync(dir)
		.filter((one) => /^(license|licence|copying)/i.test(one))
		.sort();
	if (files.length === 0) {
		throw new Error(`no license file in ${dir}`);
	}
	return files
		.map((one) =>
			readFileSync(join(dir, one), "utf8").replace(/^\n+|\n+$/g, ""),
		)
		.join("\n\n");
}

/**
 * The `license` field a package declares. Reproduced as written, so an SPDX
 * expression keeps the parentheses it is written with.
 *
 * @param dir - Package root, from {@link packageDir}
 * @returns The declared license, e.g. `MIT` or `(MPL-2.0 OR Apache-2.0)`
 */
function declaredLicense(dir) {
	return JSON.parse(readFileSync(join(dir, "package.json"), "utf8")).license;
}

/** Every third-party package the source maps name, as `name -> version`. */
function bundledFromSourceMaps() {
	const bundled = new Map();
	for (const file of SOURCE_MAPS) {
		let map;
		try {
			map = JSON.parse(readFileSync(join(distDir, file), "utf8"));
		} catch {
			throw new Error(
				`dist/${file} is missing. Build the extension first (pnpm build:vscode).`,
			);
		}
		for (const source of map.sources ?? []) {
			// .pnpm/<name>@<version>[_<peer suffix>]/node_modules/<name>/...
			const hit = source.match(/\.pnpm\/((?:@[^/+]+\+)?[^@/]+)@([^_/]+)/);
			if (!hit) {
				continue;
			}
			const name = hit[1].startsWith("@") ? hit[1].replace("+", "/") : hit[1];
			bundled.set(name, hit[2]);
		}
	}
	if (bundled.size === 0) {
		throw new Error(
			"the source maps name no third-party input; the build output looks wrong",
		);
	}
	return bundled;
}

/**
 * The @fontsource packages that actually contributed a file to dist/fonts/.
 * esbuild keeps the original file name in front of its hash, and every
 * @fontsource file starts with its own package name.
 *
 * @returns Package names (`@fontsource/caveat`), in the order they sort
 */
function bundledFontPackages() {
	const emitted = readdirSync(join(distDir, "fonts"));
	const installed = readdirSync(storeDir)
		.filter((one) => one.startsWith("@fontsource+"))
		.map((one) => one.slice("@fontsource+".length).replace(/@[^@]*$/, ""));
	const used = [...new Set(installed)].filter((name) =>
		emitted.some((file) => file.startsWith(`${name}-`)),
	);
	return used.sort().map((name) => `@fontsource/${name}`);
}

/**
 * Version a package is installed at, read from its store directory name.
 *
 * @param name - Package name as it is imported, scope included
 * @returns The exact version, without any peer-dependency suffix
 */
function installedVersion(name) {
	const prefix = `${name.replace("/", "+")}@`;
	const entry = readdirSync(storeDir).find((one) => one.startsWith(prefix));
	if (!entry) {
		throw new Error(`${name} is not installed under node_modules/.pnpm`);
	}
	return entry.slice(prefix.length).split("_")[0];
}

/** The Lucide version the icon data was generated from. */
function lucideVersion() {
	const header = readFileSync(ICON_DATA_PATH, "utf8").slice(0, 200);
	const hit = header.match(/from lucide (\S+)/);
	if (!hit) {
		throw new Error(`${ICON_DATA_PATH} no longer states the lucide version`);
	}
	return hit[1];
}

/**
 * One section for all the fonts. Their license bodies are identical below the
 * copyright line, so the OFL is reproduced once and each font contributes only
 * its own notice; the identity is asserted rather than assumed.
 *
 * @param names - Package names from {@link bundledFontPackages}
 * @param version - Version they all share
 * @returns Section body, ready to place under the heading
 */
function fontSection(names, version) {
	const notices = [];
	const bodies = new Set();
	for (const name of names) {
		const text = readFileSync(
			join(packageDir(name, version), "LICENSE"),
			"utf8",
		);
		const [copyright, ...rest] = text.split("\n");
		notices.push([name, copyright.trim()]);
		bodies.add(rest.join("\n").replace(/^\n+|\n+$/g, ""));
	}
	if (bodies.size !== 1) {
		throw new Error(
			"the bundled fonts no longer share one license body; give each its own section",
		);
	}
	const lines = [
		"The font files under dist/fonts/ come from these packages, which repackage",
		"the families as published at https://github.com/google/fonts. Copyright",
		"notice of each, as it appears in the package's own LICENSE:",
		"",
	];
	for (const [name, copyright] of notices) {
		lines.push(`  ${name}`, `    ${copyright}`, "");
	}
	lines.push(
		"All of them carry the same license text, reproduced once here:",
		"",
	);
	return `${lines.join("\n")}${[...bodies][0]}`;
}

function generate() {
	const bundled = bundledFromSourceMaps();
	bundled.set("lucide", lucideVersion());

	const fontPackages = bundledFontPackages();
	// One version for all of them, so the heading can name it once. packageDir
	// throws below if any font is not on it.
	const fontVersion = installedVersion(fontPackages[0]);

	// Sorted by package name, not by `name@version`: the latter would put
	// react-dom before react.
	const sections = [...bundled]
		.map(([name, version]) => {
			const dir = packageDir(name, version);
			const note = NOTES[name] ? `${NOTES[name]}\n` : "";
			return {
				sortKey: name,
				heading: `${name}@${version} — ${declaredLicense(dir)}`,
				body: note + licenseText(dir),
			};
		})
		.concat({
			sortKey: "@fontsource/",
			heading: `@fontsource/* (${fontPackages.length} packages, all ${fontVersion}) — ${declaredLicense(packageDir(fontPackages[0], fontVersion))}`,
			body: fontSection(fontPackages, fontVersion),
		});

	const listed = [...bundled]
		.map(([name, version]) => ({
			sortKey: name,
			line: `${name}@${version} (${declaredLicense(packageDir(name, version))})`,
		}))
		.concat(
			fontPackages.map((name) => ({
				sortKey: name,
				line: `${name}@${fontVersion} (${declaredLicense(packageDir(name, fontVersion))})`,
			})),
		);

	const byName = (a, b) =>
		a.sortKey.toLowerCase().localeCompare(b.sortKey.toLowerCase());
	sections.sort(byName);
	listed.sort(byName);

	const out = [
		"THIRD-PARTY SOFTWARE NOTICES",
		"=".repeat(28),
		"",
		"The Jiscribe extension bundles the following third-party open-source",
		"packages — code compiled into the extension, the Lucide icon drawings",
		"generated into it, and the font files shipped alongside it. Their license",
		"texts are reproduced below.",
		"",
		"Package list:",
		...listed.map((one) => `  - ${one.line}`),
	];
	for (const section of sections) {
		out.push("", RULE, section.heading, RULE, "", section.body);
	}
	return `${out.join("\n")}\n`;
}

const generated = generate();

if (process.argv.includes("--check")) {
	if (readFileSync(noticesPath, "utf8") !== generated) {
		console.error(
			"❌ THIRD-PARTY-NOTICES.txt has drifted from what the build ships. Run pnpm generate:notices and commit the result.",
		);
		process.exit(1);
	}
	console.log("✅ THIRD-PARTY-NOTICES.txt matches what the build ships");
} else {
	writeFileSync(noticesPath, generated);
	console.log(
		`✅ wrote THIRD-PARTY-NOTICES.txt (${generated.split("\n").length} lines)`,
	);
}
