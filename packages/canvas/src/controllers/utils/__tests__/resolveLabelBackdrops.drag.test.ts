import { beforeEach, describe, expect, it, vi } from "vitest";

import type { MovePreview } from "../../../rendering/layers/content/MovePreview";
import type * as ResolveConnectorPointsModule from "../../../rendering/objects/connector/geometry/endpoints/resolveConnectorPoints";
import type { ObjectState } from "../../../states/objects/base/ObjectState";
import { createTestRegistries } from "../../registries/createCanvasRegistries";
import { createCowObjects } from "../cowObjects";
import {
	resolveLabelBackdropPass,
	resolveLabelBackdrops,
} from "../resolveLabelBackdrops";
import type { LabelBackdropDrag } from "../resolveLabelBackdrops";

/**
 * Mid-drag, a connector's label is judged without routing what the drawing
 * does not route either: one moved with both its owners from its start route
 * shifted by the delta, one off screen by the center it last had. The pass
 * after the drop routes it again.
 */

/** How often a connector was routed, every call passed through. */
const routeCalls = vi.hoisted(() => ({ count: 0 }));

vi.mock(
	"../../../rendering/objects/connector/geometry/endpoints/resolveConnectorPoints",
	async (importOriginal) => {
		const actual = await importOriginal<typeof ResolveConnectorPointsModule>();
		return {
			...actual,
			resolveConnectorPoints: (
				...args: Parameters<typeof actual.resolveConnectorPoints>
			) => {
				routeCalls.count += 1;
				return actual.resolveConnectorPoints(...args);
			},
		};
	},
);

const registries = createTestRegistries();
registries.objectLabelBackdrop.register("frame", (state, style) => {
	const { width, height } = state as ObjectState & {
		width: number;
		height: number;
	};
	return [
		{
			rect: { x: -width / 2, y: -height / 2, width, height },
			fill: style.fillColor,
			fillOpacity: style.fillAlpha,
		},
	];
});

const rect = (id: string, cx: number): ObjectState =>
	({
		id,
		type: "rect",
		cx,
		cy: 0,
		width: 20,
		height: 20,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
	}) as unknown as ObjectState;

/** A frame spanning x -100..90: the label, centered between its owners at x 50, starts on it. */
const frame = {
	id: "frame",
	type: "frame",
	cx: -5,
	cy: 0,
	width: 190,
	height: 200,
	rotation: 0,
	scaleX: 1,
	scaleY: 1,
	fill: "#ff0000",
	fillOpacity: 1,
} as unknown as ObjectState;

const connector = {
	id: "connector",
	type: "connector",
	points: [],
	routing: "straight",
	source: { owner: { id: "a" }, anchor: { kind: "center" } },
	target: { owner: { id: "b" }, anchor: { kind: "center" } },
	label: { text: "go" },
} as unknown as ObjectState;

const ROOT_IDS = ["frame", "a", "b", "connector"];
const ALL_IDS = new Set(ROOT_IDS);

/** The objects before the drag, and the pass that has already routed them. */
const startDrag = () => {
	const startObjects: Record<string, ObjectState> = {
		frame,
		a: rect("a", 0),
		b: rect("b", 100),
		connector,
	};
	resolveLabelBackdrops(startObjects, ROOT_IDS, registries);
	return startObjects;
};

/** One frame of a move by `dx` of the owners `movedIds`, as the move handler hands it on. */
const dragFrame = (
	startObjects: Record<string, ObjectState>,
	movedIds: string[],
	dx: number,
	visibleIds: ReadonlySet<string> = ALL_IDS,
): { objects: Record<string, ObjectState>; drag: LabelBackdropDrag } => {
	const objects = createCowObjects(startObjects);
	for (const id of movedIds) {
		objects[id] = rect(
			id,
			(startObjects[id] as ObjectState & { cx: number }).cx + dx,
		);
	}
	const movePreview: MovePreview = {
		delta: { x: dx, y: 0 },
		translatedIds: new Set(movedIds),
		startObjects,
	};
	return { objects, drag: { movePreview, visibleIds } };
};

const resolveFrame = (frameObjects: {
	objects: Record<string, ObjectState>;
	drag?: LabelBackdropDrag;
}) =>
	resolveLabelBackdrops(
		frameObjects.objects,
		ROOT_IDS,
		registries,
		undefined,
		undefined,
		frameObjects.drag,
	);

describe("resolveLabelBackdrops mid-drag", () => {
	beforeEach(() => {
		routeCalls.count = 0;
	});

	it("follows a connector moved with both its owners across a frame's border, routing nothing", () => {
		const startObjects = startDrag();
		routeCalls.count = 0;

		// The label's center moves from x 50 to 70 (still on the frame) to 110 (past its edge at 90).
		expect(
			resolveFrame(dragFrame(startObjects, ["a", "b"], 20)).has("connector"),
		).toBe(true);
		expect(
			resolveFrame(dragFrame(startObjects, ["a", "b"], 60)).has("connector"),
		).toBe(false);
		expect(routeCalls.count).toBe(0);
	});

	it("still routes a connector moved with one of its owners", () => {
		const startObjects = startDrag();
		routeCalls.count = 0;

		// Only "b" moves: the center moves by half the delta, from x 50 to 110.
		const backdrops = resolveFrame(dragFrame(startObjects, ["b"], 120));
		expect(routeCalls.count).toBe(1);
		expect(backdrops.has("connector")).toBe(false);
	});

	it("keeps an off-screen connector's last center until the drag ends, and works it out exactly after the drop", () => {
		const startObjects = startDrag();
		routeCalls.count = 0;
		const offScreen = new Set(["frame", "a", "b"]);

		// Moved past the frame's edge, but off screen: the center it had (x 50) stands.
		const moved = dragFrame(startObjects, ["b"], 120, offScreen);
		expect(resolveFrame(moved).has("connector")).toBe(true);
		expect(routeCalls.count).toBe(0);

		// The drop: the same objects, flattened, with no drag.
		const dropped = { ...moved.objects };
		const backdrops = resolveFrame({ objects: dropped });
		expect(routeCalls.count).toBe(1);
		expect(backdrops.has("connector")).toBe(false);
	});

	it("answers after the drop what a fresh resolution answers", () => {
		const startObjects = startDrag();
		const moved = dragFrame(startObjects, ["a", "b"], 60);
		resolveFrame(moved);

		const dropped = { ...moved.objects };
		const fresh = {
			...dropped,
			connector: { ...connector } as ObjectState,
		};
		expect(resolveFrame({ objects: dropped })).toEqual(
			resolveFrame({ objects: fresh }),
		);
	});

	it("says when a center was taken from the drag, and only then", () => {
		const startObjects = startDrag();
		const passOf = (frameObjects: {
			objects: Record<string, ObjectState>;
			drag?: LabelBackdropDrag;
		}) =>
			resolveLabelBackdropPass(
				frameObjects.objects,
				ROOT_IDS,
				registries,
				undefined,
				undefined,
				frameObjects.drag,
			).isApproximate;

		expect(passOf(dragFrame(startObjects, ["a", "b"], 20))).toBe(true);
		expect(
			passOf(dragFrame(startObjects, ["b"], 20, new Set(["frame", "a", "b"]))),
		).toBe(true);
		expect(passOf(dragFrame(startObjects, ["b"], 20))).toBe(false);
		expect(passOf({ objects: startObjects })).toBe(false);
	});
});
