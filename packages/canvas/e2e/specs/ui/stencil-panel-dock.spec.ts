import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * Docking a stencil panel: the flyout's keep-open toggle turns it into a panel
 * beside the viewport.
 *
 * - Docking takes the panel's width out of the viewport, and undocking or
 *   closing gives it back, without the drawing moving on screen (the camera is
 *   compensated for the viewport's moving left edge: CONTAINER_RESIZE /
 *   leftEdgeShift) — not even for one frame.
 * - The docked panel is persistent chrome: a press on the canvas, Escape and
 *   picking a preset leave it open.
 * - While docked, the rail's buttons show their content in it rather than in a
 *   flyout, and no flyout ever opens beside it.
 *
 * The categories are core's `basic` section and the harness's test-only `spec`
 * one (e2e/plugins/specShapesPlugin), the latter pinned on the rail.
 */

const SPEC_CATEGORY = "spec";

/** Screen rectangle of a drawn shape, as boundingBox() reports it. */
type ScreenBox = { x: number; y: number; width: number; height: number };

async function shapeScreenBox(
	canvas: CanvasDriver,
	id: string,
): Promise<ScreenBox> {
	const box = await canvas.objectById(id).boundingBox();
	if (!box) {
		throw new Error(`cannot get the position of the shape ${id}`);
	}
	return box;
}

/**
 * Asserts two screen boxes are the same place and size, allowing 1px: the drawn
 * viewport is snapped to device pixels, so a camera move can land half a pixel off.
 */
function expectSameBox(actual: ScreenBox, expected: ScreenBox, hint: string) {
	for (const key of ["x", "y", "width", "height"] as const) {
		expect(
			Math.abs(actual[key] - expected[key]),
			`${hint}: ${key} ${actual[key]} vs ${expected[key]}`,
		).toBeLessThanOrEqual(1);
	}
}

/** Asserts two screen points are the same place, with the same 1px allowance. */
function expectSamePoint(
	actual: { x: number; y: number },
	expected: { x: number; y: number },
	hint: string,
) {
	for (const key of ["x", "y"] as const) {
		expect(
			Math.abs(actual[key] - expected[key]),
			`${hint}: ${key} ${actual[key]} vs ${expected[key]}`,
		).toBeLessThanOrEqual(1);
	}
}

/** One animation frame: where the shape was, and whether the docked panel was mounted. */
type FrameSample = { x: number; y: number; isDockMounted: boolean };

/** Frames kept after the panel docks or goes, so the settling ones are seen too. */
const FRAMES_AFTER_TRANSITION = 8;

/** Frames the sampler gives up after, so a transition that never comes fails rather than hangs. */
const MAX_SAMPLED_FRAMES = 180;

/**
 * Samples a shape's screen position once per animation frame, starting BEFORE the
 * action so the very first frames after it are caught, and returns every sample.
 * A camera compensated in a later frame than the layout change shows up as one
 * sample off to the side — the flicker a user sees — even when the final
 * position is right.
 *
 * Each sample records whether the docked panel was in the DOM at that frame, and
 * sampling runs until that has flipped and FRAMES_AFTER_TRANSITION more frames
 * have passed. Sampling a fixed number of frames instead would pass without having
 * watched anything whenever the transition landed after the last of them.
 */
