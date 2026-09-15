import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * Core behavior of the shape library sidebar (`stencilLibrary.sections`).
 *
 * - The toolbar toggle opens and closes it, and carries the open state on
 *   aria-expanded.
 * - Its shape items are the same `data-part="item:<presetId>"` contract as the
 *   toolbar's, routed to the same handler: a click enters drawing mode and a drag
 *   onto the canvas creates the shape.
 * - Unlike the category flyout the panel is persistent chrome: a click on the
 *   canvas and Escape leave it open, and only the toggle or its close button shut
 *   it.
 * - Opening and closing it never moves the drawing: the viewport's left edge moves,
 *   and the camera is compensated for it (CONTAINER_RESIZE / leftEdgeShift).
 * - Sections collapse from their header, and the search box replaces them with one
 *   flat grid of what matches.
 *
 * The subject is the sidebar mechanism, not any one shape set, so the shapes come
 * from core's `basic` section and the harness's test-only category
 * (e2e/plugins/specShapesPlugin).
 */

/** The test-only plugin's section, holding the single `tile` preset. */
const SPEC_SECTION = "spec";

/** Core's primitives as a section, declared by the harness's `library`. */
const BASIC_SECTION = "basic";

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

/** One animation frame: where the shape was, and whether the panel was mounted. */
type FrameSample = { x: number; y: number; isPanelMounted: boolean };

/** Frames kept after the panel appears or disappears, so the settling ones are seen too. */
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
 * Each sample records whether the panel was in the DOM at that frame, and sampling
 * runs until that has flipped and FRAMES_AFTER_TRANSITION more frames have passed.
 * Sampling a fixed number of frames instead would pass without having watched
 * anything whenever the transition landed after the last of them.
 */
