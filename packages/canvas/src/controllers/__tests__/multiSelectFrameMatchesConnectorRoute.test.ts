import { describe, expect, it } from "vitest";

import { outlinedPlugin } from "./support/outlinedPlugin";
import {
	createPortedExtraConnectPoints,
	eastToEastConnector,
	portedShape,
} from "./support/portedExtraConnectPoints";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import type { GroupState } from "../../states/objects/primitives/group/GroupState";
import { calcMultiSelectGroupBounds } from "../gestures/handlers/controls/transform/utils/calcMultiSelectGroupBounds";
import {
	calcMultiSelectGroupBoundsFromCache,
	createMultiSelectResizeBoundsCache,
} from "../gestures/handlers/controls/transform/utils/multiSelectResizeBoundsCache";
import { createCanvasRegistries } from "../registries/createCanvasRegistries";
import { createMultiSelectGroup } from "../selection/readers/createMultiSelectGroup";
import type { ConnectorRouteRegistries } from "../utils/VisualExtentRegistries";

/**
 * The multi-select frame against the drawn connector route (#334): built when the
 * selection is made (createMultiSelectGroup) and re-derived on every resize frame
 * (the dragStart cache, or the full point collection without one), all three from
 * the same points, so the frame sits on what is drawn and does not jump when a
 * drag starts.
 */

/** The canvas registries with the `outlined` type and the `ported` type's `east` point. */
const createRegistries = (): ConnectorRouteRegistries => ({
	...createCanvasRegistries({ plugins: [outlinedPlugin] }),
	objectExtraConnectPoints: createPortedExtraConnectPoints(),
});

const rect = (
	id: string,
	cx: number,
	cy: number,
	width: number,
	height: number,
	rotation = 0,
): ObjectState =>
	({
		id,
		type: "rect",
		cx,
		cy,
		width,
		height,
		rotation,
		scaleX: 1,
		scaleY: 1,
	}) as unknown as ObjectState;

/** A 200x100 `outlined` shape on the origin; its silhouette ends at y = 25, not 50. */
const outlinedShape = (id: string): ObjectState =>
	({
		id,
		type: "outlined",
		features: { type: "outlined", geometry: "rect" },
		cx: 0,
		cy: 0,
		width: 200,
		height: 100,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
	}) as unknown as ObjectState;

/** A straight connector leaving the shape's center anchor down to (0, 500). */
const fromCenterDownConnector = (id: string, ownerId: string): ObjectState =>
	({
		id,
		type: "connector",
		points: [],
		routing: "straight",
		source: { owner: { id: ownerId }, anchor: { kind: "center" } },
		target: { anchor: { kind: "free", point: { x: 0, y: 500 } } },
	}) as unknown as ObjectState;

/** A straight connector from (0, 100) to (400, 100) whose label sits on the source end. */
const labeledConnector = (id: string): ObjectState =>
	({
		id,
		type: "connector",
		points: [],
		routing: "straight",
		source: { anchor: { kind: "free", point: { x: 0, y: 100 } } },
		target: { anchor: { kind: "free", point: { x: 400, y: 100 } } },
		label: { text: "Yes", position: 0 },
	}) as unknown as ObjectState;

/** The frame's four edges, so a mismatch reads as the edge that moved. */
const edgesOf = (frame: {
	cx: number;
	cy: number;
	width: number;
	height: number;
}) => ({
	left: frame.cx - frame.width / 2,
	top: frame.cy - frame.height / 2,
	right: frame.cx + frame.width / 2,
	bottom: frame.cy + frame.height / 2,
});

const expectSameFrame = (
	actual: { cx: number; cy: number; width: number; height: number } | null,
	expected: { cx: number; cy: number; width: number; height: number },
) => {
	expect(actual).not.toBeNull();
	expect(actual!.cx).toBeCloseTo(expected.cx, 6);
	expect(actual!.cy).toBeCloseTo(expected.cy, 6);
	expect(actual!.width).toBeCloseTo(expected.width, 6);
	expect(actual!.height).toBeCloseTo(expected.height, 6);
};

/**
 * The frame of the resize drag's first frame (nothing moved yet), through both
 * paths TransformControlHandler takes: the dragStart cache, and the full point
 * collection it falls back to.
 */
