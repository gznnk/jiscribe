import type { ObjectDocDefinition } from "@workspace/canvas/doc";

import {
	CANONICAL_TYPE_ORDER,
	DETAIL_SECTION_TYPES,
	GROUPED_REFERENCE_TYPES,
	docDefName,
	type CanonicalType,
} from "./manifest";
import { replaceAutogenRegion } from "./markdownRegions";
import {
	SPECIAL_TABLE_CELLS,
	capitalizeSummary,
	deriveReferenceStyles,
} from "./tableCells";

/**
 * JSON examples for the individual sections. Curated values (realistic
 * coordinates and labels) for the docs; types without an entry get one
 * synthesized from their defaults.
 */
const REFERENCE_EXAMPLES: Readonly<Record<string, Record<string, unknown>>> = {
	rect: {
		id: "rect-1",
		type: "rect",
		x: 100,
		y: 100,
		width: 200,
		height: 120,
		fill: "#4CAF50",
		stroke: "#2E7D32",
		strokeWidth: 2,
		rx: 8,
		text: "Text",
		textAlign: "center",
		verticalAlign: "middle",
		fontColor: "#000000",
		fontSize: 16,
		fontFamily: "Noto Sans JP",
		fontWeight: "normal",
		rotation: 0,
	},
	ellipse: {
		id: "ellipse-1",
		type: "ellipse",
		cx: 300,
		cy: 200,
		rx: 100,
		ry: 60,
		fill: "#2196F3",
		stroke: "#1565C0",
		strokeWidth: 2,
	},
	diamond: {
		id: "decision-1",
		type: "diamond",
		x: 200,
		y: 150,
		width: 160,
		height: 100,
		fill: "#FFF3E0",
		stroke: "#EF6C00",
		strokeWidth: 2,
		text: "OK?",
	},
	stadium: {
		id: "start-1",
		type: "stadium",
		x: 40,
		y: 120,
		width: 140,
		height: 60,
		text: "Start",
	},
	parallelogram: {
		id: "input-1",
		type: "parallelogram",
		x: 200,
		y: 150,
		width: 140,
		height: 80,
		text: "Input",
	},
	hexagon: {
		id: "prepare-1",
		type: "hexagon",
		x: 200,
		y: 150,
		width: 140,
		height: 80,
		text: "Prepare",
	},
	cloud: {
		id: "internet-1",
		type: "cloud",
		x: 200,
		y: 150,
		width: 160,
		height: 100,
		text: "Internet",
	},
	document: {
		id: "report-1",
		type: "document",
		x: 200,
		y: 150,
		width: 140,
		height: 100,
		text: "Report",
	},
	actor: {
		id: "user-1",
		type: "actor",
		x: 200,
		y: 150,
		width: 80,
		height: 100,
		text: "User",
	},
	callout: {
		id: "note-1",
		type: "callout",
		x: 200,
		y: 150,
		width: 160,
		height: 110,
		text: "Watch out here",
	},
	db: {
		id: "db-1",
		type: "db",
		x: 200,
		y: 150,
		width: 120,
		height: 100,
		text: "users",
	},
};

/** JSON example for the grouped catalog section (one representative type). */
const GROUPED_EXAMPLE = {
	id: "call-1",
	type: "subroutine",
	x: 200,
	y: 150,
	width: 140,
	height: 80,
	text: "loadUser()",
};

/** Extra field-table rows appended per type (e.g. callout's `tail`). */
const EXTRA_FIELD_ROWS: Readonly<Record<string, string[]>> = {
	callout: [
		'| `tail` | `object` | bottom at `0.2` | Tail tip placement: `{ "side": ..., "position": ... }`. `side` is the edge the tip sits on (`"top"` / `"right"` / `"bottom"` / `"left"`), `position` is 0–1 along that edge. Point it at the annotated object. |',
	],
	brace: [
		'| `direction` | `string` | `"left"` | Which way the tip points, away from the grouped shapes (`"left"` / `"right"` / `"up"` / `"down"`). `"left"` is the typographic `{`. Use `"left"`/`"right"` for a tall box, `"up"`/`"down"` for a wide one. |',
		"| `tipPosition` | `number` | `0.5` | Where the tip sits along the long side, 0–1 from the top (`left`/`right`) or from the left (`up`/`down`). The label hangs off the tip, so this moves the label too. |",
	],
};

