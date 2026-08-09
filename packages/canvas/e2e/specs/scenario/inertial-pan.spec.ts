import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

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

/**
 * Start recording whether the object menu ever enters the DOM, from now on.
 * A MutationObserver catches an appearance that lasts a single frame, which
 * polling from the test side would step over.
 */
async function watchForMenu(canvas: CanvasDriver): Promise<void> {
	await canvas.page.evaluate((menuSelector) => {
		const mark = () => {
			if (document.querySelector(menuSelector)) {
				document.documentElement.dataset.menuSeen = "1";
			}
		};
		document.documentElement.dataset.menuSeen = "0";
		new MutationObserver(mark).observe(document.body, {
			childList: true,
			subtree: true,
		});
		mark();
	}, selectors.objectMenu);
}

/** Whether the object menu appeared since the last {@link watchForMenu}. */
async function menuWasSeen(canvas: CanvasDriver): Promise<boolean> {
	return canvas.page.evaluate(
		() => document.documentElement.dataset.menuSeen === "1",
	);
}

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

	test("keeps the object menu away until the glide has stopped", async ({
		canvas,
	}) => {
		// Drawing leaves the shape selected, so the menu is up before the pan.
		await canvas.drawShape("Rectangle", { x: 420, y: 250 }, { x: 580, y: 350 });
		const objectMenu = canvas.page.locator(selectors.objectMenu);
		await expect(objectMenu).toBeVisible();

		await flickLeft(canvas);
		const justAfterRelease = await readMinX(canvas);

		// Wait for the view to coast past where the drag ended before reading the
		// menu: right after mouse.up the drag itself is still what hides it, so a
		// check there would pass whatever the glide does.
		await expect
			.poll(() => readMinX(canvas), {
				message: "the glide is under way before the menu is checked",
			})
			.toBeGreaterThan(justAfterRelease + GLIDE_MARGIN_PX);

		// The pan hid it; the glide continues the pan, so it must stay hidden
		// instead of flying across the screen with the selection.
		expect(await objectMenu.count()).toBe(0);

		// It comes back once the view is at rest.
		await expect(objectMenu).toBeVisible({ timeout: 10000 });
	});

	test("never flashes the object menu at either edge of the glide", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 420, y: 250 }, { x: 580, y: 350 });
		await expect(canvas.page.locator(selectors.objectMenu)).toBeVisible();

		const start = canvas.toScreen(FLICK_START);
		await canvas.page.mouse.move(start.x, start.y);
		await canvas.page.mouse.down({ button: "right" });
		for (let step = 1; step <= FLICK_STEPS; step++) {
			await canvas.page.mouse.move(start.x - step * FLICK_STEP_PX, start.y);
			await canvas.page.waitForTimeout(FLICK_STEP_MS);
		}

		// The drag hides the menu and the glide keeps it hidden, but the two are
		// separate states with a gap between them. Sampling would miss a gap that
		// lasts one frame, so watch the DOM instead.
		await watchForMenu(canvas);
		await canvas.page.mouse.up({ button: "right" });
		await canvas.page.waitForTimeout(400);
		expect(await menuWasSeen(canvas)).toBe(false);

		// Same handover in reverse: interrupt the glide with a fresh pan. Between
		// the press that stops it and the drag being confirmed, nothing hides the
		// menu on its own.
		await watchForMenu(canvas);
		await canvas.page.mouse.down({ button: "right" });
		await canvas.page.waitForTimeout(80);
		await canvas.page.mouse.move(start.x - 200, start.y);
		await canvas.page.mouse.move(start.x - 260, start.y);
		expect(await menuWasSeen(canvas)).toBe(false);
		await canvas.page.mouse.up({ button: "right" });
	});
});
