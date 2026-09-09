import { readFileSync } from "node:fs";

import type { ObjectDocDefinition } from "@jiscribe/doc";

import { CANONICAL_TYPE_ORDER, type CanonicalType } from "./manifest";
import { replaceAutogenRegion } from "./markdownRegions";
import { partsPath } from "./paths";
import { SPECIAL_TABLE_CELLS, deriveGuideGeometry } from "./tableCells";

/**
 * The four hand-written sources under parts/, after their AUTOGEN regions have
 * been filled. Each is a fragment starting at `##` — the h1 belongs to the intro
 * template of whichever document is being composed.
 */
export interface GuideParts {
	/** 01: concepts, the canvas' limits, the style vocabulary. */
	canvasModel: string;
	/** 02: what each type is for, and where its text is drawn. */
	shapeCatalog: string;
	/** 03: how to draw well. */
	drawingPractice: string;
	/** 04: the JSON representation, for a reader writing the file by hand. */
	authoringJson: string;
}

/** Build a two-column markdown table with the given header and rows. */
function buildTable(
	valueHeader: string,
	rows: ReadonlyArray<{ typeCell: string; valueCell: string }>,
): string {
	return [
		`| \`type\` | ${valueHeader} |`,
		`| ------ | ${"-".repeat(valueHeader.length)} |`,
		...rows.map((row) => `| ${row.typeCell} | ${row.valueCell} |`),
	].join("\n");
}

/** The `type` cell of both tables, which only `connector` spells differently. */
function buildTypeCell(type: CanonicalType): string {
	return SPECIAL_TABLE_CELLS[type]?.guideTypeCell ?? `\`${type}\``;
}

/**
 * Read the four parts and fill the AUTOGEN regions two of them carry: the
 * "what each type is for" table in 02 and the "required geometry" table in 04.
 *
 * @param manifest every shipped type's doc definition, keyed by type name; the
 *   table rows follow CANONICAL_TYPE_ORDER rather than this map's order.
 * @returns the four parts as strings; nothing is written back to parts/.
 */
export function loadGuideParts(
	manifest: ReadonlyMap<CanonicalType, ObjectDocDefinition>,
): GuideParts {
	const readPart = (fileName: string): string =>
		readFileSync(partsPath(fileName), "utf8");

	const quickReference = buildTable(
		"Use",
		CANONICAL_TYPE_ORDER.map((type) => ({
			typeCell: buildTypeCell(type),
			valueCell: manifest.get(type)!.summary!,
		})),
	);
	const geometry = buildTable(
		"Required geometry",
		CANONICAL_TYPE_ORDER.map((type) => ({
			typeCell: buildTypeCell(type),
			valueCell:
				SPECIAL_TABLE_CELLS[type]?.guideGeometry ??
				deriveGuideGeometry(manifest.get(type)!),
		})),
	);

	return {
		canvasModel: readPart("01-canvas-model.md"),
		shapeCatalog: replaceAutogenRegion(
			readPart("02-shape-catalog.md"),
			"object-quick-reference",
			quickReference,
		),
		drawingPractice: readPart("03-drawing-practice.md"),
		authoringJson: replaceAutogenRegion(
			readPart("04-authoring-json.md"),
			"object-geometry",
			geometry,
		),
	};
}
