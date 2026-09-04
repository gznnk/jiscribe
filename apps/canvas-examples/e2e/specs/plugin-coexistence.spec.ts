import { test, expect, selectors } from "@jiscribe/canvas/testing";
import type { CanvasDriver } from "@jiscribe/canvas/testing";

/**
 * All eight shipped plugins registered on one canvas. Each plugin's own e2e suite
 * loads a harness holding that plugin alone, so nothing there can see what only
 * breaks when they share a canvas. That is all this suite owns:
 * - a canvas mounting at all with every plugin applied (a type claimed twice
 *   throws while the registries are built, leaving nothing rendered)
 * - the toolbar carrying every pinned preset and every category exactly once
 * - each category flyout opening onto its own plugin's presets, with no preset id
 *   showing up in two places
 * - shapes from every plugin coexisting in one document
 * - SVG ids staying unique across the canvas once `svgDefs` contributors and
 *   per-object defs are all in play
 *
 * How any single shape draws, edits or renders is not this suite's business — the
 * owning plugin's suite covers it, and repeating it here would only double the cost.
 */

/** Presets pinned straight on the harness toolbar, in layout order. */
const PINNED_PRESET_IDS = [
	"rect",
	"ellipse",
	"polyline",
	"polygon",
	"text",
	"sticky",
	"markdown",
];

/**
 * Category flyouts of the harness toolbar, in layout order. `ownPresetId` is a
 * preset only that category's plugin registers, so finding it inside the flyout
 * proves the category resolved against the right plugin's stencils.
 */
const CATEGORIES = [
	{ id: "flowchart", ownPresetId: "diamond" },
	{ id: "uml", ownPresetId: "class" },
	{ id: "container", ownPresetId: "frame" },
	{ id: "general", ownPresetId: "actor" },
	{ id: "annotation", ownPresetId: "callout" },
	{ id: "icon", ownPresetId: "lucideIconUser" },
];

/** Every toolbar category button, pinned presets excluded. */
const CATEGORY_TOGGLES = '[data-id="stencil-category"][data-part^="toggle:"]';

/** Preset ids of the stencil buttons under `scopeSelector`, in DOM order. */
async function readPresetIds(
	canvas: CanvasDriver,
	scopeSelector: string,
): Promise<string[]> {
	return canvas.page
		.locator(`${scopeSelector} [data-part^="item:"]`)
		.evaluateAll((elements) =>
			elements.map((element) =>
				(element.getAttribute("data-part") ?? "").replace(/^item:/, ""),
			),
		);
}

/** Values appearing more than once, each reported once. */
function findDuplicates(values: string[]): string[] {
	return [...new Set(values.filter((value, i) => values.indexOf(value) !== i))];
}

/**
 * Draws one shape per plugin into the empty document, each in its own area of the
 * 1440x900 viewport so nothing overlaps (a container swallows what sits inside it,
 * and the ObjectMenu of a selected shape covers the area below it). Returns the
 * new shapes' data-ids in creation order.
 *
 * The flowchart representative is multiDocument rather than a plain box because it
 * is the one shipped shape minting per-object SVG ids.
 */
