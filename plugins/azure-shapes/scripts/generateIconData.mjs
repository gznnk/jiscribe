// Generates the two icon modules from an unpacked Azure Architecture Icons
// package and the Microsoft Entra architecture icons package: the catalog
// (src/schema/icon/iconCatalog.generated.ts — names, labels, categories,
// viewBoxes) and the drawings (src/drawing/iconDrawings.generated.ts). The
// output is committed, so this script is the only thing that ever reads the
// zips.
//
//   pnpm --filter @jiscribe/plugin-azure-shapes generate:icons -- <the unpacked Azure Icons directory> <the unpacked "Microsoft Entra color icons SVG" directory>
//
// The Entra directory is the color one itself: its parent holds the
// black-and-white set too.
//
// The output is unformatted (prettier is not pinned in this package). Run
// prettier over the two files from the repository root afterwards.
//
// This script only collects the files and names the icons. Converting an asset
// into a drawing, and what that conversion may and may not adjust, is
// @jiscribe/canvas-sdk/icon-set-generator's.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
	convertIconSetSvg,
	formatIconSetCatalogModule,
	formatIconSetDrawingsModule,
	listSvgFiles,
} from "@jiscribe/canvas-sdk/icon-set-generator";

/** Where the assets came from, recorded in the generated header. */
const SOURCE_ZIP_URL =
	"https://arch-center.azureedge.net/icons/Azure_Public_Service_Icons_V24.zip";

/** The package's version and the month Microsoft's download page dates it to. */
const ASSET_RELEASE = "V24, 2026-07";

/** Where the Entra icons came from, recorded in the generated header. */
const ENTRA_SOURCE_ZIP_URL =
	"https://download.microsoft.com/download/3/1/a/31a56038-856a-4489-88e4-ee5a1c4352be/Microsoft%20Entra%20architecture%20icons%20-%20Oct%202023.zip";

/** The Entra package's release, as Microsoft names the zip. */
const ENTRA_ASSET_RELEASE = "Oct 2023";

/**
 * What becomes of each file of the Entra color set. Entra left Azure in 2023,
 * so the Azure package has no Entra ID icon; that one is taken. The rest are
 * already in the Azure package (the same drawing, or a newer one there) or are
 * the product family's brand mark. A file missing from this table, or listed
 * here and missing from the directory, stops the run.
 */
const ENTRA_FILES = {
	"Microsoft Entra ID color icon.svg": {
		name: "entra-id",
		label: "Microsoft Entra ID",
		category: "Identity",
	},
	"Microsoft Entra ID Governance color icon.svg": {
		excluded: "the same drawing as the Azure package's identity-governance",
	},
	"Microsoft Entra Workload ID color icon.svg": {
		excluded: "the same drawing as the Azure package's app-registrations",
	},
	"Microsoft Entra Verified ID color icon.svg": {
		excluded: "the same drawing as the Azure package's entra-verified-id",
	},
	"Microsoft Entra Internet Access color icon.svg": {
		excluded: "the Azure package's entra-internet-access is the newer drawing",
	},
	"Microsoft Entra Private Access color icon.svg": {
		excluded: "the Azure package's entra-private-access is the newer drawing",
	},
	"Microsoft Entra Product Family.svg": {
		excluded: "the product family's brand mark, not a product icon",
	},
};

/**
 * Category display name per asset folder. Words take capitals, `+` stays, and
 * the abbreviations keep their usual spelling. A folder not listed here stops
 * the run, so a release adding one is looked at.
 */
const CATEGORY_BY_FOLDER = {
	"ai + machine learning": "AI + Machine Learning",
	analytics: "Analytics",
	"app services": "App Services",
	"azure ecosystem": "Azure Ecosystem",
	blockchain: "Blockchain",
	compute: "Compute",
	containers: "Containers",
	databases: "Databases",
	"developer tools": "Developer Tools",
	devops: "DevOps",
	general: "General",
	"hybrid + multicloud": "Hybrid + Multicloud",
	identity: "Identity",
	integration: "Integration",
	intune: "Intune",
	iot: "IoT",
	"management + governance": "Management + Governance",
	menu: "Menu",
	migrate: "Migrate",
	migration: "Migration",
	"mixed reality": "Mixed Reality",
	mobile: "Mobile",
	monitor: "Monitor",
	networking: "Networking",
	"new icons": "New Icons",
	other: "Other",
	security: "Security",
	storage: "Storage",
	web: "Web",
};

