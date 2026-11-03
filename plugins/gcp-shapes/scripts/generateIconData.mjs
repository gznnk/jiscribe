// Generates the two icon modules from Google's unpacked core products' icons and
// category icons packages: the catalog (src/schema/icon/iconCatalog.generated.ts
// — names, labels, categories, viewBoxes) and the drawings
// (src/drawing/iconDrawings.generated.ts). The output is committed, so this
// script is the only thing that ever reads the zips.
//
//   pnpm --filter @jiscribe/plugin-gcp-shapes generate:icons -- <the unpacked "Unique Icons" directory> <the unpacked "Category Icons" directory>
//
// The output is unformatted (prettier is not pinned in this package). Run
// prettier over the two files from the repository root afterwards.
//
// This script only collects the files and names the icons. Converting an asset
// into a drawing, and what that conversion may and may not adjust, is
// @jiscribe/canvas-sdk/icon-set-generator's.
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
	convertIconSetSvg,
	formatIconSetCatalogModule,
	formatIconSetDrawingsModule,
	listSvgFiles,
} from "@jiscribe/canvas-sdk/icon-set-generator";

/** The page Google publishes the icons on, recorded in the generated header. */
const SOURCE_PAGE_URL = "https://cloud.google.com/icons";

/** Where the core products' icons came from. */
const CORE_ZIP_URL =
	"https://services.google.com/fh/files/misc/core-products-icons.zip";

/** Where the category icons came from. */
const CATEGORY_ZIP_URL =
	"https://services.google.com/fh/files/misc/category-icons.zip";

/**
 * The zips carry no version, so the release is the one date Google gives the
 * set: the "Updated" line of its product icons overview
 * (https://services.google.com/fh/files/misc/google-cloud-product-icons.pdf).
 */
const ASSET_RELEASE = "May 2026";

/**
 * Every folder of the core products package. `label` is the product's name as
 * page 4 of Google's overview writes it; `category` is the category its
 * product list (pages 7–31) files the product under.
 */
const CORE_FOLDERS = {
	"AI Hypercomputer": {
		name: "ai-hypercomputer",
		label: "AI Hypercomputer",
		category: "AI and Machine Learning",
	},
	AlloyDB: { name: "alloydb", label: "AlloyDB", category: "Databases" },
	Anthos: {
		name: "anthos",
		label: "Anthos",
		category: "Hybrid and Multicloud",
	},
	Apigee: { name: "apigee", label: "Apigee", category: "Integration Services" },
	BigQuery: { name: "bigquery", label: "BigQuery", category: "Data Analytics" },
	"Cloud Run": {
		name: "cloud-run",
		label: "Cloud Run",
		category: "Serverless",
	},
	"Cloud SQL": { name: "cloud-sql", label: "Cloud SQL", category: "Databases" },
	"Cloud Spanner": {
		name: "cloud-spanner",
		label: "Spanner",
		category: "Databases",
	},
	"Cloud Storage": {
		name: "cloud-storage",
		label: "Cloud Storage",
		category: "Storage",
	},
	"Compute Engine": {
		name: "compute-engine",
		label: "Compute Engine",
		category: "Compute",
	},
	"Distributed Cloud": {
		name: "distributed-cloud",
		label: "Google Distributed Cloud",
		category: "Hybrid and Multicloud",
	},
	GKE: { name: "gke", label: "GKE", category: "Containers" },
	Hyperdisk: { name: "hyperdisk", label: "Hyperdisk", category: "Storage" },
	Looker: {
		name: "looker",
		label: "Looker",
		category: "Business Intelligence",
	},
	Mandiant: {
		name: "mandiant",
		label: "Mandiant",
		category: "Security and Identity",
	},
	"Security Command Center": {
		name: "security-command-center",
		label: "Security Command Center",
		category: "Security and Identity",
	},
	"Security Operations": {
		name: "security-operations",
		label: "Google Security Operations",
		category: "Security and Identity",
	},
	"Threat Intelligence": {
		name: "threat-intelligence",
		label: "Google Threat Intelligence",
		category: "Security and Identity",
	},
	// Neither page 4 nor the product list carries Vertex AI; it is filed with
	// the AI products by judgement.
	"Vertex AI": {
		name: "vertex-ai",
		label: "Vertex AI",
		category: "AI and Machine Learning",
	},
};