async function drawOneShapePerPlugin(canvas: CanvasDriver): Promise<string[]> {
	const ids: string[] = [];

	ids.push(
		await canvas.drawShapeFromFlyout(
			"flowchart",
			"multiDocument",
			{ x: 120, y: 200 },
			{ x: 260, y: 320 },
		),
	);
	await canvas.deselect();

	ids.push(
		await canvas.drawShapeFromFlyout(
			"uml",
			"class",
			{ x: 300, y: 200 },
			{ x: 440, y: 320 },
		),
	);
	await canvas.deselect();

	ids.push(
		await canvas.drawShapeFromFlyout(
			"general",
			"actor",
			{ x: 500, y: 200 },
			{ x: 600, y: 320 },
		),
	);
	await canvas.deselect();

	ids.push(
		await canvas.drawShapeFromFlyout(
			"annotation",
			"callout",
			{ x: 120, y: 400 },
			{ x: 280, y: 520 },
		),
	);
	await canvas.deselect();

	ids.push(
		await canvas.drawShapeFromFlyout(
			"container",
			"frame",
			{ x: 900, y: 560 },
			{ x: 1100, y: 700 },
		),
	);
	await canvas.deselect();

	ids.push(
		await canvas.drawShape("Markdown", { x: 320, y: 400 }, { x: 480, y: 520 }),
	);
	await canvas.deselect();

	// Stickies are center-placed on click (no bounds drawing), which lands this one
	// clear of everything above.
	ids.push(await canvas.placeShape("Sticky"));
	await canvas.deselect();

	// The icon is center-placed too, so it lands under the sticky. Overlap is fine
	// here: this suite asks whether every plugin's shape coexists in one document,
	// and a covered element is still a rendered, visible one.
	ids.push(await canvas.placeShapeFromFlyout("icon", "lucideIconUser"));
	await canvas.deselect();

	return ids;
}

test.describe("plugin coexistence", () => {
	test("mounts every plugin and lays the toolbar out with no duplicates", async ({
		canvas,
	}) => {
		await expect(canvas.page.locator('[data-kind="canvas"]')).toBeVisible();

		// Exact equality, not containment: it pins the order and rules out both a
		// missing entry and a second copy of one.
		expect(await readPresetIds(canvas, selectors.toolbar)).toEqual(
			PINNED_PRESET_IDS,
		);

		const categoryIds = await canvas.page
			.locator(CATEGORY_TOGGLES)
			.evaluateAll((elements) =>
				elements.map((element) =>
					(element.getAttribute("data-part") ?? "").slice("toggle:".length),
				),
			);
		expect(categoryIds).toEqual(CATEGORIES.map((category) => category.id));
	});

	test("opens every category flyout onto its own plugin's presets", async ({
		canvas,
	}) => {
		const allPresetIds = [...PINNED_PRESET_IDS];

		for (const category of CATEGORIES) {
			await canvas.page.click(selectors.categoryButton(category.id));
			const flyoutSelector = selectors.categoryFlyout(category.id);
			await expect(canvas.page.locator(flyoutSelector)).toBeVisible();

			const presetIds = await readPresetIds(canvas, flyoutSelector);
			expect(presetIds).toContain(category.ownPresetId);
			allPresetIds.push(...presetIds);

			await canvas.page.keyboard.press("Escape");
			await expect(canvas.page.locator(flyoutSelector)).toHaveCount(0);
		}

		// Every plugin owns a disjoint set of presets, so an id reachable from two
		// places means two of them claimed the same one.
		expect(findDuplicates(allPresetIds)).toEqual([]);
	});

	test("holds a shape from every plugin in one document", async ({
		canvas,
	}) => {
		const ids = await drawOneShapePerPlugin(canvas);

		expect(findDuplicates(ids)).toEqual([]);
		const liveIds = (await canvas.captureObjects()).map((object) => object.id);
		expect([...liveIds].sort()).toEqual([...ids].sort());

		for (const id of ids) {
			await expect(canvas.objectById(id)).toBeVisible();
		}
	});

	test("keeps every SVG id in the canvas unique", async ({ canvas }) => {
		await drawOneShapePerPlugin(canvas);
		// A second sticky: `svgDefs` is registered per type, so its shared gradients
		// have to stay one set however many instances reference them.
		await canvas.placeShape("Sticky");
		await canvas.deselect();

		await expect(
			canvas.page.locator("defs > #sticky-shadow-bottom"),
		).toHaveCount(1);

		// SVG ids are document-global, so core, the plugins and the per-object defs
		// all draw from one namespace and a clash silently rebinds a url(#…).
		const svgIds = await canvas.page
			.locator('[data-kind="canvas"] [id]')
			.evaluateAll((elements) => elements.map((element) => element.id));
		// A query that reached nothing would pass the duplicate check for free, so
		// pin one id known to be down there.
		expect(svgIds).toContain("sticky-shadow-bottom");
		expect(findDuplicates(svgIds)).toEqual([]);
	});
});
