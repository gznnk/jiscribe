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
		}
	>
> = {
	polyline: {
		guideGeometry: "`points` (open line)",
	},
	polygon: {
		guideGeometry: "`points` (auto-closed)",
	},
	group: {
		guideGeometry: "`children`",
	},
	svg: {
		guideGeometry: "`x`,`y`,`width`,`height` + `svgText`",
	},
	connector: {
		guideTypeCell: "`connector` (in `root`)",
		guideGeometry: "`source`,`target`,`points:[]`",
	},
};

/**
 * Geometry cell per geometry, in the ai-guide spelling (no spaces after the
 * commas). The geometries missing here (poly / none) belong only to types listed
 * in SPECIAL_TABLE_CELLS, which never reach this table; rect therefore doubles as
 * the fallback.
 */
const GEOMETRY_CELLS: Readonly<Record<string, string>> = {
	rect: "`x`,`y`,`width`,`height`",
	ellipse: "`cx`,`cy`,`rx`,`ry`",
	point: '`x`,`y` (no `height`; `width` only with `textLayout: "block"`)',
};

/** Derive the ai-guide "Required geometry" cell from features (special types excluded). */
export function deriveGuideGeometry(definition: ObjectDocDefinition): string {
	return GEOMETRY_CELLS[definition.features.geometry] ?? GEOMETRY_CELLS.rect;
}
