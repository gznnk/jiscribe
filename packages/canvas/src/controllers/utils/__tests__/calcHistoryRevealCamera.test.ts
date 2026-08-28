import { describe, expect, it } from "vitest";

import type { Viewport } from "../../../states/canvas/Viewport";
import type { ObjectState } from "../../../states/objects/base/ObjectState";
import { calcHistoryRevealCamera } from "../calcHistoryRevealCamera";

/** Axis-aligned Frame-family state: bbox is left=cx-w/2, top=cy-h/2, ... */
const rect = (
	id: string,
	cx: number,
	cy: number,
	width = 100,
	height = 100,
): ObjectState =>
	({
		id,
		type: "rect",
		cx,
		cy,
		width,
		height,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
	}) as unknown as ObjectState;

/** Poly with no points: calcObjectBoundingBox has no extent for it. */
const emptyPolyline = (id: string): ObjectState =>
	({ id, type: "polyline", points: [] }) as unknown as ObjectState;

const toRecord = (objects: ObjectState[]): Record<string, ObjectState> =>
	Object.fromEntries(objects.map((object) => [object.id, object]));

/** Shows world (0,0)–(800,600); every case below is judged against this. */
const viewport: Viewport = {
	minX: 0,
	minY: 0,
	width: 800,
	height: 600,
	zoom: 1,
};

const visualBounds = { get: () => undefined };

const reveal = (params: {
	changedIds: string[];
	before: ObjectState[];
	after: ObjectState[];
	viewport?: Viewport;
}) =>
	calcHistoryRevealCamera({
		changedIds: params.changedIds,
		before: toRecord(params.before),
		after: toRecord(params.after),
		viewport: params.viewport ?? viewport,
		visualBounds,
	});

describe("calcHistoryRevealCamera", () => {
	it("does not move for a change already on screen", () => {
		const onScreen = [rect("rect-1", 400, 300)];

		expect(
			reveal({ changedIds: ["rect-1"], before: onScreen, after: onScreen }),
		).toBeNull();
	});

	it("does not move when the restore changed nothing", () => {
		const objects = [rect("rect-1", 5000, 5000)];

		expect(
			reveal({ changedIds: [], before: objects, after: objects }),
		).toBeNull();
	});

	it("pans the smallest distance that brings an off-screen change into view", () => {
		const before = [rect("rect-1", 400, 300)];
		const after = [rect("rect-1", 1200, 300)];

		// The box spans 1150–1250; showing its right edge with the 24px margin puts
		// the visible 800-wide rect at 1274 − 800. The zoom is left alone.
		expect(reveal({ changedIds: ["rect-1"], before, after })).toEqual({
			minX: 474,
			minY: 0,
			zoom: 1,
		});
	});

	it("reveals where an object the restore removed used to be", () => {
		const before = [rect("rect-1", 400, 300), rect("rect-2", 1200, 300)];
		const after = [rect("rect-1", 400, 300)];

		// rect-2 exists only in the state being left, and that is where it is shown.
		expect(reveal({ changedIds: ["rect-2"], before, after })).toEqual({
			minX: 474,
			minY: 0,
			zoom: 1,
		});
	});

	it("zooms out to frame a change too big to fit at the current zoom", () => {
		const before = [rect("rect-1", 400, 300)];
		const after = [rect("rect-1", 400, 300, 1600, 1200)];

		const camera = calcHistoryRevealCamera({
			changedIds: ["rect-1"],
			before: toRecord(before),
			after: toRecord(after),
			viewport,
			visualBounds,
		});

		// The tighter axis decides: 1200 tall into 600 − 2×24 of room is 0.46, just
		// under what the width alone would allow. The box ends up centered.
		expect(camera).not.toBeNull();
		expect(camera?.zoom).toBeCloseTo(0.46, 2);
		expect(camera?.minX).toBeCloseTo(400 - 800 / (2 * (camera?.zoom ?? 1)), 1);
	});

	it("never zooms out further than a quarter of the zoom the user set", () => {
		const before = [rect("rect-1", 400, 300)];
		// Ten times the viewport: fitting it whole would need zoom 0.05.
		const after = [rect("rect-1", 400, 300, 16000, 12000)];

		const camera = calcHistoryRevealCamera({
			changedIds: ["rect-1"],
			before: toRecord(before),
			after: toRecord(after),
			viewport,
			visualBounds,
		});

		expect(camera?.zoom).toBe(0.25);
		// It no longer fits, so the change is centered instead.
		expect(camera?.minX).toBe(400 - 800 / (2 * 0.25));
		expect(camera?.minY).toBe(300 - 600 / (2 * 0.25));
	});

	it("never zooms in", () => {
		const before = [rect("rect-1", 5000, 5000, 10, 10)];
		const after = [rect("rect-1", 5000, 5000, 10, 10)];

		const camera = reveal({
			changedIds: ["rect-1"],
			before,
			after,
			viewport: { ...viewport, zoom: 0.5 },
		});

		expect(camera?.zoom).toBe(0.5);
	});

	it("does not move for a change with no extent to show", () => {
		const objects = [emptyPolyline("poly-1")];

		expect(
			reveal({ changedIds: ["poly-1"], before: objects, after: objects }),
		).toBeNull();
	});

	it("does not move before the container has been measured", () => {
		const before = [rect("rect-1", 400, 300)];
		const after = [rect("rect-1", 9000, 300)];

		expect(
			reveal({
				changedIds: ["rect-1"],
				before,
				after,
				viewport: { ...viewport, width: 0, height: 0 },
			}),
		).toBeNull();
	});
});
