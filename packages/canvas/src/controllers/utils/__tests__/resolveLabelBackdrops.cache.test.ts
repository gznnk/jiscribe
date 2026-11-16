import { advanceTextMeasurementGeneration } from "@jiscribe/doc/text/measure/textMeasurementSlot";
import { beforeEach, describe, expect, it } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import { createTestRegistries } from "../../registries/createCanvasRegistries";
import { createTextSlotPartKindDefinition } from "../../selection/partKinds/textSlotPartKind";
import { createCowObjects } from "../cowObjects";
import { resolveLabelBackdrops } from "../resolveLabelBackdrops";

/**
 * What a pass works out again for an object it did not change: nothing. A
 * caption is placed once per object state, text measurement and part kind, so
 * a keystroke or a nudge elsewhere does not place it again.
 */

const captionRegionCalls = { count: 0 };

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
registries.objectPartKind.register("captioned", [
	createTextSlotPartKindDefinition({
		region: () => {
			captionRegionCalls.count += 1;
			return { x: -20, y: 25, width: 40, height: 20 };
		},
	}),
]);

const frame = {
	id: "frame",
	type: "frame",
	cx: 100,
	cy: 100,
	width: 400,
	height: 400,
	rotation: 0,
	scaleX: 1,
	scaleY: 1,
	fill: "#ff0000",
	fillOpacity: 1,
} as unknown as ObjectState;

const captioned = (cx: number): ObjectState =>
	({
		id: "shape",
		type: "captioned",
		features: { type: "captioned", geometry: "rect", text: "label" },
		cx,
		cy: 80,
		width: 40,
		height: 40,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
		text: { body: { text: "Caption" } },
	}) as unknown as ObjectState;

const resolve = (...objects: ObjectState[]) =>
	resolveLabelBackdrops(
		Object.fromEntries(objects.map((obj) => [obj.id, obj])),
		objects.map((obj) => obj.id),
		registries,
	);

describe("resolveLabelBackdrops caches", () => {
	beforeEach(() => {
		captionRegionCalls.count = 0;
	});

	it("places an unchanged caption once, and again once the text measurement moves", () => {
		const shape = captioned(100);
		resolve(frame, shape);
		resolve(frame, shape);
		resolve({ ...frame } as ObjectState, shape);
		expect(captionRegionCalls.count).toBe(1);

		// A changed state is placed afresh.
		const moved = resolve(frame, captioned(120));
		expect(captionRegionCalls.count).toBe(2);
		expect(moved.get("shape")).toHaveLength(1);

		advanceTextMeasurementGeneration();
		resolve(frame, shape);
		expect(captionRegionCalls.count).toBe(3);
	});

	it("places only the dragged caption again on each frame of a drag, the untouched one never", () => {
		const still = { ...captioned(60), id: "still" } as ObjectState;
		const base = { frame, shape: captioned(100), still };
		const rootIds = ["frame", "shape", "still"];
		resolveLabelBackdrops(base, rootIds, registries);
		expect(captionRegionCalls.count).toBe(2);

		// Each frame of the drag hands a new state for "shape" alone.
		for (const cx of [110, 120, 130]) {
			const view = createCowObjects<ObjectState>(base);
			view.shape = captioned(cx);
			resolveLabelBackdrops(view, rootIds, registries);
		}
		expect(captionRegionCalls.count).toBe(5);
	});

	it("places a caption again through a canvas whose part kind places it elsewhere", () => {
		const shape = captioned(100);
		const first = resolve(frame, shape);
		expect(captionRegionCalls.count).toBe(1);

		// The same state drawn by another canvas, whose caption hangs far below
		// the box, its center past the frame's bottom edge at y 300.
		const otherRegionCalls = { count: 0 };
		const otherRegistries = createTestRegistries();
		otherRegistries.objectLabelBackdrop.register(
			"frame",
			registries.objectLabelBackdrop.get("frame")!,
		);
		otherRegistries.objectPartKind.register("captioned", [
			createTextSlotPartKindDefinition({
				region: () => {
					otherRegionCalls.count += 1;
					return { x: -20, y: 300, width: 40, height: 20 };
				},
			}),
		]);
		const other = resolveLabelBackdrops(
			{ frame, shape },
			["frame", "shape"],
			otherRegistries,
		);

		expect(otherRegionCalls.count).toBe(1);
		expect(first.get("shape")).toHaveLength(1);
		expect(other.has("shape")).toBe(false);
	});
});
