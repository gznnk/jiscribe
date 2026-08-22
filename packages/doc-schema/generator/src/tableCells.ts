import type { ObjectDocDefinition } from "@jiscribe/doc";

/**
 * Table cells for the special types whose cells cannot be derived from features
 * (poly / none geometry, and svg's opaque box). Every type not listed here is
 * derived from features + summary.
 */
export const SPECIAL_TABLE_CELLS: Readonly<
	Record<
		string,
		{
			/** ai-guide `type` cell (defaults to `` `type` `` when omitted). */
			guideTypeCell?: string;
			/** ai-guide "Required geometry" cell. */
			guideGeometry: string;
			/** ai-guide "Main styles" cell. */
			guideStyles: string;
			/** reference "Geometry" cell. */
			referenceGeometry: string;
			/** reference "Styles" cell. */
			referenceStyles: string;
		}
	>
> = {
	polyline: {
		guideGeometry: "`points` (open line)",
		guideStyles: "stroke / startArrow / endArrow",
		referenceGeometry: "`points`",
		referenceStyles: "Stroke",
	},
	polygon: {
		guideGeometry: "`points` (auto-closed)",
		guideStyles: "stroke / fill",
		referenceGeometry: "`points`",
		referenceStyles: "Stroke, Fill",
	},
	group: {
		guideGeometry: "`children`",
		guideStyles: "rotation / flipX / flipY",
		referenceGeometry: "none",
		referenceStyles: "Transform",
	},
	svg: {
		guideGeometry: "`x`,`y`,`width`,`height` + `svgText`",
		guideStyles: "rotation only",
		referenceGeometry: "`x`, `y`, `width`, `height` + `svgText`",
		referenceStyles: "Transform only (rotation/flip)",
	},
	connector: {
		guideTypeCell: "`connector` (in `root`)",
		guideGeometry: "`source`,`target`,`points:[]`",
		guideStyles: "stroke / startArrow / endArrow / routing / label",
		referenceGeometry: "`points`",
		referenceStyles: "Stroke",
	},
};

/**
 * Geometry cell per geometry, in the ai-guide spelling (no spaces after the
 * commas) and the reference spelling. The geometries missing here (poly / none)
 * belong only to types listed in SPECIAL_TABLE_CELLS, which never reach this
 * table; rect therefore doubles as the fallback.
 */
const GEOMETRY_CELLS: Readonly<
	Record<string, { guide: string; reference: string }>
> = {
	rect: {
		guide: "`x`,`y`,`width`,`height`",
		reference: "`x`, `y`, `width`, `height`",
	},
	ellipse: {
		guide: "`cx`,`cy`,`rx`,`ry`",
		reference: "`cx`, `cy`, `rx`, `ry`",
	},
	point: {
		guide: "`x`,`y` (no `width`/`height`)",
		reference: "`x`, `y` (no `width` / `height`)",
	},
};

/** Derive the ai-guide "Required geometry" cell from features (special types excluded). */
export function deriveGuideGeometry(definition: ObjectDocDefinition): string {
	const cells = GEOMETRY_CELLS[definition.features.geometry];
	return (cells ?? GEOMETRY_CELLS.rect).guide;
}

/** Derive the reference "Geometry" cell from features (special types excluded). */
export function deriveReferenceGeometry(
	definition: ObjectDocDefinition,
): string {
	const cells = GEOMETRY_CELLS[definition.features.geometry];
	return (cells ?? GEOMETRY_CELLS.rect).reference;
}

/** Derive the ai-guide "Main styles" cell from features (special types excluded). */
export function deriveGuideStyles(definition: ObjectDocDefinition): string {
	const { features } = definition;
	const parts: string[] = [];
	if (features.stroke) {
		parts.push("stroke");
	}
	if (features.fill) {
		parts.push("fill");
	}
	if (features.text === "body") {
		parts.push("text");
	} else if (features.text === "slots") {
		parts.push("**keyed** text");
	}
	if (features.radius) {
		parts.push("`rx`");
	}
	if (features.transform) {
		parts.push("rotation");
	}
	return parts.join(" / ");
}

/** Derive the reference "Styles" cell from features (special types excluded). */
export function deriveReferenceStyles(definition: ObjectDocDefinition): string {
	const { features } = definition;
	const parts: string[] = [];
	if (features.stroke) {
		parts.push("Stroke");
	}
	if (features.fill) {
		parts.push("Fill");
	}
	if (features.text === "body") {
		parts.push("Text");
	} else if (features.text === "slots") {
		parts.push("Text (keyed)");
	}
	if (features.transform) {
		parts.push("Transform");
	}
	if (features.radius) {
		parts.push("Radius");
	}
	const notes: string[] = [];
	if (!features.text) {
		notes.push("no text");
	}
	if (!features.stroke) {
		notes.push("no Stroke");
	}
	return parts.join(", ") + (notes.length > 0 ? ` (${notes.join(", ")})` : "");
}

/** Capitalize a summary for the Description / Typical use table columns. */
export function capitalizeSummary(summary: string): string {
	return summary.charAt(0).toUpperCase() + summary.slice(1);
}
