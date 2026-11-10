/**
 * Writes a shipped package's THIRD-PARTY-NOTICES.txt from what its build
 * actually ships. The VSCode extension and jiscribe-mcp each call
 * {@link runThirdPartyNotices} from their own scripts/generateNotices.mjs,
 * naming their build outputs.
 *
 * Four kinds of thing end up in a package, and each is found from the build
 * output rather than from a hand-kept list, so a dependency that comes, goes or
 * moves a version cannot slip past:
 *
 * - bundled code — read back from the source maps, whose input paths carry the
 *   pnpm store's `<name>@<version>`
 * - the font files — matched against the installed @fontsource packages by the
 *   name the bundler kept in front of its hash
 * - the Lucide icon drawings generated into the shape plugin's source, whose
 *   version the generated file states in its header
 * - the AWS and the Azure Architecture Icons and the Google Cloud product
 *   icons generated into their shape plugins' source (the Azure plugin's
 *   carrying Microsoft Entra ID from the Entra icon package too), each listed
 *   only when the source maps name its generated drawing module (the catalog
 *   of names alone ships no icon). They are not open source, so each section
 *   reproduces its plugin's LICENSE-ICONS.md instead of a package's license
 *   file
 *
 * `--check` on the command line fails instead of writing, which is what CI runs.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, dirname, join, parse, relative } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

const RULE = "-".repeat(70);

/**
 * Packages that are shipped but never appear as a source-map input, with a line
 * saying why they are listed at all.
 *
 * @param ownSource - Whose source the drawings are generated into, as a noun
 *   phrase that fits "into ___" on a line of its own
 */
function notesFor(ownSource) {
	return {
		lucide:
			"The drawing of every icon the `lucideIcon` shape can render is generated\n" +
			`from this package into ${ownSource}\n` +
			"(plugins/lucide-icon-shape/src/schema/icon/iconData.generated.ts).\n" +
			"The category names and which icons each holds come from the Lucide\n" +
			"GitHub repository at the tag of the same version, generated into\n" +
			"plugins/lucide-icon-shape/src/schema/icon/iconCategories.generated.ts.\n",
	};
}

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

/** The generated AWS icon drawings, relative to the repository root. */
const AWS_ICON_DRAWINGS_RELATIVE_PATH = [
	"plugins",
	"aws-shapes",
	"src",
	"drawing",
	"iconDrawings.generated.ts",
];

/** Where the AWS release date is stated, as the header of the generated icon catalog. */
const AWS_ICON_CATALOG_PATH = join(
	repoRoot,
	"plugins",
	"aws-shapes",
	"src",
	"schema",
	"icon",
	"iconCatalog.generated.ts",
);

/** The terms the AWS icons are redistributed under, kept next to the data. */
const AWS_ICON_LICENSE_PATH = join(
	repoRoot,
	"plugins",
	"aws-shapes",
	"LICENSE-ICONS.md",
);

/** The generated Azure icon drawings, relative to the repository root. */
const AZURE_ICON_DRAWINGS_RELATIVE_PATH = [
	"plugins",
	"azure-shapes",
	"src",
	"drawing",
	"iconDrawings.generated.ts",
];

/** Where the Azure and Entra releases are stated, as the header of the generated icon catalog. */
const AZURE_ICON_CATALOG_PATH = join(
	repoRoot,
	"plugins",
	"azure-shapes",
	"src",
	"schema",
	"icon",
	"iconCatalog.generated.ts",
);

/** The terms the Azure icons are redistributed under, kept next to the data. */
const AZURE_ICON_LICENSE_PATH = join(
	repoRoot,
	"plugins",
	"azure-shapes",
	"LICENSE-ICONS.md",
);

/** The generated Google Cloud icon drawings, relative to the repository root. */
const GCP_ICON_DRAWINGS_RELATIVE_PATH = [
	"plugins",
	"gcp-shapes",
	"src",
	"drawing",
	"iconDrawings.generated.ts",
];

/** Where the Google Cloud release is stated, as the header of the generated icon catalog. */
const GCP_ICON_CATALOG_PATH = join(
	repoRoot,
	"plugins",
	"gcp-shapes",
	"src",
	"schema",
	"icon",
	"iconCatalog.generated.ts",
);

/** The conditions the Google Cloud icons are redistributed on, kept next to the data. */
const GCP_ICON_LICENSE_PATH = join(
	repoRoot,
	"plugins",
	"gcp-shapes",
	"LICENSE-ICONS.md",
);