/** Convert a schema-style description (XxxDoc names) to reference style (`xxx`). */
function toReferenceProse(description: string): string {
	let prose = description;
	for (const type of CANONICAL_TYPE_ORDER) {
		prose = prose.replaceAll(docDefName(type), `\`${type}\``);
	}
	return prose;
}

function buildProse(type: string, definition: ObjectDocDefinition): string {
	const sentences = [toReferenceProse(definition.description!)];
	if (definition.features.connectable) {
		sentences.push(
			type === "rect"
				? "It is **connectable** (see `connector`)."
				: "It is **connectable** like `rect`.",
		);
	}
	if (definition.features.geometry === "rect" && !definition.features.radius) {
		sentences.push("It has **no Radius** (`rx`).");
	}
	return sentences.join(" ");
}

function toJsonBlock(value: unknown): string {
	return `\`\`\`json\n${JSON.stringify(value, null, "\t")}\n\`\`\``;
}

function formatDefaultCell(value: unknown): string {
	return typeof value === "string" ? `\`"${value}"\`` : `\`${String(value)}\``;
}

function buildFieldTable(
	type: string,
	definition: ObjectDocDefinition,
): string {
	const defaults = definition.defaults!;
	const rows: string[] = [
		"| Field | Type | Default | Description |",
		"| ----- | ---- | ------- | ----------- |",
	];
	if (definition.features.geometry === "ellipse") {
		rows.push(
			`| \`cx\` | \`number\` | ${formatDefaultCell(defaults.cx)} | X of the center. |`,
			`| \`cy\` | \`number\` | ${formatDefaultCell(defaults.cy)} | Y of the center. |`,
			`| \`rx\` | \`number\` | ${formatDefaultCell(defaults.rx)} | Horizontal radius (px). |`,
			`| \`ry\` | \`number\` | ${formatDefaultCell(defaults.ry)} | Vertical radius (px). |`,
		);
	} else {
		rows.push(
			`| \`x\` | \`number\` | ${formatDefaultCell(defaults.x)} | X of the bounding box's top-left. |`,
			`| \`y\` | \`number\` | ${formatDefaultCell(defaults.y)} | Y of the bounding box's top-left. |`,
			`| \`width\` | \`number\` | ${formatDefaultCell(defaults.width)} | Bounding-box width (px). |`,
			`| \`height\` | \`number\` | ${formatDefaultCell(defaults.height)} | Bounding-box height (px). |`,
		);
		if (definition.features.radius) {
			rows.push(
				`| \`rx\` | \`number\` | ${formatDefaultCell(defaults.rx)} | Corner radius (SVG \`rx\`). |`,
			);
		}
	}
	rows.push(...(EXTRA_FIELD_ROWS[type] ?? []));
	return rows.join("\n");
}

function synthesizeExample(
	type: string,
	definition: ObjectDocDefinition,
): Record<string, unknown> {
	const defaults = definition.defaults!;
	const example: Record<string, unknown> = { id: `${type}-1`, type };
	if (definition.features.geometry === "ellipse") {
		Object.assign(example, {
			cx: 300,
			cy: 200,
			rx: defaults.rx,
			ry: defaults.ry,
		});
	} else {
		Object.assign(example, {
			x: 200,
			y: 150,
			width: defaults.width,
			height: defaults.height,
		});
	}
	if (definition.features.text === "body") {
		example.text = "Label";
	}
	return example;
}

const STYLE_LINKS_FOOTER =
	"For style fields, see [Stroke style](#stroke-style), [Fill style](#fill-style), [Text style](#text-style), and [Transform style](#transform-style).";

