import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { ResizedAxes } from "../../../states/registry/ObjectContentResizerRegistry";
import type { TransformDragResize } from "../../CanvasTypes";
import { calcObjectResizedAxes } from "../calcObjectResizedAxes";

const objectWith = (
	rotation: number,
	scaleX: 1 | -1 = 1,
	scaleY: 1 | -1 = 1,
): ObjectState =>
	({
		id: "o",
		type: "rect",
		cx: 0,
		cy: 0,
		width: 100,
		height: 50,
		rotation,
		scaleX,
		scaleY,
	}) as unknown as ObjectState;

const resizeOf = (
	axes: ResizedAxes,
	rotation = 0,
	scaleX: 1 | -1 = 1,
	scaleY: 1 | -1 = 1,
): TransformDragResize => ({
	axes,
	frame: { rotation, scaleX, scaleY },
});

describe("calcObjectResizedAxes", () => {
	it("hands back the drag's own axes for an object aligned with the frame", () => {
		const resize = resizeOf({ width: "end" }, 30);

		expect(calcObjectResizedAxes(resize, objectWith(30))).toBe(resize.axes);
	});

	it("reads an object without a transform as unrotated and unflipped", () => {
		const resize = resizeOf({ height: "start" });
		const plain = { id: "p", type: "connector" } as unknown as ObjectState;

		expect(calcObjectResizedAxes(resize, plain)).toBe(resize.axes);
	});

	it("swaps the axes of an object turned 90°, the frame's width becoming its height", () => {
		// The frame's +x runs along the object's -y at 90°, so the frame's end
		// (right) edge is the object's start (top) one.
		expect(
			calcObjectResizedAxes(resizeOf({ width: "end" }), objectWith(90)),
		).toEqual({ height: "start" });
		expect(
			calcObjectResizedAxes(resizeOf({ height: "end" }), objectWith(90)),
		).toEqual({ width: "end" });
	});

	it("turns the held edges round for an object turned 180°", () => {
		expect(
			calcObjectResizedAxes(
				resizeOf({ width: "start", height: "end" }),
				objectWith(180),
			),
		).toEqual({ width: "end", height: "start" });
	});

	it("turns the held edge round for an object flipped against the frame", () => {
		expect(
			calcObjectResizedAxes(resizeOf({ width: "start" }), objectWith(0, -1)),
		).toEqual({ width: "end" });
		expect(
			calcObjectResizedAxes(resizeOf({ width: "start" }, 0, -1), objectWith(0)),
		).toEqual({ width: "end" });
	});

	it("reads the rotation against the frame's own, a frame turned 30° and an object turned 120° being 90° apart", () => {
		// Relative to the frame the object's +y runs along the frame's -x and its +x
		// along the frame's +y, as for an object turned 90° in an unrotated frame.
		expect(
			calcObjectResizedAxes(resizeOf({ width: "end" }, 30), objectWith(120)),
		).toEqual({ height: "start" });
		expect(
			calcObjectResizedAxes(resizeOf({ height: "end" }, 30), objectWith(120)),
		).toEqual({ width: "end" });
	});

	it("turns the held height round for a frame flipped on its y axis", () => {
		// The flipped frame's top key points lie on the screen's bottom, which is
		// the unflipped object's bottom (end) edge; the widths still agree.
		expect(
			calcObjectResizedAxes(
				resizeOf({ width: "start", height: "start" }, 0, 1, -1),
				objectWith(0),
			),
		).toEqual({ width: "start", height: "end" });
	});

	it("turns the held height round for an object flipped on its y axis", () => {
		expect(
			calcObjectResizedAxes(
				resizeOf({ width: "start", height: "start" }),
				objectWith(0, 1, -1),
			),
		).toEqual({ width: "start", height: "end" });
	});

	it("turns both held edges round for an object flipped on both axes, as for one turned 180°", () => {
		// Flipping both axes is the 180° turn: each local axis points the other way.
		expect(
			calcObjectResizedAxes(
				resizeOf({ width: "start", height: "end" }),
				objectWith(0, -1, -1),
			),
		).toEqual({ width: "end", height: "start" });
	});

	it("reads a relative rotation outside 0–360° as the turn it lands on", () => {
		// -90° is 270°: the object's +x runs along the frame's -y and its +y along
		// the frame's +x. 450° is 90°: +x along the frame's +y, +y along its -x.
		expect(
			calcObjectResizedAxes(
				resizeOf({ width: "end", height: "start" }),
				objectWith(-90),
			),
		).toEqual(
			calcObjectResizedAxes(
				resizeOf({ width: "end", height: "start" }),
				objectWith(270),
			),
		);
		expect(
			calcObjectResizedAxes(
				resizeOf({ width: "end", height: "start" }),
				objectWith(-90),
			),
		).toEqual({ width: "end", height: "end" });
		expect(
			calcObjectResizedAxes(
				resizeOf({ width: "end", height: "start" }),
				objectWith(450),
			),
		).toEqual({ width: "start", height: "start" });
	});

	it("keeps the middle held as the middle", () => {
		expect(
			calcObjectResizedAxes(
				resizeOf({ width: "center", height: "start" }),
				objectWith(270),
			),
		).toEqual({ width: "end", height: "center" });
	});

	it("writes both axes of an oblique object, the one its frame axis leaves alone about its middle", () => {
		expect(
			calcObjectResizedAxes(resizeOf({ width: "start" }), objectWith(30)),
		).toEqual({ width: "start", height: "center" });
	});

	it("writes nothing on an oblique object when the drag writes nothing", () => {
		expect(calcObjectResizedAxes(resizeOf({}), objectWith(30))).toEqual({});
	});
});