async function samplePositionAcross(
	canvas: CanvasDriver,
	id: string,
	action: () => Promise<void>,
): Promise<FrameSample[]> {
	await canvas.page.evaluate(
		({ id, dockSelector, framesAfterTransition, maxFrames }) => {
			const el = document.querySelector(`[data-id="${id}"]`);
			if (!el) {
				throw new Error(`no element for ${id}`);
			}
			const isDockMounted = () => document.querySelector(dockSelector) !== null;
			const before = isDockMounted();
			(window as unknown as { __samples: Promise<unknown> }).__samples =
				(async () => {
					const out: FrameSample[] = [];
					let transitionAt = -1;
					for (let i = 0; i < maxFrames; i++) {
						await new Promise((resolve) => requestAnimationFrame(resolve));
						const rect = el.getBoundingClientRect();
						const mounted = isDockMounted();
						out.push({ x: rect.x, y: rect.y, isDockMounted: mounted });
						if (transitionAt < 0 && mounted !== before) {
							transitionAt = out.length;
						}
						if (
							transitionAt >= 0 &&
							out.length - transitionAt >= framesAfterTransition
						) {
							break;
						}
					}
					return out;
				})();
		},
		{
			id,
			dockSelector: selectors.stencilDock,
			framesAfterTransition: FRAMES_AFTER_TRANSITION,
			maxFrames: MAX_SAMPLED_FRAMES,
		},
	);
	await action();
	const samples = await canvas.page.evaluate(
		() =>
			(window as unknown as { __samples: Promise<FrameSample[]> }).__samples,
	);

	// Both states have to appear, or the samples are all from one side of the
	// transition and say nothing about the frames the layout actually moved in.
	expect(
		samples.filter((sample) => sample.isDockMounted).length,
		"frames with the docked panel mounted were sampled",
	).toBeGreaterThan(0);
	expect(
		samples.filter((sample) => !sample.isDockMounted).length,
		"frames without the docked panel were sampled",
	).toBeGreaterThan(0);
	return samples;
}

/** Asserts the shape held `expected` in every sampled frame and still holds it. */
async function expectHeldInPlace(
	canvas: CanvasDriver,
	id: string,
	samples: FrameSample[],
	expected: ScreenBox,
	hint: string,
) {
	for (const sample of samples) {
		expectSamePoint(sample, expected, `${hint}, in every frame`);
	}
	expectSameBox(await shapeScreenBox(canvas, id), expected, `${hint}, after`);
}

