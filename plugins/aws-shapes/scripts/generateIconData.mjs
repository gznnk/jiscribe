// Generates the two icon modules from an unpacked AWS Architecture Icons asset
// package: the catalog (src/schema/icon/iconCatalog.generated.ts — names,
// labels, categories, viewBoxes) and the drawings
// (src/drawing/iconDrawings.generated.ts). The output is committed, so this
// script is the only thing that ever reads the zip.
//
//   pnpm --filter @jiscribe/plugin-aws-shapes generate:icons -- <unpacked directory>
//
// The output is unformatted (prettier is not pinned in this package). Run
// prettier over the two files from the repository root afterwards.
//
// What is taken: every Group icon, every 48px Service icon, every Resource icon
// (General included). Category-Icons are branding, not diagram parts.
//
// This script only collects the files and names the icons. Converting an asset
// into a drawing, and what that conversion may and may not adjust, is
// @jiscribe/canvas-sdk/icon-set-generator's.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
	convertIconSetSvg,
	formatIconSetCatalogModule,
	formatIconSetDrawingsModule,
	listSvgFiles,
} from "@jiscribe/canvas-sdk/icon-set-generator";

/** Where the assets came from, recorded in the generated header. Changes each quarter. */
const SOURCE_ZIP_URL =
	"https://d1.awsstatic.com/onedam/marketing-channels/website/public/shared/architecture-icon-release/Icon-package_07312026.5846e92413caa21490223536cc97f1269e44fa92.zip";

/** Asset release, matching the MMDDYYYY suffix of the unpacked directory names. */
const ASSET_RELEASE = "07312026";

/** The only character a kebab-case name segment joins words with. */
const NAME_SEPARATOR = "-";

/**
 * Lowercases one name segment into kebab-case. Punctuation (`.NET`) collapses
 * into the separator, and runs of separators collapse into one.
 */
const toKebab = (segment) =>
	segment
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, NAME_SEPARATOR)
		.replace(/^-+|-+$/g, "");

/**
 * Strips the `Arch_` / `Res_` prefix and then every trailing size and
 * light/dark marker from a file stem, whichever order the asset package put
 * them in (`User_48_Light` and `AWS-Marketplace_Light_48` both occur).
 */
const stripFileDecorations = (stem) => {
	let stripped = stem.replace(/^(Arch|Res)_/, "");
	for (;;) {
		const shorter = stripped.replace(/_(16|32|48|64|Light|Dark)$/, "");
		if (shorter === stripped) {
			return stripped;
		}
		stripped = shorter;
	}
};

/** Which of the two renditions a file holds. */
const readVariant = (filePath) =>
	filePath.includes("_Dark") ? "dark" : "light";

/** Display label. `-` opens into a space, `_` into ` / `. */
const toLabel = (stem) =>
	stem
		.split("_")
		.map((segment) => segment.replaceAll(NAME_SEPARATOR, " "))
		.join(" / ");

/** Category name, from a directory name minus its `Arch_` / `Res_` prefix. */
const toCategory = (directoryName) =>
	directoryName.replace(/^(Arch|Res)_/, "").replaceAll(NAME_SEPARATOR, " ");

/** The file stem with its decorations stripped. */
const readStem = (path) =>
	stripFileDecorations(
		path
			.split("/")
			.pop()
			.replace(/\.svg$/, ""),
	);

/** Group icons (`group/<stem>`). */
const collectGroupFiles = (root) =>
	listSvgFiles(join(root, `Architecture-Group-Icons_${ASSET_RELEASE}`)).map(
		(path) => {
			const stem = readStem(path);
			return {
				path,
				name: `group/${toKebab(stem)}`,
				label: toLabel(stem),
				category: "Group",
				tier: "group",
			};
		},
	);

/** Service icons (`service/<stem>`). Only the 48px size is taken. */
const collectServiceFiles = (root) =>
	listSvgFiles(join(root, `Architecture-Service-Icons_${ASSET_RELEASE}`))
		.filter((path) => path.includes("/48/"))
		.map((path) => {
			const segments = path.split("/");
			const stem = readStem(path);
			return {
				path,
				name: `service/${toKebab(stem)}`,
				label: toLabel(stem),
				category: toCategory(segments[segments.length - 3]),
				tier: "service",
			};
		});

/**
 * Resource icons. The `_` of a stem opens into `/`, giving
 * `resource/<service>/<resource>`. General icons sit in a layer of their own
 * (`general/<stem>`) and are the one place a whole directory of Light / Dark
 * pairs lives.
 */
const collectResourceFiles = (root) =>
	listSvgFiles(join(root, `Resource-Icons_${ASSET_RELEASE}`)).map((path) => {
		const segments = path.split("/");
		const stem = readStem(path);
		const isGeneral = path.includes("Res_General-Icons");
		return {
			path,
			name: isGeneral
				? `general/${toKebab(stem)}`
				: `resource/${stem.split("_").map(toKebab).join("/")}`,
			label: toLabel(stem),
			category: isGeneral
				? "General"
				: toCategory(segments[segments.length - 2]),
			tier: isGeneral ? "general" : "resource",
		};
	});

