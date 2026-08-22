import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";

const rectDoc = (id: string, x: number, y: number, size = 10): unknown => ({
	id,
	type: "rect",
	x,
	y,
	width: size,
	height: size,
});

/**
 * Two rects plus a connector (conn-1) joining them. `root` is in z-order, so the connector
 * starts frontmost (last). Both ends are owned, so free-free cleanup never claims it.
 */
export const twoRectsWithConnectorDoc: CanvasDoc = {
	version: 1,
	root: [
		rectDoc("rect-1", 0, 0),
		rectDoc("rect-2", 100, 100),
		{
			id: "conn-1",
			type: "connector",
			points: [],
			source: {
				owner: { id: "rect-1" },
				anchor: { kind: "center" },
			},
			target: {
				owner: { id: "rect-2" },
				anchor: { kind: "center" },
			},
		},
	],
} as unknown as CanvasDoc;

/**
 * Three rects plus a rect-1 → rect-3 connector. Grouping rect-1 with rect-2 leaves the
 * connector crossing the group boundary, for group-delete cascade and LCA grouping scenarios.
 */
export const threeRectsWithConnectorDoc: CanvasDoc = {
	version: 1,
	root: [
		rectDoc("rect-1", 0, 0),
		rectDoc("rect-2", 100, 100),
		rectDoc("rect-3", 200, 0),
		{
			id: "conn-1",
			type: "connector",
			points: [],
			source: {
				owner: { id: "rect-1" },
				anchor: { kind: "center" },
			},
			target: {
				owner: { id: "rect-3" },
				anchor: { kind: "center" },
			},
		},
	],
} as unknown as CanvasDoc;

/**
 * One rect plus a connector whose target end is already free. Deleting rect-1 leaves no owned
 * endpoint at all, so cleanup has to delete the connector itself.
 */
export const halfFreeConnectorDoc: CanvasDoc = {
	version: 1,
	root: [
		rectDoc("rect-1", 0, 0),
		{
			id: "conn-1",
			type: "connector",
			points: [],
			source: {
				owner: { id: "rect-1" },
				anchor: { kind: "center" },
			},
			target: {
				anchor: { kind: "free", point: { x: 50, y: 50 } },
			},
		},
	],
} as unknown as CanvasDoc;
