import { describe, expect, it } from "vitest";

import type { GroupState } from "../../../../states/objects/primitives/group/GroupState";
import type { TextState } from "../../../../states/objects/primitives/text/TextState";
import {
	rotateFrameByGroup,
	transformFrameByGroup,
} from "../../base/FrameTransform";
import {
	moveByDelta,
	rotateByGroup,
	transformByGroup,
} from "../TextController";

const makeText = (overrides?: Partial<TextState>): TextState =>
	({
		id: "text-1",
		type: "text",
		cx: 60,
		cy: 40,
		width: 80,
		height: 28,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
		text: { body: { text: "hello", fontSize: 16 } },
		...overrides,
	}) as unknown as TextState;

const makeGroup = (overrides?: Partial<GroupState>): GroupState =>
	({
		id: "group-1",
		type: "group",
		cx: 0,
		cy: 0,
		width: 100,
		height: 100,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
		childIds: ["text-1"],
		...overrides,
	}) as unknown as GroupState;

describe("TextController.moveByDelta", () => {
	it("translates the center by the delta", () => {
		const result = moveByDelta(makeText(), { x: 5, y: -5 });

		expect(result.cx).toBe(65);
		expect(result.cy).toBe(35);
	});

	it("leaves the measured box alone, a move changing nothing about the text", () => {
		const src = makeText();
		const result = moveByDelta(src, { x: 5, y: -5 });

		expect(result.width).toBe(src.width);
		expect(result.height).toBe(src.height);
	});

	it("does not mutate the original state", () => {
		const src = makeText();
		moveByDelta(src, { x: 5, y: -5 });

		expect(src.cx).toBe(60);
		expect(src.cy).toBe(40);
	});
});

describe("TextController.transformByGroup", () => {
	it("keeps the box it already has when the group is scaled", () => {
		// The size is measured from the text, so scaling it would leave the box
		// disagreeing with what is drawn inside it — a break that survives a reload,
		// since reconcileObjectContentSizes skips objects holding the same slots.
		const text = makeText();
		const start = makeGroup({ width: 100, height: 100 });
		const end = makeGroup({ width: 300, height: 200 });

		const result = transformByGroup(text, start, end);

		expect(result.width).toBe(text.width);
		expect(result.height).toBe(text.height);
	});

	it("takes everything but the size from the shared Frame math", () => {
		// Position, rotation and flips still follow the group; only width/height are
		// held back, so a text in a resized group lands where a rect would.
		const text = makeText({ cx: 20, cy: 10 });
		const start = makeGroup({ width: 100, height: 100 });
		const end = makeGroup({ width: 300, height: 200, rotation: 30 });

		const result = transformByGroup(text, start, end);
		const framed = transformFrameByGroup(text, start, end);

		expect(result).toEqual({
			...framed,
			width: text.width,
			height: text.height,
		});
		expect(result.cx).not.toBe(text.cx);
	});

	it("keeps the box of a rotated text, whose size the Frame math would mix across axes", () => {
		// At a quarter turn the shared math sends the group's height scale into the
		// child's width, so a rotated text is where an unheld size goes most wrong.
		const text = makeText({ rotation: 90 });
		const start = makeGroup({ width: 100, height: 100 });
		const end = makeGroup({ width: 100, height: 400 });

		const result = transformByGroup(text, start, end);

		expect(transformFrameByGroup(text, start, end).width).not.toBe(text.width);
		expect(result.width).toBe(text.width);
		expect(result.height).toBe(text.height);
	});

	it("does not mutate the original state", () => {
		const src = makeText();
		transformByGroup(src, makeGroup(), makeGroup({ width: 300 }));

		expect(src.width).toBe(80);
		expect(src.cx).toBe(60);
	});
});

describe("TextController.rotateByGroup", () => {
	it("delegates to rotateFrameByGroup, rotation being stored in the doc", () => {
		const text = makeText({ cx: 40, cy: 0 });
		const group = makeGroup({ rotation: 0 });

		expect(rotateByGroup(text, group, 90)).toEqual(
			rotateFrameByGroup(text, group, 90),
		);
	});
});
