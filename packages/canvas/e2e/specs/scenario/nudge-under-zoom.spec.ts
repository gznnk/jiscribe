import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Nudging with the arrow keys under a non-unit viewBox (while zoomed) must move
 * the shape by a fixed amount in world coordinates (1px, or 10px with Shift)
 * regardless of the screen scale.
 *
 * drag/resize/marquee-under-zoom guard against forgetting the screen->world
 * division — operations whose behavior must not change with zoom. Nudge is the
 * mirror image: it is defined in world units to begin with (MoveCommands'
 * NUDGE_STEP=1 / NUDGE_STEP_LARGE=10 are canvas-coordinate px), so the scale must
 * never be applied to it. "Correcting" nudge to a screen-px basis would make the
 * step off by a factor of scale, but only while zoomed.
 *
 * A shape's transform attribute is in SVG user units (= world coordinates) and
 * does not depend on the viewBox, so the transform after a nudge holds the same
 * integers under zoom as at zoom=1. nudge.spec guards this at zoom=1; this one
 * zooms in and goes further, to "the step is not multiplied by scale".
 */

/** Zoom factor as the world length one screen pixel spans = viewBox width / SVG screen width. 1 at zoom=1, < 1 when zoomed in. */
async function worldPerScreenPixel(canvas: CanvasDriver): Promise<number> {
	const raw = await canvas.getViewBox();
	if (!raw) {
		throw new Error("cannot read the viewBox");
	}
	const vbWidth = Number(raw.trim().split(/\s+/)[2]);
	const svgScreenWidth = await canvas.page.evaluate(() => {
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
	return vbWidth / svgScreenWidth;
}

test.describe("nudge under zoom", () => {
	test("moves 1px in world coordinates, or 10px with Shift, even when zoomed in", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);
		const rect = canvas.objectById(id);
		// The center is (500, 260); being world coordinates, zooming later leaves it unchanged.
		expect(await rect.getAttribute("transform")).toBe(
			"matrix(1, 0, 0, 1, 500, 260)",
		);

		// Zoom in anchored at the shape center, which keeps its screen position fixed.
		const box0 = await rect.boundingBox();
		if (!box0) {
			throw new Error("cannot read the boundingBox of the shape");
		}
		const center = canvas.toContent({
			x: box0.x + box0.width / 2,
			y: box0.y + box0.height / 2,
		});
		await canvas.wheel(center, { deltaY: -200, ctrl: true });
		await expect
			.poll(async () => (await rect.boundingBox())?.width ?? 0, {
				message: "zooming in grows the shape on screen",
			})
			.toBeGreaterThan(box0.width + 1);

		// Pin down first that the zoom took effect (scale < 1). Without it the test cannot
		// tell itself apart from zoom=1 and "not multiplied by scale" proves nothing.
		const scale = await worldPerScreenPixel(canvas);
		expect(scale).toBeLessThan(1);

		// Zoom only changes the viewBox; the shape's world transform stays put.
		expect(await rect.getAttribute("transform")).toBe(
			"matrix(1, 0, 0, 1, 500, 260)",
		);

		// A plain nudge is 1px in world. Applying scale would make it less than 1 and fail here.
		await canvas.nudge("right");
		await expect
			.poll(() => rect.getAttribute("transform"), {
				message: "a right nudge is +1px in world even while zoomed",
			})
			.toBe("matrix(1, 0, 0, 1, 501, 260)");

		await canvas.nudge("down");
		await expect
			.poll(() => rect.getAttribute("transform"), {
				message: "a down nudge is +1px in world even while zoomed",
			})
			.toBe("matrix(1, 0, 0, 1, 501, 261)");

		// Holding Shift makes it 10px in world.
		await canvas.nudge("left", { large: true });
		await expect
			.poll(() => rect.getAttribute("transform"), {
				message: "a Shift+left nudge is -10px in world even while zoomed",
			})
			.toBe("matrix(1, 0, 0, 1, 491, 261)");

		await canvas.nudge("up", { large: true });
		await expect
			.poll(() => rect.getAttribute("transform"), {
				message: "a Shift+up nudge is -10px in world even while zoomed",
			})
			.toBe("matrix(1, 0, 0, 1, 491, 251)");
	});
});