/**
 * Folders that file an icon kept in a subject folder too. An icon in several
 * folders takes its category from one outside these where it has one.
 */
const CATCH_ALL_FOLDERS = new Set(["other", "new icons", "general", "menu"]);

/** `<number>-icon-service-<Stem>.svg`, a space now and then before the dash. */
const FILE_NAME_PATTERN = /^(\d+)\s*-icon-service-(.*)\.svg$/;

/**
 * The name: the stem in kebab-case. Punctuation, brackets and a trailing space
 * collapse into the separator (`Arc-PostgreSQL ` → `arc-postgresql`).
 */
const toName = (stem) =>
	stem
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");

/** Display label: the stem with its dashes opened into spaces. */
const toLabel = (stem) => stem.replaceAll("-", " ").replace(/\s+/g, " ").trim();

/** Every asset, with the folder it sits in and what its file name says. */
const collectFiles = (root) =>
	readdirSync(root)
		.sort()
		.flatMap((folder) =>
			listSvgFiles(join(root, folder)).map((path) => {
				const fileName = path.split("/").pop();
				const match = FILE_NAME_PATTERN.exec(fileName);
				if (match === null) {
					throw new Error(
						`${path}: the file name is not <number>-icon-service-<stem>.svg`,
					);
				}
				const category = CATEGORY_BY_FOLDER[folder];
				if (category === undefined) {
					throw new Error(
						`${folder}: a folder the category table does not list`,
					);
				}
				const [, number, stem] = match;
				return {
					path,
					folder,
					number: Number(number),
					name: toName(stem),
					label: toLabel(stem),
					category,
					source: readFileSync(path, "utf8"),
				};
			}),
		);

/**
 * Folds the files into one entry per name. Microsoft files the same icon under
 * several folders; identical copies become one entry, whose category is the
 * first subject folder in path order (a catch-all folder only when there is no
 * other). Where the copies differ, the higher number (the newer icon) is kept
 * and the rest are reported and dropped.
 */
const collectEntries = (files) => {
	const filesByName = new Map();
	for (const file of files) {
		filesByName.set(file.name, [...(filesByName.get(file.name) ?? []), file]);
	}
	const entries = [];
	const dropped = [];
	for (const [name, copies] of filesByName) {
		const newest = copies.reduce((left, right) =>
			right.number > left.number ? right : left,
		);
		const kept = copies.filter((copy) => copy.source === newest.source);
		dropped.push(...copies.filter((copy) => copy.source !== newest.source));
		const primary =
			kept.find((copy) => !CATCH_ALL_FOLDERS.has(copy.folder)) ?? kept[0];
		entries.push({
			name,
			label: primary.label,
			category: primary.category,
			drawing: convertIconSetSvg(primary.source, {
				filePath: primary.path,
				idPrefix: `azure-${name}`,
			}),
		});
	}
	entries.sort((left, right) => left.name.localeCompare(right.name));
	return { entries, dropped };
};

// The first 400 characters carry "asset package (V24, 2026-07)" and "Microsoft
// Entra architecture icons (Oct 2023)": the notices generator
// (scripts/thirdPartyNotices.mjs) reads both releases from there.
const HEADER = `Generated by scripts/generateIconData.mjs from the Azure Architecture Icons
asset package (${ASSET_RELEASE}) and the Microsoft Entra architecture icons (${ENTRA_ASSET_RELEASE}).
Do not edit by hand; re-run the script to bump the set.

Source: ${SOURCE_ZIP_URL}
Source (Entra ID): ${ENTRA_SOURCE_ZIP_URL}
The drawings are Microsoft Azure Architecture Icons and Microsoft Entra
architecture icons, (c) Microsoft Corporation, used under Microsoft's icon terms
(https://learn.microsoft.com/en-us/azure/architecture/icons/,
https://learn.microsoft.com/en-us/entra/architecture/architecture-icons) and
redistributed unmodified — see LICENSE-ICONS.md. No coordinate is rounded and no fill is
substituted; only the embedding is adjusted, as
@jiscribe/canvas-sdk/icon-set-generator lists.`;