/**
 * The pnpm store of the workspace that installed the tree, refusing to go on
 * when that is not this repository.
 *
 * That is this repository when it stands alone, and the private repository when
 * this one is mounted there as a submodule — the two resolve the same
 * dependency ranges to different versions, so which one is in play decides what
 * the notices would say. They describe the release build, which is made from
 * this repository on its own lockfile, and CI checks them there; under an outer
 * workspace this would quietly write a file naming that workspace's versions,
 * which the check would then reject.
 *
 * @returns Absolute path to `node_modules/.pnpm` at the repository root; exits
 *   the process when the tree is installed by an outer workspace
 */
function resolveStoreDir() {
	let storeRoot;
	for (let dir = repoRoot; dir !== parse(dir).root; dir = dirname(dir)) {
		if (existsSync(join(dir, "node_modules", ".pnpm"))) {
			storeRoot = dir;
			break;
		}
	}
	if (storeRoot === undefined) {
		throw new Error(
			"no node_modules/.pnpm above the repository; run pnpm install",
		);
	}
	if (storeRoot !== repoRoot) {
		console.error(
			`❌ this tree is installed by the workspace at ${storeRoot}, not by ${repoRoot}.\n` +
				"   The notices name the versions of the release build, which resolves from\n" +
				"   this repository's own lockfile. Run this in a standalone clone or worktree\n" +
				"   of the engine repository (pnpm install there first).",
		);
		process.exit(1);
	}
	return join(storeRoot, "node_modules", ".pnpm");
}

/**
 * Directory of one package inside the pnpm store.
 *
 * @param storeDir - From {@link resolveStoreDir}
 * @param name - Package name as it is imported, scope included (`@emotion/react`)
 * @param version - Exact version; the store directory may carry peer-dependency
 *   suffixes after it, which are matched over
 * @returns Absolute path to the package root
 */