/**
 * Converts one file. The id prefix carries the icon's own name and rendition,
 * so no two drawings of the set share a kept id.
 */
const readDrawing = (file, variant) =>
	convertIconSetSvg(readFileSync(file.path, "utf8"), {
		filePath: file.path,
		idPrefix: `aws-${file.name.replaceAll("/", "-")}${variant === "dark" ? "-dark" : ""}`,
	});

/**
 * Folds the files into one entry per name, pairing a Light file with its Dark
 * counterpart. AWS files the same service under two categories now and then
 * (Compute Optimizer, Kinesis Video Streams) with different background colours,
 * so the first file in path order settles which category the name carries; the
 * rest are reported and dropped.
 */
const collectEntries = (files) => {
	const entries = new Map();
	const dropped = [];
	for (const file of files) {
		const variant = readVariant(file.path);
		const existing = entries.get(file.name);
		if (existing === undefined) {
			entries.set(file.name, {
				name: file.name,
				label: file.label,
				category: file.category,
				tier: file.tier,
				[variant]: readDrawing(file, variant),
			});
			continue;
		}
		if (existing[variant] !== undefined) {
			dropped.push(file);
			continue;
		}
		existing[variant] = readDrawing(file, variant);
	}

	for (const entry of entries.values()) {
		if (entry.light === undefined) {
			throw new Error(`${entry.name}: a Dark file with no Light counterpart`);
		}
		if (
			entry.dark !== undefined &&
			entry.dark.viewBox !== entry.light.viewBox
		) {
			throw new Error(
				`${entry.name}: the Light and Dark renditions disagree on the viewBox`,
			);
		}
	}
	return { entries: [...entries.values()], dropped };
};

// The first 200 characters carry "asset package (MMDDYYYY)": the VSCode
// extension's notices generator reads the release from there.
const HEADER = `Generated by scripts/generateIconData.mjs from the AWS Architecture Icons
asset package (${ASSET_RELEASE}). Do not edit by hand; re-run the script to bump the set.

Source: ${SOURCE_ZIP_URL}
The drawings are AWS Architecture Icons, (c) Amazon Web Services, Inc. or its
affiliates, used under AWS's terms (https://aws.amazon.com/architecture/icons/)
and redistributed unmodified — see LICENSE-ICONS.md. No coordinate is rounded
and no fill is substituted; only the embedding is adjusted, as
@jiscribe/canvas-sdk/icon-set-generator lists.`;

const CATALOG_PREAMBLE = `/** Where the assets came from. The release changes each quarter, and so does this. */
export const AWS_ICON_SOURCE_URL = ${JSON.stringify(SOURCE_ZIP_URL)};

/** Asset release (the MMDDYYYY the asset package's directory names carry). */
export const AWS_ICON_RELEASE = ${JSON.stringify(ASSET_RELEASE)};`;

const main = () => {
	const root = process.argv[2];
	if (root === undefined) {
		throw new Error("pass the directory the asset package was unpacked into");
	}
	const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
	const catalogPath =
		process.argv[3] ??
		join(packageRoot, "src", "schema", "icon", "iconCatalog.generated.ts");
	const drawingsPath =
		process.argv[4] ??
		join(packageRoot, "src", "drawing", "iconDrawings.generated.ts");

	const files = [
		...collectGroupFiles(root),
		...collectServiceFiles(root),
		...collectResourceFiles(root),
	].sort(
		(left, right) =>
			left.name.localeCompare(right.name) ||
			left.path.localeCompare(right.path),
	);
	const { entries, dropped } = collectEntries(files);

	writeFileSync(
		catalogPath,
		formatIconSetCatalogModule({
			header: HEADER,
			preamble: CATALOG_PREAMBLE,
			entryType: {
				name: "AwsIconCatalogEntry",
				from: "./AwsIconCatalogEntry",
			},
			entriesName: "AWS_ICON_CATALOG_ENTRIES",
			entries: entries.map((entry) => ({
				name: entry.name,
				fields: {
					label: entry.label,
					category: entry.category,
					viewBox: entry.light.viewBox,
					tier: entry.tier,
				},
			})),
		}),
		"utf8",
	);
	writeFileSync(
		drawingsPath,
		formatIconSetDrawingsModule({
			header: HEADER,
			drawingsName: "AWS_ICON_DRAWINGS",
			drawings: entries.map((entry) => ({
				name: entry.name,
				nodes: entry.light.nodes,
				darkNodes: entry.dark?.nodes,
				idRefs: [...entry.light.idRefs, ...(entry.dark?.idRefs ?? [])],
			})),
		}),
		"utf8",
	);

	const paired = entries.filter((entry) => entry.dark !== undefined).length;
	console.log(
		`${entries.length} icons (${paired} with a Dark rendition) → ${catalogPath}, ${drawingsPath}`,
	);
	for (const file of dropped) {
		console.log(`  dropped a duplicate: ${file.name} (${file.category})`);
	}
};

main();
