import type { ObjectDoc } from "../objects/base/ObjectDoc";

export type CanvasDoc = CanvasDocV1;

export type CanvasDocAny = CanvasDocV1;

/**
 * `root` is a single top-level array representing z-order (back → front).
 * It holds objects and connectors (type === "connector") mixed together, so the
 * order is directly the stacking order. Connectors are never group children and
 * exist only directly under root.
 */
export type CanvasDocV1 = {
	/**
	 * Legacy JSON-Schema pointer. The bundled `$schema` feature was retired, so this
	 * field is no longer produced or consumed by jiscribe. It is kept here only so an
	 * existing `.jis.json` carrying a `$schema` line is *tolerated* on input (parse
	 * accepts it rather than erroring) — it is deliberately NOT round-tripped: the save
	 * path (`canvasToDoc`) drops it, because CanvasState has no place to hold it and
	 * reintroducing a persisted schema pointer only re-creates the confusion the removal
	 * was meant to end. So "edit a `$schema` file and the line disappears on save" is
	 * intended behavior, not a bug. `isSameCanvasDocContent` likewise ignores it.
	 */
	$schema?: string;
	version: 1;
	/**
	 * Canvas surface color as a literal CSS color string (like shape `fill`, a
	 * concrete color — not a `var(...)` — so the file stays portable). Omit to
	 * follow the theme's `canvasBg`. When set it is the surface for both display
	 * and image export, and the grid line color is derived from it so the grid
	 * stays readable on any background (see `deriveGridLineColor`).
	 */
	background?: string;
	root: ObjectDoc[];
};
