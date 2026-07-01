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
	$schema?: string;
	version: 1;
	root: ObjectDoc[];
};
