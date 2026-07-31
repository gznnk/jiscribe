import { test, expect } from "../../fixtures";

/**
 * Keyboard zoom (Ctrl+= / Ctrl+-).
 *
 * Other specs guard anchoring for the wheel zoom (the CanvasEventHandler path);
 * the keyboard shortcuts (ZoomInCommand / ZoomOutCommand) are a separate path
 * that e2e did not cover. They rebuild the viewBox anchored on the viewport
 * center, recomputing minX/minY from it, so a break shows up as the zoom factor
 * changing while the center drifts, or as nothing happening at all. Both the
 * factor change (viewBox width) and the preserved center are guarded.
 */

type ViewBox = { minX: number; minY: number; width: number; height: number };

function parseViewBox(raw: string | null): ViewBox {
	if (!raw) {
		throw new Error("cannot read the viewBox");
	}
	const [minX, minY, width, height] = raw.trim().split(/\s+/).map(Number);
	return { minX, minY, width, height };
}

const centerX = (vb: ViewBox): number => vb.minX + vb.width / 2;
const centerY = (vb: ViewBox): number => vb.minY + vb.height / 2;

test.describe("keyboard zoom", () => {
	test("shrinks the viewBox width and keeps the center when zooming in with Ctrl+=", async ({
		canvas,
	}) => {
		const before = parseViewBox(await canvas.getViewBox());

		await canvas.zoomIn();

		await expect
			.poll(async () => parseViewBox(await canvas.getViewBox()).width, {
				message: "zooming in shrinks the viewBox width",
			})
			.toBeLessThan(before.width);

		const after = parseViewBox(await canvas.getViewBox());
		// Anchored on the center, so the world coordinates of the screen center stay put.
		expect(centerX(after)).toBeCloseTo(centerX(before), 0);
		expect(centerY(after)).toBeCloseTo(centerY(before), 0);
	});

	test("widens the viewBox and keeps the center when zooming out with Ctrl+-", async ({
		canvas,
	}) => {
		const before = parseViewBox(await canvas.getViewBox());

		await canvas.zoomOut();

		await expect
			.poll(async () => parseViewBox(await canvas.getViewBox()).width, {
				message: "zooming out widens the viewBox",
			})
			.toBeGreaterThan(before.width);

		const after = parseViewBox(await canvas.getViewBox());
		expect(centerX(after)).toBeCloseTo(centerX(before), 0);
		expect(centerY(after)).toBeCloseTo(centerY(before), 0);
	});
});