function packageDir(storeDir, name, version) {
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
 * The MIT License's terms as this repository's own LICENSE words them, from
 * "Permission is hereby granted" on: its title and copyright line are ours.
 */
function mitPermissionText() {
	const text = readFileSync(join(repoRoot, "LICENSE"), "utf8");
	const start = text.indexOf("Permission is hereby granted");
	if (start === -1) {
		throw new Error("the repository's LICENSE is no longer the MIT License");
	}
	return text.slice(start).replace(/\n+$/, "");
}

/**
 * Stands in for the license file of a package that declares MIT but ships none
 * (fontkit and its own dependencies brotli and dfa): its declared author, then
 * the MIT terms. Any other license declared without a file still throws, since
 * its text cannot be supplied from here.
 *
 * @param dir - Package root, from {@link packageDir}
 */
function declaredMitText(dir) {
	const manifest = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
	const author =
		typeof manifest.author === "object" && manifest.author !== null
			? [
					manifest.author.name,
					manifest.author.email && `<${manifest.author.email}>`,
				]
					.filter(Boolean)
					.join(" ")
			: manifest.author;
	if (manifest.license !== "MIT" || !author) {
		throw new Error(`no license file in ${dir}`);
	}
	return [
		"This package ships no license file. Its package.json declares the MIT",
		"license and names as its author:",
		"",
		`  ${author}`,
		"",
		"The MIT License terms follow.",
		"",
		mitPermissionText(),
	].join("\n");
}

/**
 * License text a package ships. Every license-ish file is taken in name order,
 * so dompurify's dual license (Apache text plus LICENSE-MPL) comes out whole.
 * A package with none is handled by {@link declaredMitText}.
 *
 * @param dir - Package root, from {@link packageDir}
 * @returns The files' contents joined by a blank line, without leading or trailing ones
 */
function licenseText(dir) {
	const files = readdirSync(dir)
		.filter((one) => /^(license|licence|copying)/i.test(one))
		.sort();
	if (files.length === 0) {
		return declaredMitText(dir);
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

/**
 * Every input path the source maps name, across all bundles.
 *
 * @param sourceMapPaths - Absolute paths of the maps
 * @param shippingDir - The shipped package's directory, for the error message
 * @param buildCommand - What builds the maps, named when one is missing
 */
function sourceMapInputs(sourceMapPaths, shippingDir, buildCommand) {
	const inputs = [];
	for (const path of sourceMapPaths) {
		let map;
		try {
			map = JSON.parse(readFileSync(path, "utf8"));
		} catch {
			throw new Error(
				`${relative(shippingDir, path)} is missing. Build first (${buildCommand}).`,
			);
		}
		inputs.push(...(map.sources ?? []));
	}
	return inputs;
}

/**
 * Every third-party package the source maps name, as `name -> version`.
 *
 * @param inputs - Source map inputs, from {@link sourceMapInputs}
 */
function bundledFromSourceMaps(inputs) {
	const bundled = new Map();
	for (const source of inputs) {
		// .pnpm/<name>@<version>[_<peer suffix>]/node_modules/<name>/...
		const hit = source.match(/\.pnpm\/((?:@[^/+]+\+)?[^@/]+)@([^_/]+)/);
		if (!hit) {
			continue;
		}
		const name = hit[1].startsWith("@") ? hit[1].replace("+", "/") : hit[1];
		bundled.set(name, hit[2]);
	}
	if (bundled.size === 0) {
		throw new Error(
			"the source maps name no third-party input; the build output looks wrong",
		);
	}
	return bundled;
}

/**
 * Whether an icon set's drawings are compiled in. Only the drawing module
 * carries the icon owner's work; the catalog of names alone needs no
 * attribution. Source map inputs are relative to the map, so the generated file
 * is matched by its path under the repository, not by an absolute one.
 *
 * @param inputs - Source map inputs, from {@link sourceMapInputs}
 * @param drawingsRelativePath - The generated drawing module, as path segments
 *   from the repository root
 */
function shipsIconDrawings(inputs, drawingsRelativePath) {
	const suffix = `/${drawingsRelativePath.join("/")}`;
	return inputs.some((source) => source.endsWith(suffix));
}

/**
 * The @fontsource packages that actually contributed a shipped font file. The
 * bundler keeps the original file name in front of its hash, and every
 * @fontsource file starts with its own package name.
 *
 * @param storeDir - From {@link resolveStoreDir}
 * @param fontDirs - Absolute directories the fonts are shipped in, searched
 *   recursively; only file names are compared, so a directory named after a
 *   package does not count by itself
 * @returns Package names (`@fontsource/caveat`), in the order they sort
 */
function bundledFontPackages(storeDir, fontDirs) {
	const emitted = fontDirs.flatMap((dir) =>
		readdirSync(dir, { recursive: true }).map((one) => basename(one)),
	);
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
 * @param storeDir - From {@link resolveStoreDir}
 * @param name - Package name as it is imported, scope included
 * @returns The exact version, without any peer-dependency suffix
 */
function installedVersion(storeDir, name) {
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
 * The AWS Architecture Icons release the icons were generated from, as an ISO
 * date. The catalog's header states it the way AWS names the asset package,
 * MMDDYYYY.
 */
function awsIconsRelease() {
	const header = readFileSync(AWS_ICON_CATALOG_PATH, "utf8").slice(0, 200);
	const hit = header.match(/asset package \((\d{2})(\d{2})(\d{4})\)/);
	if (!hit) {
		throw new Error(
			`${AWS_ICON_CATALOG_PATH} no longer states the asset package release`,
		);
	}
	const [, month, day, year] = hit;
	return `${year}-${month}-${day}`;
}

/**
 * The releases the Azure plugin's icons were generated from, as the catalog's
 * header states them within its first 400 characters: the Azure package's
 * version and month (`V24, 2026-07`), and the Entra package's month
 * (`Oct 2023`).
 */
function azureIconsReleases() {
	const header = readFileSync(AZURE_ICON_CATALOG_PATH, "utf8").slice(0, 400);
	const azure = header.match(/asset package \((V\d+, \d{4}-\d{2})\)/);
	const entra = header.match(
		/Microsoft Entra architecture icons \(([A-Z][a-z]{2} \d{4})\)/,
	);
	if (!azure || !entra) {
		throw new Error(
			`${AZURE_ICON_CATALOG_PATH} no longer states the Azure and Entra releases`,
		);
	}
	return { azure: azure[1], entra: entra[1] };
}

/**
 * The Google Cloud product icons' release, as the catalog's header states it
 * within its first 400 characters: the month of Google's icon overview
 * (`May 2026`), the zips carrying none.
 */
function gcpIconsRelease() {
	const header = readFileSync(GCP_ICON_CATALOG_PATH, "utf8").slice(0, 400);
	const hit = header.match(
		/Google Cloud product icons \(([A-Z][a-z]+ \d{4})\)/,
	);
	if (!hit) {
		throw new Error(
			`${GCP_ICON_CATALOG_PATH} no longer states the Google Cloud icons release`,
		);
	}
	return hit[1];
}

/**
 * An icon set's section: its plugin's LICENSE-ICONS.md reproduced whole, minus
 * its title, which the section heading replaces.
 *
 * @param licensePath - The plugin's LICENSE-ICONS.md
 */
function iconTermsSection(licensePath) {
	const text = readFileSync(licensePath, "utf8");
	return text.replace(/^# [^\n]*\n+/, "").replace(/\n+$/, "");
}

/**
 * One section for all the fonts. Their license bodies are identical below the
 * copyright line, so the OFL is reproduced once and each font contributes only
 * its own notice; the identity is asserted rather than assumed.
 *
 * @param storeDir - From {@link resolveStoreDir}
 * @param names - Package names from {@link bundledFontPackages}
 * @param version - Version they all share
 * @param lead - The section's opening lines, saying where the font files are
 * @returns Section body, ready to place under the heading
 */
function fontSection(storeDir, names, version, lead) {
	const notices = [];
	const bodies = new Set();
	for (const name of names) {
		const text = readFileSync(
			join(packageDir(storeDir, name, version), "LICENSE"),
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
	const lines = [...lead, ""];
	for (const [name, copyright] of notices) {
		lines.push(`  ${name}`, `    ${copyright}`, "");
	}
	lines.push(
		"All of them carry the same license text, reproduced once here:",
		"",
	);
	return `${lines.join("\n")}${[...bodies][0]}`;
}

/**
 * The whole notices file for one shipped package.
 *
 * @param storeDir - From {@link resolveStoreDir}
 * @param options - As passed to {@link runThirdPartyNotices}
 */
function generate(storeDir, options) {
	const inputs = sourceMapInputs(
		options.sourceMapPaths,
		options.shippingDir,
		options.buildCommand,
	);
	const bundled = bundledFromSourceMaps(inputs);
	bundled.set("lucide", lucideVersion());
	const notes = notesFor(options.lucideDestination);
	const awsIcons = shipsIconDrawings(inputs, AWS_ICON_DRAWINGS_RELATIVE_PATH);
	const azureIcons = shipsIconDrawings(
		inputs,
		AZURE_ICON_DRAWINGS_RELATIVE_PATH,
	);
	const gcpIcons = shipsIconDrawings(inputs, GCP_ICON_DRAWINGS_RELATIVE_PATH);

	const fontPackages = bundledFontPackages(storeDir, options.fontDirs);
	// One version for all of them, so the heading can name it once. packageDir
	// throws below if any font is not on it.
	const fontVersion = installedVersion(storeDir, fontPackages[0]);

	// Sorted by package name, not by `name@version`: the latter would put
	// react-dom before react.
	const sections = [...bundled]
		.map(([name, version]) => {
			const dir = packageDir(storeDir, name, version);
			const note = notes[name] ? `${notes[name]}\n` : "";
			return {
				sortKey: name,
				heading: `${name}@${version} — ${declaredLicense(dir)}`,
				body: note + licenseText(dir),
			};
		})
		.concat({
			sortKey: "@fontsource/",
			heading: `@fontsource/* (${fontPackages.length} packages, all ${fontVersion}) — ${declaredLicense(packageDir(storeDir, fontPackages[0], fontVersion))}`,
			body: fontSection(
				storeDir,
				fontPackages,
				fontVersion,
				options.fontSectionLead,
			),
		})
		.concat(
			awsIcons
				? {
						sortKey: "aws architecture icons",
						heading: `AWS Architecture Icons (release ${awsIconsRelease()}) — AWS terms, not open source`,
						body: iconTermsSection(AWS_ICON_LICENSE_PATH),
					}
				: [],
		)
		.concat(
			azureIcons
				? {
						sortKey: "azure architecture icons",
						heading: `Microsoft Azure Architecture Icons (release ${azureIconsReleases().azure}) and Microsoft Entra architecture icons (release ${azureIconsReleases().entra}) — Microsoft terms, not open source`,
						body: iconTermsSection(AZURE_ICON_LICENSE_PATH),
					}
				: [],
		)
		.concat(
			gcpIcons
				? {
						sortKey: "google cloud product icons",
						heading: `Google Cloud product icons (release ${gcpIconsRelease()}) — no license published, not open source`,
						body: iconTermsSection(GCP_ICON_LICENSE_PATH),
					}
				: [],
		);

	const listed = [...bundled]
		.map(([name, version]) => ({
			sortKey: name,
			line: `${name}@${version} (${declaredLicense(packageDir(storeDir, name, version))})`,
		}))
		.concat(
			fontPackages.map((name) => ({
				sortKey: name,
				line: `${name}@${fontVersion} (${declaredLicense(packageDir(storeDir, name, fontVersion))})`,
			})),
		)
		.concat(
			awsIcons
				? {
						sortKey: "aws architecture icons",
						line: `AWS Architecture Icons ${awsIconsRelease()} (AWS terms, not open source)`,
					}
				: [],
		)
		.concat(
			azureIcons
				? {
						sortKey: "azure architecture icons",
						line: `Microsoft Azure Architecture Icons ${azureIconsReleases().azure} and Microsoft Entra architecture icons ${azureIconsReleases().entra} (Microsoft terms, not open source)`,
					}
				: [],
		)
		.concat(
			gcpIcons
				? {
						sortKey: "google cloud product icons",
						line: `Google Cloud product icons ${gcpIconsRelease()} (no license published, not open source)`,
					}
				: [],
		);

	const byName = (a, b) =>
		a.sortKey.toLowerCase().localeCompare(b.sortKey.toLowerCase());
	sections.sort(byName);
	listed.sort(byName);

	const out = [
		"THIRD-PARTY SOFTWARE NOTICES",
		"=".repeat(28),
		"",
		...options.intro,
		"",
		"Package list:",
		...listed.map((one) => `  - ${one.line}`),
	];
	for (const section of sections) {
		out.push("", RULE, section.heading, RULE, "", section.body);
	}
	return `${out.join("\n")}\n`;
}

/**
 * Reports how the two package lists differ, as lines the reader can act on.
 * Falls back to saying so when the lists agree and the license bodies are what
 * moved.
 *
 * @param committed - Contents of the tracked THIRD-PARTY-NOTICES.txt
 * @param generated - What this run produced
 */
function printListDifference(committed, generated) {
	const listOf = (text) =>
		new Set(text.split("\n").filter((line) => line.startsWith("  - ")));
	const before = listOf(committed);
	const after = listOf(generated);
	const removed = [...before].filter((one) => !after.has(one));
	const added = [...after].filter((one) => !before.has(one));
	if (removed.length === 0 && added.length === 0) {
		console.error(
			"   The package list is unchanged, so a license text moved. Diff the file after regenerating.",
		);
		return;
	}
	for (const line of removed) {
		console.error(`   committed: ${line.trim()}`);
	}
	for (const line of added) {
		console.error(`   this build: ${line.trim()}`);
	}
}

/**
 * Writes `<shippingDir>/THIRD-PARTY-NOTICES.txt`, or with `--check` on the
 * command line exits 1 when the committed file differs from what this build
 * would write. Exits 1 without reading the build when the tree is installed by
 * an outer workspace (see {@link resolveStoreDir}).
 *
 * @param options - What the package ships and how its notices introduce it
 * @param options.shippingDir - Absolute path of the package being shipped; the
 *   notices file is written at its root
 * @param options.sourceMapPaths - Absolute paths of the source maps of every
 *   bundle the package ships; each must exist
 * @param options.buildCommand - The command that produces the maps, named when
 *   one is missing (`pnpm build:vscode`)
 * @param options.fontDirs - Absolute directories the package ships font files
 *   in, searched recursively
 * @param options.intro - The opening paragraph, one string per line, as it is
 *   to be wrapped in the file
 * @param options.fontSectionLead - The font section's opening lines, saying
 *   where the font files are, one string per line
 * @param options.lucideDestination - Whose source the Lucide drawings are
 *   generated into, completing "from this package into ___" on one line
 */
export function runThirdPartyNotices(options) {
	const storeDir = resolveStoreDir();
	const noticesPath = join(options.shippingDir, "THIRD-PARTY-NOTICES.txt");
	const generated = generate(storeDir, options);

	if (process.argv.includes("--check")) {
		const committed = readFileSync(noticesPath, "utf8");
		if (committed !== generated) {
			console.error(
				`❌ ${relative(repoRoot, noticesPath)} has drifted from what the build ships. Run pnpm generate:notices and commit the result.`,
			);
			// The package list is where a drift is legible; a bare "they differ" leaves
			// the reader to install and diff by hand, and the usual cause is one
			// dependency resolving differently than in the tree the file was written in.
			printListDifference(committed, generated);
			process.exit(1);
		}
		console.log(
			`✅ ${relative(repoRoot, noticesPath)} matches what the build ships`,
		);
	} else {
		writeFileSync(noticesPath, generated);
		console.log(
			`✅ wrote ${relative(repoRoot, noticesPath)} (${generated.split("\n").length} lines)`,
		);
	}
}