/**
 * Every folder of the category icons package. `label` is the icon's name as
 * page 5 of the overview writes it; `category` is the category's name as
 * page 6 writes it, which is also the one each product page heads.
 */
const CATEGORY_FOLDERS = {
	Agents: {
		name: "agents",
		label: "AI Applications & Agents",
		category: "AI Applications & Agents",
	},
	"AI _ Machine Learning": {
		name: "ai-machine-learning",
		label: "AI / Machine Learning",
		category: "AI and Machine Learning",
	},
	"Business Intelligence": {
		name: "business-intelligence",
		label: "Business Intelligence",
		category: "Business Intelligence",
	},
	Collaboration: {
		name: "collaboration",
		label: "Collaboration",
		category: "Collaboration",
	},
	Compute: { name: "compute", label: "Compute", category: "Compute" },
	Containers: {
		name: "containers",
		label: "Containers",
		category: "Containers",
	},
	"Data Analytics": {
		name: "data-analytics",
		label: "Data Analytics",
		category: "Data Analytics",
	},
	Databases: { name: "databases", label: "Databases", category: "Databases" },
	"Developer Tools": {
		name: "developer-tools",
		label: "Developer Tools",
		category: "Developer Tools",
	},
	DevOps: { name: "devops", label: "DevOps", category: "DevOps" },
	"Hybrid & Multicloud": {
		name: "hybrid-multicloud",
		label: "Hybrid & Multicloud",
		category: "Hybrid and Multicloud",
	},
	"Integration Services": {
		name: "integration-services",
		label: "Integration Services",
		category: "Integration Services",
	},
	"Management Tools": {
		name: "management-tools",
		label: "Management Tools",
		category: "Management Tools",
	},
	"Maps & Geospatial": {
		name: "maps-geospatial",
		label: "Maps & Geospatial",
		category: "Maps & Geospatial",
	},
	Marketplace: {
		name: "marketplace",
		label: "Google Cloud Marketplace",
		category: "Marketplace",
	},
	"Media Services": {
		name: "media-services",
		label: "Media Services",
		category: "Media Services",
	},
	Migration: { name: "migration", label: "Migration", category: "Migration" },
	"Mixed Reality": {
		name: "mixed-reality",
		label: "Mixed Reality",
		category: "Mixed Reality",
	},
	Networking: {
		name: "networking",
		label: "Networking",
		category: "Networking",
	},
	Observability: {
		name: "observability",
		label: "Observability",
		category: "Observability",
	},
	Operations: {
		name: "operations",
		label: "Operations",
		category: "Operations",
	},
	"Security Identity": {
		name: "security-identity",
		label: "Security Identity",
		category: "Security and Identity",
	},
	"Serverless Computing": {
		name: "serverless-computing",
		label: "Serverless Computing",
		category: "Serverless",
	},
	Storage: { name: "storage", label: "Storage", category: "Storage" },
	"Web & Mobile": {
		name: "web-mobile",
		label: "Web & Mobile",
		category: "Web and Mobile",
	},
	Web3: { name: "web3", label: "Web3", category: "Web3" },
};

/**
 * The entries of one package, read by its folder table: each folder holds one
 * drawing under `SVG/`. A folder the table does not list, a listed folder that
 * is missing, or a folder whose `SVG/` does not hold exactly one file stops the
 * run. Entries starting with a dot (`.DS_Store`) and files are skipped.
 */
