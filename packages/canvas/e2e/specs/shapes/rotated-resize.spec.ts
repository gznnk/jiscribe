import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * Resizing after a rotation, and rotation keeping the center.
 *
 * resize.spec only covers unrotated shapes. Resizing a rotated shape needs the
 * handle movement converted onto the shape's local axes, which is easy to break
 * in a refactor: computing on the screen axes is the classic bug where grabbing
 * a rotated shape makes it thrash.
 *
 * The shape's local size lives in the rect's width/height attributes and its
 * center in matrix(e,f) of the transform, so those invariants are the guard.
 */

/**
 * Returns the shape's center in content coordinates; the center is the rotation
 * axis, so it holds under rotation. boundingBox is in screen coordinates, hence
 * toContent() to reach the coordinates the driver takes as input.
 */
async function screenCenterOf(
	canvas: CanvasDriver,
	id: string,
): Promise<{ x: number; y: number }> {
	const box = await canvas.objectById(id).boundingBox();
	if (!box) {
		throw new Error(`cannot read the boundingBox of shape ${id}`);
	}
	return canvas.toContent({
		x: box.x + box.width / 2,
		y: box.y + box.height / 2,
	});
}

/** Extracts (e,f), the center, from transform="matrix(a, b, c, d, e, f)". */
function matrixCenter(transform: string | null): { x: number; y: number } {
	const nums = transform?.match(/-?\d+(?:\.\d+)?/g)?.map(Number);
	if (!nums || nums.length < 6) {
		throw new Error(`cannot parse the transform: ${transform}`);
	}
	return { x: nums[4], y: nums[5] };
}

test.describe("resizing after a rotation", () => {
	test("resizes along the local axes after a 90 degree rotation, changing only the height", async ({
		canvas,
	}) => {
		// 200x120 rect centered at (500,260)
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);
		const rect = canvas.objectById(id);
		const widthBefore = Number(await rect.getAttribute("width"));
		const heightBefore = Number(await rect.getAttribute("height"));

		// Drop the rotation handle straight to the right of the center for exactly 90 degrees
		await canvas.dragTransformHandle("rotation", { x: 700, y: 260 });
		await expect
			.poll(() => rect.getAttribute("transform"), {
				message: "the transform changes on rotation",
			})
			.not.toBe("matrix(1, 0, 0, 1, 500, 260)");

		// Drag the bottomCenter handle 80px outward along the local direction (center to handle).
		// After the 90 degree rotation that direction is horizontal on screen but is the local height axis.
		const center = await screenCenterOf(canvas, id);
		const handleBox = await canvas.page
			.locator(selectors.transformControl("bottomCenter"))
			.boundingBox();
		if (!handleBox) {
			throw new Error("cannot locate the bottomCenter handle");
		}
		// handleBox is in screen coordinates, so convert it to match center in content coordinates.
		const handleCenter = canvas.toContent({
			x: handleBox.x + handleBox.width / 2,
			y: handleBox.y + handleBox.height / 2,
		});
		const dx = handleCenter.x - center.x;
		const dy = handleCenter.y - center.y;
		const len = Math.hypot(dx, dy) || 1;
		const target = {
			x: handleCenter.x + (dx / len) * 80,
			y: handleCenter.y + (dy / len) * 80,
		};

		await canvas.dragTransformHandle("bottomCenter", target);

		await expect
			.poll(() => rect.getAttribute("height"), {
				message: "the local height changes",
			})
			.not.toBe(String(heightBefore));

		const widthAfter = Number(await rect.getAttribute("width"));
		const heightAfter = Number(await rect.getAttribute("height"));
		// The height clearly grows while the width barely moves, which shows the resize followed the local axes
		expect(heightAfter).toBeGreaterThan(heightBefore + 20);
		expect(Math.abs(widthAfter - widthBefore)).toBeLessThanOrEqual(2);
	});

	test("does not move the center on rotation, preserving the matrix e,f", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);
		const rect = canvas.objectById(id);
		const before = matrixCenter(await rect.getAttribute("transform"));
		const screenBefore = await screenCenterOf(canvas, id);

		// Rotate to an arbitrary angle, up and right of the center
		await canvas.dragTransformHandle("rotation", { x: 640, y: 140 });
		await expect
			.poll(() => rect.getAttribute("transform"))
			.not.toBe("matrix(1, 0, 0, 1, 500, 260)");

		// The center is the rotation axis, so neither the matrix center nor the screen center moves
		const after = matrixCenter(await rect.getAttribute("transform"));
		expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(1);
		expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(1);

		const screenAfter = await screenCenterOf(canvas, id);
		expect(Math.abs(screenAfter.x - screenBefore.x)).toBeLessThanOrEqual(2);
		expect(Math.abs(screenAfter.y - screenBefore.y)).toBeLessThanOrEqual(2);
	});
});