const CATALOG_PREAMBLE = `/** Where the assets came from. */
export const AZURE_ICON_SOURCE_URL = ${JSON.stringify(SOURCE_ZIP_URL)};

/** Asset release: the package's version and the month Microsoft dates it to. */
export const AZURE_ICON_RELEASE = ${JSON.stringify(ASSET_RELEASE)};

/** Where the Entra ID icon came from. */
export const ENTRA_ICON_SOURCE_URL = ${JSON.stringify(ENTRA_SOURCE_ZIP_URL)};

/** The Entra icons' release, as Microsoft names the package. */
export const ENTRA_ICON_RELEASE = ${JSON.stringify(ENTRA_ASSET_RELEASE)};`;

/**
 * The Entra entries to add, read by {@link ENTRA_FILES}. They are added after
 * the Azure copies are folded, and a name the Azure package already has stops
 * the run: should Azure ship its own one day, a person decides which to keep.
 */
const collectEntraEntries = (entraRoot, azureEntries) => {
	const fileNames = readdirSync(entraRoot).filter((fileName) =>
		fileName.endsWith(".svg"),
	);
	const unlisted = fileNames.filter(
		(fileName) => !Object.hasOwn(ENTRA_FILES, fileName),
	);
	if (unlisted.length > 0) {
		throw new Error(
			`${entraRoot}: files the Entra table does not list: ${unlisted.join(", ")}`,
		);
	}
	const missing = Object.keys(ENTRA_FILES).filter(
		(fileName) => !fileNames.includes(fileName),
	);
	if (missing.length > 0) {
		throw new Error(
			`${entraRoot}: files the Entra table lists are not there: ${missing.join(", ")}`,
		);
	}
	const azureNames = new Set(azureEntries.map((entry) => entry.name));
	return Object.entries(ENTRA_FILES)
		.filter(([, plan]) => plan.excluded === undefined)
		.map(([fileName, { name, label, category }]) => {
			if (azureNames.has(name)) {
				throw new Error(
					`${fileName}: the Azure package has an icon named ${name} too; decide which to keep`,
				);
			}
			// A category the folder table does not name would open a browse section of its own.
			if (!Object.values(CATEGORY_BY_FOLDER).includes(category)) {
				throw new Error(
					`${fileName}: the category ${category} is not one CATEGORY_BY_FOLDER names`,
				);
			}
			const path = join(entraRoot, fileName);
			return {
				name,
				label,
				category,
				drawing: convertIconSetSvg(readFileSync(path, "utf8"), {
					filePath: path,
					idPrefix: `azure-${name}`,
				}),
			};
		});
};

const main = () => {
	const [, , root, entraRoot] = process.argv;
	if (root === undefined || entraRoot === undefined) {
		throw new Error(
			'pass the Icons directory of the unpacked Azure_Public_Service_Icons package, then the "Microsoft Entra color icons SVG" directory of the Entra package',
		);
	}
	const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
	const catalogPath =
		process.argv[4] ??
		join(packageRoot, "src", "schema", "icon", "iconCatalog.generated.ts");
	const drawingsPath =
		process.argv[5] ??
		join(packageRoot, "src", "drawing", "iconDrawings.generated.ts");

	const { entries: azureEntries, dropped } = collectEntries(collectFiles(root));
	const entries = [
		...azureEntries,
		...collectEntraEntries(entraRoot, azureEntries),
	].sort((left, right) => left.name.localeCompare(right.name));

	writeFileSync(
		catalogPath,
		formatIconSetCatalogModule({
			header: HEADER,
			preamble: CATALOG_PREAMBLE,
			entryType: {
				name: "IconSetCatalogEntry",
				from: "@jiscribe/canvas-sdk/doc",
			},
			entriesName: "AZURE_ICON_CATALOG_ENTRIES",
			entries: entries.map((entry) => ({
				name: entry.name,
				fields: {
					label: entry.label,
					category: entry.category,
					viewBox: entry.drawing.viewBox,
				},
			})),
		}),
		"utf8",
	);
	writeFileSync(
		drawingsPath,
		formatIconSetDrawingsModule({
			header: HEADER,
			drawingsName: "AZURE_ICON_DRAWINGS",
			drawings: entries.map((entry) => ({
				name: entry.name,
				nodes: entry.drawing.nodes,
				idRefs: entry.drawing.idRefs,
			})),
		}),
		"utf8",
	);

	console.log(`${entries.length} icons → ${catalogPath}, ${drawingsPath}`);
	for (const file of dropped) {
		console.log(
			`  dropped an older, different drawing: ${file.name} (${file.folder}/${file.number})`,
		);
	}
};

main();
