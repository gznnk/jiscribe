import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Guards the exact framing Zoom to Fit (Ctrl+0) produces.
 *
 * viewport.spec goes as far as "the target lands inside the frame" and never
 * checks the centering or the margin. The implementation (ZoomToFitCommand):
 *   - viewBox center = center of the content bounding box (contentCx/contentCy)
 *   - on the constraining axis (the one that overflows), a margin worth 48
 *     screen px (PADDING_PX) on each side
 * A drifted center or a mixed-up margin computation survives an "inside the
 * frame" check, so the center match and "constraining-axis margin = 48px/zoom"
 * are pinned here.
 *
 * The content bbox is axis-aligned, so the drawing coordinates are its bounds
 * directly. The content is laid out landscape (960x520), which makes width the
 * constraining axis; small differences in toolbar height do not flip that.
 */

const PADDING_PX = 48;

type ViewBox = { minX: number; minY: number; width: number; height: number };

function parseViewBox(raw: string | null): ViewBox {
	if (!raw) {
		throw new Error("cannot read the viewBox");
	}
	const [minX, minY, width, height] = raw.trim().split(/\s+/).map(Number);
	return { minX, minY, width, height };
}

/** Screen pixel width of the canvas svg itself (= viewport.width), used to recover the zoom */
async function svgScreenWidth(canvas: CanvasDriver): Promise<number> {
	return canvas.page.evaluate(() => {
		const svgs = [...document.querySelectorAll("svg")];
		let best = 0;
		let width = 0;
		for (const svg of svgs) {
			const rect = svg.getBoundingClientRect();
			const area = rect.width * rect.height;
			if (area > best) {
				best = area;
				width = rect.width;
			}
		}
		return width;
	});
}

test.describe("exact framing of Zoom to Fit", () => {
	test("centers on the content and takes a symmetric 48px margin on the constraining axis", async ({
		canvas,
	}) => {
		// Content bbox: left 200, top 200, right 1160, bottom 720 -> 960x520, center (680,460).
		await canvas.drawShape("Rectangle", { x: 200, y: 200 }, { x: 360, y: 300 });
		await canvas.drawShape(
			"Rectangle",
			{ x: 1000, y: 600 },
			{ x: 1160, y: 720 },
		);
		await canvas.deselect();

		const contentLeft = 200;
		const contentRight = 1160;
		const contentCx = (contentLeft + contentRight) / 2; // 680
		const contentCy = (200 + 720) / 2; // 460

		const before = await canvas.getViewBox();
		await canvas.zoomToFit();
		await expect
			.poll(() => canvas.getViewBox(), {
				message: "Zoom to Fit changes the viewBox",
			})
			.not.toBe(before);

		const vb = parseViewBox(await canvas.getViewBox());
		const svgW = await svgScreenWidth(canvas);
		// zoom = screen width / viewBox width, so the world margin is 48/zoom = 48 * viewBox width / screen width.
		const expectedMarginWorld = (PADDING_PX * vb.width) / svgW;

		// Centering: the viewBox center matches the content center on both axes.
		expect(vb.minX + vb.width / 2).toBeCloseTo(contentCx, 0);
		expect(vb.minY + vb.height / 2).toBeCloseTo(contentCy, 0);

		// Both margins on the constraining axis (width) are 48px/zoom; their symmetry
		// also backs up the centering.
		const leftMargin = contentLeft - vb.minX;
		const rightMargin = vb.minX + vb.width - contentRight;
		expect(Math.abs(leftMargin - expectedMarginWorld)).toBeLessThanOrEqual(2);
		expect(Math.abs(rightMargin - expectedMarginWorld)).toBeLessThanOrEqual(2);
	});
});
