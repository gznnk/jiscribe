import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Inertial scrolling: a right-button pan released mid-motion keeps gliding, and
 * fresh input takes the view back immediately.
 *
 * The mouse is driven step by step here rather than through canvas.rightDrag:
 * the glide exists only if the release still carries speed, and rightDrag
 * deliberately rests before lifting (see PAN_SETTLE_MS) so every other pan spec
 * measures a drag that stops where it ended.
 *
 * pan-delta.spec is the counterpart for the rested release: no glide, and the
 * view lands exactly on the drag distance.
 */

type ViewBox = { minX: number; minY: number; width: number; height: number };

function parseViewBox(raw: string | null): ViewBox {
	if (!raw) {
		throw new Error("cannot read the viewBox");
	}
	const [minX, minY, width, height] = raw.trim().split(/\s+/).map(Number);
	return { minX, minY, width, height };
}

/** Frame-paced steps; the last of them is what the release velocity is measured across. */
const FLICK_STEPS = 6;
const FLICK_STEP_PX = 40;
const FLICK_STEP_MS = 16;
const FLICK_START = { x: 400, y: 500 };
/** Movement past the drag itself that counts as "the glide is under way" (px). */
const GLIDE_MARGIN_PX = 20;

/** Right-drag leftwards at a steady speed and let go while still moving. */
async function flickLeft(canvas: CanvasDriver): Promise<void> {
	const start = canvas.toScreen(FLICK_START);
	await canvas.page.mouse.move(start.x, start.y);
	await canvas.page.mouse.down({ button: "right" });
	for (let step = 1; step <= FLICK_STEPS; step++) {
		await canvas.page.mouse.move(start.x - step * FLICK_STEP_PX, start.y);
		await canvas.page.waitForTimeout(FLICK_STEP_MS);
	}
	await canvas.page.mouse.up({ button: "right" });
}

const readMinX = async (canvas: CanvasDriver): Promise<number> =>
	parseViewBox(await canvas.getViewBox()).minX;

test.describe("inertial pan", () => {
	test("keeps scrolling after the button is released, then coasts to a stop", async ({
		canvas,
	}) => {
		await flickLeft(canvas);
		const justAfterRelease = parseViewBox(await canvas.getViewBox());

		// Dragging left moves the view right, so the glide keeps increasing minX.
		await expect
			.poll(() => readMinX(canvas), {
				message: "the view keeps moving after the release",
			})
			.toBeGreaterThan(justAfterRelease.minX + GLIDE_MARGIN_PX);

		// It stops on its own: two reads a moment apart land on the same place.
		await expect
			.poll(
				async () => {
					const first = await readMinX(canvas);
					await canvas.page.waitForTimeout(150);
					return (await readMinX(canvas)) === first;
				},
				{ timeout: 10000, message: "the glide comes to rest" },
			)
			.toBe(true);

		// The glide only pans: the zoom factor is untouched.
		const settled = parseViewBox(await canvas.getViewBox());
		expect(settled.width).toBeCloseTo(justAfterRelease.width, 3);
	});

	test("stops where it is when the canvas is pressed again", async ({
		canvas,
	}) => {
		await flickLeft(canvas);
		const justAfterRelease = parseViewBox(await canvas.getViewBox());

		await expect
			.poll(() => readMinX(canvas), {
				message: "the glide is under way before it is interrupted",
			})
			.toBeGreaterThan(justAfterRelease.minX + GLIDE_MARGIN_PX);

		const empty = canvas.toScreen({ x: 700, y: 700 });
		await canvas.page.mouse.click(empty.x, empty.y);
		const atPress = await readMinX(canvas);

		await canvas.page.waitForTimeout(400);
		expect(await readMinX(canvas)).toBe(atPress);
	});
});