test.describe("Docked stencil panel", () => {
	test("docking pushes the canvas aside without moving the drawing", async ({
		canvas,
	}) => {
		// Drawn clear of the panel's width, so what is asserted is a shape the docked
		// panel does not sit over (getBoundingClientRect ignores clipping and would
		// report a covered shape as being right where it belongs).
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 340, y: 150 },
			{ x: 460, y: 240 },
		);
		const drawnBox = await shapeScreenBox(canvas, id);
		const viewport = canvas.page.locator('[data-kind="canvas"]');
		const viewportBefore = await viewport.boundingBox();

		await canvas.openCatalog();
		const dockSamples = await samplePositionAcross(canvas, id, async () => {
			await canvas.page.click(selectors.stencilPanelDock);
			await expect(canvas.page.locator(selectors.stencilDock)).toBeVisible();
		});
		await expectHeldInPlace(
			canvas,
			id,
			dockSamples,
			drawnBox,
			"the shape stays put while the panel docks",
		);
		await expect(canvas.page.locator(selectors.stencilFlyout)).toHaveCount(0);
		// The canvas is pushed: its left edge moved by the panel's width.
		const viewportDocked = await viewport.boundingBox();
		expect(viewportDocked!.x - viewportBefore!.x).toBeGreaterThan(200);
		expect(viewportDocked!.width).toBeLessThan(viewportBefore!.width);

		const closeSamples = await samplePositionAcross(canvas, id, async () => {
			await canvas.closeStencilPanel();
		});
		await expectHeldInPlace(
			canvas,
			id,
			closeSamples,
			drawnBox,
			"the shape stays put while the docked panel closes",
		);
		expect(await viewport.boundingBox()).toEqual(viewportBefore);
	});

	test("undocking turns it back into the flyout, giving the canvas its width back", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 340, y: 150 },
			{ x: 460, y: 240 },
		);
		const drawnBox = await shapeScreenBox(canvas, id);
		await canvas.openCatalog({ docked: true });
		const undock = canvas.page.locator(selectors.stencilPanelUndock);
		await expect(undock).toHaveAttribute("aria-pressed", "true");

		const samples = await samplePositionAcross(canvas, id, async () => {
			await undock.click();
			await expect(canvas.page.locator(selectors.stencilFlyout)).toBeVisible();
		});
		await expectHeldInPlace(
			canvas,
			id,
			samples,
			drawnBox,
			"the shape stays put while the panel undocks",
		);
		await expect(canvas.page.locator(selectors.stencilDock)).toHaveCount(0);
		await expect(
			canvas.page.locator(selectors.stencilPanelDock),
		).toHaveAttribute("aria-pressed", "false");
	});

	test("stays open on a canvas click, on Escape and when a preset is picked", async ({
		canvas,
	}) => {
		// Its selection is what makes the canvas click observable: the click clears it,
		// so waiting for the controls to go proves the click was processed rather than
		// merely sent.
		await canvas.drawShape("Rectangle", { x: 340, y: 150 }, { x: 420, y: 210 });
		await canvas.page.click(selectors.categoryButton(SPEC_CATEGORY));
		await canvas.page.click(selectors.stencilPanelDock);
		const dock = canvas.page.locator(selectors.stencilDock);
		await expect(dock).toBeVisible();

		await canvas.clickAt({ x: 700, y: 520 });
		await expect
			.poll(() => canvas.hasAnyControl(), {
				message: "the click on empty canvas clears the selection",
			})
			.toBe(false);
		await expect(dock).toBeVisible();

		// Picking a preset enters drawing mode, and Escape leaves it, which makes the
		// key press observable the same way.
		await canvas.page.click(selectors.stencilPanelItem("tile"));
		await expect.poll(() => canvas.isDrawingMode()).toBe(true);
		await expect(dock).toBeVisible();
		await canvas.page.keyboard.press("Escape");
		await expect
			.poll(() => canvas.isDrawingMode(), {
				message: "Escape leaves drawing mode",
			})
			.toBe(false);
		await expect(dock).toBeVisible();
	});

	test("shows a rail button's content in place, never in a flyout beside it", async ({
		canvas,
	}) => {
		await canvas.openCatalog({ docked: true });
		const dock = canvas.page.locator(selectors.stencilDock);
		const categoryButton = canvas.page.locator(
			selectors.categoryButton(SPEC_CATEGORY),
		);

		await categoryButton.click();
		await expect(
			canvas.page.locator(selectors.categoryPanel(SPEC_CATEGORY)),
		).toBeVisible();
		await expect(dock).toHaveAttribute(
			"data-stencil-category-panel",
			SPEC_CATEGORY,
		);
		await expect(canvas.page.locator(selectors.stencilFlyout)).toHaveCount(0);
		await expect(categoryButton).toHaveAttribute("aria-expanded", "true");

		await canvas.page.click(selectors.catalogButton);
		await expect(dock).not.toHaveAttribute("data-stencil-category-panel");
		await expect(
			canvas.page.locator(selectors.catalogRow("basic")),
		).toBeVisible();
		await expect(canvas.page.locator(selectors.stencilFlyout)).toHaveCount(0);
		await expect(categoryButton).toHaveAttribute("aria-expanded", "false");
	});

	test("places a shape dragged out of it onto the pushed canvas", async ({
		canvas,
	}) => {
		await canvas.page.click(selectors.categoryButton(SPEC_CATEGORY));
		await canvas.page.click(selectors.stencilPanelDock);
		await expect(canvas.page.locator(selectors.stencilDock)).toBeVisible();

		const before = (await canvas.captureObjects()).length;
		const item = canvas.page.locator(selectors.stencilPanelItem("tile"));
		// Measured after docking: the canvas moved right with the panel.
		const viewportBox = await canvas.page
			.locator('[data-kind="canvas"]')
			.boundingBox();
		await item.hover();
		await canvas.page.mouse.down();
		try {
			await canvas.page.mouse.move(viewportBox!.x + 300, viewportBox!.y + 300, {
				steps: 12,
			});
		} finally {
			await canvas.page.mouse.up();
		}

		await expect
			.poll(async () => (await canvas.captureObjects()).length, {
				message: "a new shape is created by the D&D out of the docked panel",
			})
			.toBe(before + 1);
		await expect(canvas.page.locator(selectors.stencilDock)).toBeVisible();
	});
});