async function samplePositionAcross(
	canvas: CanvasDriver,
	id: string,
	action: () => Promise<void>,
): Promise<FrameSample[]> {
	await canvas.page.evaluate(
		({ id, panelSelector, framesAfterTransition, maxFrames }) => {
			const el = document.querySelector(`[data-id="${id}"]`);
			if (!el) {
				throw new Error(`no element for ${id}`);
			}
			const isPanelMounted = () =>
				document.querySelector(panelSelector) !== null;
			const before = isPanelMounted();
			(window as unknown as { __samples: Promise<unknown> }).__samples =
				(async () => {
					const out: FrameSample[] = [];
					let transitionAt = -1;
					for (let i = 0; i < maxFrames; i++) {
						await new Promise((resolve) => requestAnimationFrame(resolve));
						const rect = el.getBoundingClientRect();
						const mounted = isPanelMounted();
						out.push({ x: rect.x, y: rect.y, isPanelMounted: mounted });
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
			panelSelector: selectors.stencilLibraryPanel,
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
		samples.filter((sample) => sample.isPanelMounted).length,
		"frames with the sidebar mounted were sampled",
	).toBeGreaterThan(0);
	expect(
		samples.filter((sample) => !sample.isPanelMounted).length,
		"frames without the sidebar were sampled",
	).toBeGreaterThan(0);
	return samples;
}

test.describe("Shape library sidebar", () => {
	test("opens and closes from the toolbar toggle", async ({ canvas }) => {
		const panel = canvas.page.locator(selectors.stencilLibraryPanel);
		const toggle = canvas.page.locator(selectors.stencilLibraryToggle);

		// It starts closed (not in the DOM at all)
		await expect(panel).toHaveCount(0);
		await expect(toggle).toHaveAttribute("aria-expanded", "false");

		await toggle.click();
		await expect(panel).toBeVisible();
		await expect(toggle).toHaveAttribute("aria-expanded", "true");

		await toggle.click();
		await expect(panel).toHaveCount(0);
		await expect(toggle).toHaveAttribute("aria-expanded", "false");
	});

	test("enters drawing mode from an item and stays open", async ({
		canvas,
	}) => {
		await canvas.openStencilLibrary();

		await canvas.page.click(selectors.stencilLibraryPanelItem("tile"));
		await expect
			.poll(() => canvas.isDrawingMode(), {
				message: "clicking a shape in the sidebar enters drawing mode",
			})
			.toBe(true);

		// The sidebar is persistent chrome, so picking a shape leaves it up
		await expect(
			canvas.page.locator(selectors.stencilLibraryPanel),
		).toBeVisible();
	});

	test("creates a shape by dragging an item onto the canvas", async ({
		canvas,
	}) => {
		await canvas.openStencilLibrary();

		const before = (await canvas.captureObjects()).length;
		const item = canvas.page.locator(selectors.stencilLibraryPanelItem("tile"));
		// Well inside the canvas and clear of the top edge zone (auto-scroll)
		const to = canvas.toScreen({ x: 500, y: 320 });

		// hover() presses from the item's own center, so the drag needs no measuring
		await item.hover();
		await canvas.page.mouse.down();
		try {
			await canvas.page.mouse.move(to.x, to.y, { steps: 12 });
		} finally {
			await canvas.page.mouse.up();
		}

		await expect
			.poll(async () => (await canvas.captureObjects()).length, {
				message: "a new shape is created by the D&D out of the sidebar",
			})
			.toBe(before + 1);
		await expect(
			canvas.page.locator(selectors.stencilLibraryPanel),
		).toBeVisible();
	});

	test("stays open on a canvas click and on Escape", async ({ canvas }) => {
		// Its selection is what makes the canvas click observable: the click clears it,
		// so waiting for the controls to go proves the click was processed rather than
		// merely sent.
		await canvas.drawShape("Rectangle", { x: 340, y: 150 }, { x: 420, y: 210 });
		await canvas.openStencilLibrary();
		const panel = canvas.page.locator(selectors.stencilLibraryPanel);

		await canvas.clickAt({ x: 700, y: 520 });
		await expect
			.poll(() => canvas.hasAnyControl(), {
				message: "the click on empty canvas clears the selection",
			})
			.toBe(false);
		await expect(panel).toBeVisible();

		// Escape clears drawing mode, so entering it first makes the key press
		// observable the same way.
		await canvas.page.click(selectors.stencilLibraryPanelItem("tile"));
		await expect.poll(() => canvas.isDrawingMode()).toBe(true);
		await canvas.page.keyboard.press("Escape");
		await expect
			.poll(() => canvas.isDrawingMode(), {
				message: "Escape leaves drawing mode",
			})
			.toBe(false);
		await expect(panel).toBeVisible();
	});

	test("collapses and expands a section from its header", async ({
		canvas,
	}) => {
		await canvas.openStencilLibrary();

		const section = canvas.page.locator(
			selectors.stencilLibrarySection(SPEC_SECTION),
		);
		const tileItem = canvas.page.locator(
			selectors.stencilLibraryPanelItem("tile"),
		);
		await expect(section).toHaveAttribute("aria-expanded", "true");
		await expect(tileItem).toBeVisible();

		await section.click();
		await expect(section).toHaveAttribute("aria-expanded", "false");
		await expect(tileItem).toHaveCount(0);

		await section.click();
		await expect(section).toHaveAttribute("aria-expanded", "true");
		await expect(tileItem).toBeVisible();
	});

	test("filters the shapes through the search box", async ({ canvas }) => {
		await canvas.openStencilLibrary();

		const search = canvas.page.locator(selectors.stencilLibrarySearch);
		const tileItem = canvas.page.locator(
			selectors.stencilLibraryPanelItem("tile"),
		);
		const rectItem = canvas.page.locator(
			selectors.stencilLibraryPanelItem("rect"),
		);
		const basicSection = canvas.page.locator(
			selectors.stencilLibrarySection(BASIC_SECTION),
		);

		// A match leaves the matching shapes in one flat grid, sections and all gone
		await search.fill("tile");
		await expect(tileItem).toBeVisible();
		await expect(rectItem).toHaveCount(0);
		await expect(basicSection).toHaveCount(0);

		await search.fill("no-such-shape");
		await expect(
			canvas.page
				.locator(selectors.stencilLibraryPanel)
				.getByText("No matching shapes"),
		).toBeVisible();
		await expect(tileItem).toHaveCount(0);

		// Clearing the query brings the sections back
		await search.fill("");
		await expect(basicSection).toBeVisible();
		await expect(rectItem).toBeVisible();
		await expect(tileItem).toBeVisible();
	});

	test("closes from the panel's close button", async ({ canvas }) => {
		await canvas.openStencilLibrary();

		await canvas.closeStencilLibrary();
		await expect(
			canvas.page.locator(selectors.stencilLibraryToggle),
		).toHaveAttribute("aria-expanded", "false");
	});

	test("keeps the drawing in place while it opens and closes", async ({
		canvas,
	}) => {
		// Drawn clear of the sidebar's own width, so what is asserted is a shape the
		// open panel does not sit over (getBoundingClientRect ignores clipping and
		// would report a covered shape as being right where it belongs).
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 340, y: 150 },
			{ x: 460, y: 240 },
		);
		const drawnBox = await shapeScreenBox(canvas, id);

		// The sidebar takes its width of layout space from the viewport, so its left
		// edge moves; the camera is compensated for that in the same frame, so the
		// shape never leaves its place on screen — not even for one frame.
		const openSamples = await samplePositionAcross(canvas, id, async () => {
			await canvas.openStencilLibrary();
		});
		for (const sample of openSamples) {
			expectSamePoint(
				sample,
				drawnBox,
				"the shape stays put in every frame while the sidebar opens",
			);
		}
		expectSameBox(
			await shapeScreenBox(canvas, id),
			drawnBox,
			"the shape stays put once the sidebar is open",
		);

		const closeSamples = await samplePositionAcross(canvas, id, async () => {
			await canvas.closeStencilLibrary();
		});
		for (const sample of closeSamples) {
			expectSamePoint(
				sample,
				drawnBox,
				"the shape stays put in every frame while the sidebar closes",
			);
		}
		expectSameBox(
			await shapeScreenBox(canvas, id),
			drawnBox,
			"the shape stays put once the sidebar is closed",
		);
	});
});