const calcFirstDragFrames = (
	selectedIds: string[],
	objects: Record<string, ObjectState>,
	startGroup: GroupState,
	registries: ConnectorRouteRegistries,
) => {
	const cache = createMultiSelectResizeBoundsCache(
		selectedIds,
		objects,
		startGroup,
	);
	return {
		fromCache: calcMultiSelectGroupBoundsFromCache(
			cache,
			objects,
			startGroup,
			startGroup,
			registries,
		),
		fromPoints: calcMultiSelectGroupBounds(
			selectedIds,
			objects,
			registries,
			startGroup,
		),
	};
};

describe("multi-select frame over a connector's drawn route", () => {
	it("puts an end on an outline shape's center anchor at the silhouette, not the box edge", () => {
		const objects = {
			ol1: outlinedShape("ol1"),
			c1: fromCenterDownConnector("c1", "ol1"),
			r2: rect("r2", 300, 300, 20, 20),
		};

		const group = createMultiSelectGroup(
			["c1", "r2"],
			objects,
			createRegistries(),
		);

		expect(group).not.toBeNull();
		const edges = edgesOf(group!);
		expect(edges.top).toBeCloseTo(25, 6);
		expect(edges.bottom).toBeCloseTo(500, 6);
		expect(edges.left).toBeCloseTo(0, 6);
		expect(edges.right).toBeCloseTo(310, 6);
	});

	it("covers the stubs of an orthogonal route between type-declared anchors", () => {
		const objects = {
			a: portedShape("a", 50, 50),
			b: portedShape("b", 50, 300),
			c1: eastToEastConnector("c1", "a", "b"),
		};

		const group = createMultiSelectGroup(
			["a", "b", "c1"],
			objects,
			createRegistries(),
		);

		// The shapes reach x = 100; the route leaves both east anchors 30px further.
		expect(group).not.toBeNull();
		const edges = edgesOf(group!);
		expect(edges.left).toBeCloseTo(0, 6);
		expect(edges.right).toBeCloseTo(130, 6);
		expect(edges.top).toBeCloseTo(0, 6);
		expect(edges.bottom).toBeCloseTo(350, 6);
	});

	it("leaves a connector's label out, so every path re-deriving the frame keeps the start frame", () => {
		const registries = createRegistries();
		const selectedIds = ["r1", "r2", "c1"];
		const objects = {
			r1: rect("r1", 50, 50, 100, 100),
			r2: rect("r2", 350, 50, 100, 100),
			c1: labeledConnector("c1"),
		};

		const startGroup = createMultiSelectGroup(selectedIds, objects, registries);

		// The label box centered on (0, 100) would reach left of 0 and below 100.
		expect(startGroup).not.toBeNull();
		expectSameFrame(startGroup, { cx: 200, cy: 50, width: 400, height: 100 });
		const { fromCache, fromPoints } = calcFirstDragFrames(
			selectedIds,
			objects,
			startGroup!,
			registries,
		);
		expectSameFrame(fromCache, startGroup!);
		expectSameFrame(fromPoints, startGroup!);
		expectSameFrame(
			calcMultiSelectGroupBounds(selectedIds, objects, registries),
			startGroup!,
		);
	});

	it("builds the same frame at selection time as the resize drag derives from the same objects", () => {
		const registries = createRegistries();
		const objects: Record<string, ObjectState> = {
			ol1: outlinedShape("ol1"),
			c1: fromCenterDownConnector("c1", "ol1"),
			a: portedShape("a", 400, 50),
			b: portedShape("b", 400, 300),
			c2: eastToEastConnector("c2", "a", "b"),
			c3: labeledConnector("c3"),
			tilted: rect("tilted", -200, 200, 80, 40, 30),
			g: {
				id: "g",
				type: "group",
				childIds: ["a", "b", "c2"],
			} as unknown as ObjectState,
		};
		const selectedIds = ["ol1", "c1", "g", "c3", "tilted"];

		const startGroup = createMultiSelectGroup(selectedIds, objects, registries);

		expect(startGroup).not.toBeNull();
		const { fromCache, fromPoints } = calcFirstDragFrames(
			selectedIds,
			objects,
			startGroup!,
			registries,
		);
		expectSameFrame(fromCache, startGroup!);
		expectSameFrame(fromPoints, startGroup!);
		expectSameFrame(
			calcMultiSelectGroupBounds(selectedIds, objects, registries),
			startGroup!,
		);
	});
});