function buildDetailSection(
	type: string,
	definition: ObjectDocDefinition,
): string {
	const example =
		REFERENCE_EXAMPLES[type] ?? synthesizeExample(type, definition);
	const parts = [
		`### \`${type}\``,
		buildProse(type, definition),
		toJsonBlock(example),
		buildFieldTable(type, definition),
	];
	if (type === "rect") {
		parts.push(STYLE_LINKS_FOOTER);
	}
	return parts.join("\n\n");
}

function buildGroupedSection(
	manifest: ReadonlyMap<CanonicalType, ObjectDocDefinition>,
): string {
	const types = GROUPED_REFERENCE_TYPES;
	for (const type of types) {
		const { features } = manifest.get(type)!;
		if (
			features.geometry !== "rect" ||
			!features.connectable ||
			features.radius
		) {
			throw new Error(
				`集約セクションの前提（rect ジオメトリ・connectable・radius なし）を "${type}" が満たしていません`,
			);
		}
	}
	const textless = types.filter((type) => !manifest.get(type)!.features.text);
	const heading = `### Flowchart box shapes (${types.map((type) => `\`${type}\``).join(" / ")})`;
	// The exception clause is dropped entirely once every type takes text, rather
	// than left to render as an empty list.
	const textNote =
		textless.length === 0
			? "They all take Text like `rect`. "
			: `${types.length - textless.length} of them also take Text like \`rect\`; ` +
				`**${textless.map((type) => `\`${type}\``).join(" and ")} hold no text** ` +
				"(they are markers — omit `text` and the font fields). ";
	const intro =
		`All ${types.length} use the **same rect-based geometry** (top-left \`x\`,\`y\` + \`width\`,\`height\`) ` +
		`and the same Stroke / Fill / Transform styles as \`rect\`; only the drawn outline differs. ${
			textNote
		}They are all **connectable** like \`rect\` ` +
		`and have **no Radius** (\`rx\`). Set \`type\` to the value below and give a bounding box.`;
	const table = [
		"| `type` | Outline | Typical use |",
		"| ------ | ------- | ----------- |",
		...types.map((type) => {
			const definition = manifest.get(type)!;
			return `| \`${type}\` | ${definition.outlineDescription} | ${capitalizeSummary(definition.summary!)} |`;
		}),
	].join("\n");
	return [heading, intro, table, toJsonBlock(GROUPED_EXAMPLE)].join("\n\n");
}

function buildObjectTypesTable(
	manifest: ReadonlyMap<CanonicalType, ObjectDocDefinition>,
): string {
	const rows = CANONICAL_TYPE_ORDER.map((type) => {
		const definition = manifest.get(type)!;
		const special = SPECIAL_TABLE_CELLS[type];
		const geometry =
			special?.referenceGeometry ??
			(definition.features.geometry === "ellipse"
				? "`cx`, `cy`, `rx`, `ry`"
				: "`x`, `y`, `width`, `height`");
		const styles =
			special?.referenceStyles ?? deriveReferenceStyles(definition);
		return `| \`${type}\` | ${capitalizeSummary(definition.summary!)} | ${geometry} | ${styles} |`;
	});
	return [
		"| `type` | Description | Geometry | Styles |",
		"| ------ | ----------- | -------- | ------ |",
		...rows,
	].join("\n");
}

/** Replace the two AUTOGEN regions of reference.md (types table, per-type sections). */
export function generateReference(
	currentReference: string,
	manifest: ReadonlyMap<CanonicalType, ObjectDocDefinition>,
): string {
	const detailSections = [
		...DETAIL_SECTION_TYPES.map((type) =>
			buildDetailSection(type, manifest.get(type)!),
		),
		buildGroupedSection(manifest),
	].join("\n\n---\n\n");

	let updated = replaceAutogenRegion(
		currentReference,
		"object-types",
		buildObjectTypesTable(manifest),
	);
	updated = replaceAutogenRegion(updated, "object-details", detailSections);
	return updated;
}
