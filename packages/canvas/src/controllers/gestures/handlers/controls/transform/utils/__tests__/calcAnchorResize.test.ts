import type { TransformedFrame } from "@workspace/geometry";
import { calcFrameKeyPoints, degreesToRadians } from "@workspace/geometry";
import { describe, it, expect } from "vitest";

import type { TransformState } from "../../../../../../../states/objects/base/TransformState";
import { calcAnchorResize } from "../calcAnchorResize";

/**
 * Base frame: 100x50, centered at (50, 25), unrotated.
 * Key points (world space): topLeft (0,0), bottomRight (100,50), topCenter (50,0), etc.
 * inversedCenterX/Y are in the object's local space with the frame center as origin.
 */
const createStartFrame = (
	overrides: Partial<TransformedFrame & TransformState> = {},
): TransformedFrame & TransformState => ({
	cx: 50,
	cy: 25,
	width: 100,
	height: 50,
	rotation: 0,
	scaleX: 1,
	scaleY: 1,
	...overrides,
});

const resizeAt = (
	anchorType: Parameters<typeof calcAnchorResize>[0],
	cursorX: number,
	cursorY: number,
	frameOverrides: Partial<TransformedFrame & TransformState> = {},
	doKeepProportion = false,
) => {
	const startFrame = createStartFrame(frameOverrides);
	const aspectRatio =
		startFrame.height !== 0 && startFrame.width !== 0
			? startFrame.width / startFrame.height
			: undefined;
	return calcAnchorResize(
		anchorType,
		startFrame,
		cursorX,
		cursorY,
		calcFrameKeyPoints(startFrame),
		degreesToRadians(startFrame.rotation),
		aspectRatio,
		doKeepProportion,
	);
};

describe("calcAnchorResize", () => {
	describe("corner anchors (unrotated)", () => {
		it("bottomRight: topLeft stays fixed, size follows the cursor", () => {
			expect(resizeAt("bottomRight", 120, 80)).toEqual({
				width: 120,
				height: 80,
				inversedCenterX: 10,
				inversedCenterY: 15,
				scaleX: 1,
				scaleY: 1,
			});
		});

		it("topLeft: bottomRight stays fixed", () => {
			expect(resizeAt("topLeft", 20, 10)).toEqual({
				width: 80,
				height: 40,
				inversedCenterX: 10,
				inversedCenterY: 5,
				scaleX: 1,
				scaleY: 1,
			});
		});

		it("topRight: bottomLeft stays fixed", () => {
			expect(resizeAt("topRight", 120, -10)).toEqual({
				width: 120,
				height: 60,
				inversedCenterX: 10,
				inversedCenterY: -5,
				scaleX: 1,
				scaleY: 1,
			});
		});

		it("bottomLeft: topRight stays fixed", () => {
			expect(resizeAt("bottomLeft", -20, 60)).toEqual({
				width: 120,
				height: 60,
				inversedCenterX: -10,
				inversedCenterY: 5,
				scaleX: 1,
				scaleY: 1,
			});
		});

		it("flips the scale sign when the cursor crosses the opposite corner", () => {
			expect(resizeAt("bottomRight", -20, 30)).toEqual({
				width: -20,
				height: 30,
				inversedCenterX: -60,
				inversedCenterY: -10,
				scaleX: -1,
				scaleY: 1,
			});
		});
	});

	describe("edge anchors (unrotated)", () => {
		it("rightCenter: only the width changes, cursor is projected onto the horizontal axis", () => {
			expect(resizeAt("rightCenter", 150, 999)).toEqual({
				width: 150,
				height: 50,
				inversedCenterX: 25,
				inversedCenterY: 0,
				scaleX: 1,
				scaleY: 1,
			});
		});

		it("leftCenter: only the width changes", () => {
			expect(resizeAt("leftCenter", 30, 999)).toEqual({
				width: 70,
				height: 50,
				inversedCenterX: 15,
				inversedCenterY: 0,
				scaleX: 1,
				scaleY: 1,
			});
		});

		it("topCenter: only the height changes, cursor is projected onto the vertical axis", () => {
			expect(resizeAt("topCenter", 999, -25)).toEqual({
				width: 100,
				height: 75,
				inversedCenterX: 0,
				inversedCenterY: -12.5,
				scaleX: 1,
				scaleY: 1,
			});
		});

		it("bottomCenter: only the height changes", () => {
			expect(resizeAt("bottomCenter", 999, 80)).toEqual({
				width: 100,
				height: 80,
				inversedCenterX: 0,
				inversedCenterY: 15,
				scaleX: 1,
				scaleY: 1,
			});
		});

		it("keeps the current scale on the axis the anchor does not move", () => {
			expect(resizeAt("rightCenter", 150, 25, { scaleY: -1 })).toMatchObject({
				scaleX: 1,
				scaleY: -1,
			});
		});
	});

	describe("keep proportion", () => {
		it("corner: projects the cursor onto the diagonal and derives the height from the width", () => {
			// The diagonal of a 100x50 frame; (120, 80) projects to (128, 64)
			expect(resizeAt("bottomRight", 120, 80, {}, true)).toEqual({
				width: 128,
				height: 64,
				inversedCenterX: 14,
				inversedCenterY: 7,
				scaleX: 1,
				scaleY: 1,
			});
		});

		it("horizontal edge: derives the height from the width", () => {
			expect(resizeAt("rightCenter", 150, 25, {}, true)).toMatchObject({
				width: 150,
				height: 75,
			});
		});

		it("vertical edge: derives the width from the height", () => {
			expect(resizeAt("topCenter", 50, -25, {}, true)).toMatchObject({
				width: 150,
				height: 75,
			});
		});
	});

	describe("minimum size enforcement", () => {
		it("clamps both dimensions to the minimum values", () => {
			expect(
				resizeAt("bottomRight", 10, 5, { minWidth: 30, minHeight: 20 }),
			).toEqual({
				width: 30,
				height: 20,
				inversedCenterX: -35,
				inversedCenterY: -15,
				scaleX: 1,
				scaleY: 1,
			});
		});
	});

	describe("rotated frame", () => {
		it("bottomRight at 180 degrees: computes in the local space", () => {
			// At 180 degrees, world (x, y) maps to local (cx - x, cy - y)
			expect(resizeAt("bottomRight", -20, -30, { rotation: 180 })).toEqual({
				width: 120,
				height: 80,
				inversedCenterX: 10,
				inversedCenterY: 15,
				scaleX: 1,
				scaleY: 1,
			});
		});
	});

	describe("non-resize anchors", () => {
		it("returns null for the rotation anchor", () => {
			expect(resizeAt("rotation", 100, 100)).toBeNull();
		});
	});
});