const collectEntries = (root, folderTable) => {
	const folders = readdirSync(root)
		.filter(
			(entry) =>
				!entry.startsWith(".") && statSync(join(root, entry)).isDirectory(),
		)
		.sort();
	const unlisted = folders.filter(
		(folder) => !Object.hasOwn(folderTable, folder),
	);
	if (unlisted.length > 0) {
		throw new Error(
			`${root}: folders the table does not list: ${unlisted.join(", ")}`,
		);
	}
	const missing = Object.keys(folderTable).filter(
		(folder) => !folders.includes(folder),
	);
	if (missing.length > 0) {
		throw new Error(
			`${root}: folders the table lists are not there: ${missing.join(", ")}`,
		);
	}
	return folders.map((folder) => {
		const svgFiles = listSvgFiles(join(root, folder, "SVG"));
		if (svgFiles.length !== 1) {
			throw new Error(
				`${join(root, folder, "SVG")}: holds ${svgFiles.length} svg files, not one`,
			);
		}
		const [path] = svgFiles;
		const { name, label, category } = folderTable[folder];
		return {
			name,
			label,
			category,
			drawing: convertIconSetSvg(readFileSync(path, "utf8"), {
				filePath: path,
				idPrefix: `gcp-${name}`,
			}),
		};
	});
};

// The first 400 characters carry "Google Cloud product icons (May 2026)": the
// VSCode extension's notices generator reads the release from there.
const HEADER = `Generated by scripts/generateIconData.mjs from Google's
Google Cloud product icons (${ASSET_RELEASE}): the core products' icons and the
category icons.
Do not edit by hand; re-run the script to bump the set.

Source: ${SOURCE_PAGE_URL}
Source (core products): ${CORE_ZIP_URL}
Source (categories): ${CATEGORY_ZIP_URL}
The drawings are Google Cloud product icons, published by Google LLC for
diagrams and technical documentation with no license attached, and are
redistributed unmodified with attribution — see LICENSE-ICONS.md. No coordinate
is rounded and no fill is substituted; only the embedding is adjusted, as
@jiscribe/canvas-sdk/icon-set-generator lists.`;

const CATALOG_PREAMBLE = `/** The page Google publishes the icons on. */
export const GCP_ICON_SOURCE_URL = ${JSON.stringify(SOURCE_PAGE_URL)};

/** Where the core products' icons came from. */
export const GCP_ICON_CORE_ZIP_URL = ${JSON.stringify(CORE_ZIP_URL)};

/** Where the category icons came from. */
export const GCP_ICON_CATEGORY_ZIP_URL = ${JSON.stringify(CATEGORY_ZIP_URL)};

/** Asset release: the zips carry none, so the month Google's icon overview is dated. */
export const GCP_ICON_RELEASE = ${JSON.stringify(ASSET_RELEASE)};`;

const main = () => {
	const [, , coreRoot, categoryRoot] = process.argv;
	if (coreRoot === undefined || categoryRoot === undefined) {
		throw new Error(
			`pass the "Unique Icons" directory of the unpacked core products' icons, then the "Category Icons" directory of the unpacked category icons`,
		);
	}
	const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
	const catalogPath =
		process.argv[4] ??
		join(packageRoot, "src", "schema", "icon", "iconCatalog.generated.ts");
	const drawingsPath =
		process.argv[5] ??
		join(packageRoot, "src", "drawing", "iconDrawings.generated.ts");

	const entries = [
		...collectEntries(coreRoot, CORE_FOLDERS),
		...collectEntries(categoryRoot, CATEGORY_FOLDERS),
	].sort((left, right) => left.name.localeCompare(right.name));
	const names = entries.map((entry) => entry.name);
	const repeated = names.filter((name, index) => names.indexOf(name) !== index);
	if (repeated.length > 0) {
		throw new Error(
			`names the two packages share: ${repeated.join(", ")}; decide which to keep`,
		);
	}

	writeFileSync(
		catalogPath,
		formatIconSetCatalogModule({
			header: HEADER,
			preamble: CATALOG_PREAMBLE,
			entryType: {
				name: "IconSetCatalogEntry",
				from: "@jiscribe/canvas-sdk/doc",
			},
			entriesName: "GCP_ICON_CATALOG_ENTRIES",
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
			drawingsName: "GCP_ICON_DRAWINGS",
			drawings: entries.map((entry) => ({
				name: entry.name,
				nodes: entry.drawing.nodes,
				idRefs: entry.drawing.idRefs,
			})),
		}),
		"utf8",
	);

	console.log(`${entries.length} icons → ${catalogPath}, ${drawingsPath}`);
};

main();
