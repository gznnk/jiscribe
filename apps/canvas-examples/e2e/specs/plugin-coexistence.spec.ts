import { test, expect, selectors } from "@jiscribe/canvas/testing";
import type { CanvasDriver } from "@jiscribe/canvas/testing";

/**
 * All ten shipped plugins registered on one canvas. Each plugin's own e2e suite
 * loads a harness holding that plugin alone, so nothing there can see what only
 * breaks when they share a canvas. That is all this suite owns:
 * - a canvas mounting at all with every plugin applied (a type claimed twice
 *   throws while the registries are built, leaving nothing rendered)
 * - the toolbar carrying no shape tool, and the rail carrying every preset once
 * - the catalog holding one section per plugin category, each onto its own
 *   plugin's presets, with no preset id showing up in two sections
 * - a pinned category opening its flyout from the rail
 * - shapes from every plugin coexisting in one document
 * - SVG ids staying unique across the canvas once `svgDefs` contributors and
 *   per-object defs are all in play
 *
 * How any single shape draws, edits or renders is not this suite's business — the
 * owning plugin's suite covers it, and repeating it here would only double the cost.
 */

/** Presets on the harness rail, in layout order. */
const RAIL_PRESET_IDS = [
	"rect",
	"ellipse",
	"polygon",
	"polyline",
	"text",
	"sticky",
];

/**
 * The one category the harness pins to the rail. The catalog holds every section,
 * this one included, so both surfaces are covered. `ownPresetId` is a preset only
 * its plugin registers.
 */
const PINNED_CATEGORY = { id: "icon", ownPresetId: "lucideIconUser" };

/**
 * The awsIcon preset the aws section is found by and both AWS icons are placed from.
 * Any one would do; S3 is picked because it is a shape every AWS diagram carries.
 */
const AWS_S3_PRESET_ID = "awsIconServiceAmazonSimpleStorageService";

/**
 * Sections of the catalog, in declaration order. `ownPresetId` is a
 * preset only that section holds, so finding it there proves the section resolved
 * against the right plugin's stencils.
 */
const LIBRARY_SECTIONS = [
	{ id: "basic", ownPresetId: "markdown" },
	{ id: "flowchart", ownPresetId: "diamond" },
	{ id: "uml", ownPresetId: "class" },
	{ id: "er", ownPresetId: "erEntity" },
	{ id: "container", ownPresetId: "frame" },
	{ id: "general", ownPresetId: "actor" },
	{ id: "annotation", ownPresetId: "callout" },
	{ id: "icon", ownPresetId: "lucideIconUser" },
	{ id: "aws", ownPresetId: AWS_S3_PRESET_ID },
	{ id: "aws-group", ownPresetId: "awsGroupVpc" },
];

/** Every pinned category button on the rail, presets excluded. */
const CATEGORY_TOGGLES = `${selectors.rail} [data-id="stencil-category"][data-action^="toggle:"]`;

/** Preset ids of the stencil buttons under `scopeSelector`, in DOM order. */
async function readPresetIds(
	canvas: CanvasDriver,
	scopeSelector: string,
): Promise<string[]> {
	return canvas.page
		.locator(`${scopeSelector} [data-action^="item:"]`)
		.evaluateAll((elements) =>
			elements.map((element) =>
				(element.getAttribute("data-action") ?? "").replace(/^item:/, ""),
			),
		);
}

/** Values appearing more than once, each reported once. */
function findDuplicates(values: string[]): string[] {
	return [...new Set(values.filter((value, i) => values.indexOf(value) !== i))];
}

/**
 * Opens the catalog and switches it to one category, whose panel then lists that
 * category's presets alone. The canvas origin is left where it was.
 */
async function openCategoryFromCatalog(
	canvas: CanvasDriver,
	categoryId: string,
): Promise<void> {
	await canvas.openCatalog();
	await canvas.page.click(selectors.catalogRow(categoryId));
	await expect(
		canvas.page.locator(selectors.categoryPanel(categoryId)),
	).toBeVisible();
}

/** Runs an operation expected to add exactly one shape and returns its data-id. */
async function captureCreated(
	canvas: CanvasDriver,
	presetId: string,
	add: () => Promise<void>,
): Promise<string> {
	const before = await canvas.captureObjects();
	const beforeIds = new Set(before.map((object) => object.id));

	await add();

	await expect
		.poll(async () => (await canvas.captureObjects()).length, {
			message: `${presetId} creates a new shape`,
		})
		.toBe(before.length + 1);

	const created = (await canvas.captureObjects()).find(
		(object) => !beforeIds.has(object.id),
	);
	if (!created?.id) {
		throw new Error(
			`cannot read the data-id of the shape created by ${presetId}`,
		);
	}
	return created.id;
}

/**
 * Picks a shape out of its category in the catalog and drags it out on the canvas,
 * in the driver's content coordinates. Picking closes the panel.
 */
async function drawFromCatalog(
	canvas: CanvasDriver,
	categoryId: string,
	presetId: string,
	from: { x: number; y: number },
	to: { x: number; y: number },
): Promise<string> {
	return captureCreated(canvas, presetId, async () => {
		await openCategoryFromCatalog(canvas, categoryId);
		await canvas.page.click(selectors.stencilPanelItem(presetId));
		// A panel item has no armed cursor of its own, so the canvas's crosshair is
		// the signal that drawing mode was entered.
		await expect
			.poll(() => canvas.isDrawingMode(), {
				message: `clicking ${presetId} enters drawing mode`,
			})
			.toBe(true);

		await canvas.drag(from, to);
	});
}

/**
 * Picks a click-placed shape (`supportsBounds: false`) out of its category in the
 * catalog. It is placed at the center of the canvas by the click that picks it, so
 * there is no crosshair to wait for and nothing to drag.
 */
async function placeFromCatalog(
	canvas: CanvasDriver,
	categoryId: string,
	presetId: string,
): Promise<string> {
	return captureCreated(canvas, presetId, async () => {
		await openCategoryFromCatalog(canvas, categoryId);
		await canvas.page.click(selectors.stencilPanelItem(presetId));
	});
}

/**
 * Draws one shape per plugin into the empty document, each in its own area of the
 * canvas so nothing overlaps (a container swallows what sits inside it, and the
 * ObjectMenu of a selected shape covers the area below it). Returns the new shapes'
 * data-ids in creation order.
 *
 * Every shape comes out of the catalog, and picking one closes the panel, so no
 * panel is left open between shapes.
 *
 * The flowchart representative is multiDocument rather than a plain box because it
 * is the one shipped shape minting per-object SVG ids.
 */
async function drawOneShapePerPlugin(canvas: CanvasDriver): Promise<string[]> {
	const ids: string[] = [];

	ids.push(
		await drawFromCatalog(
			canvas,
			"flowchart",
			"multiDocument",
			{ x: 120, y: 200 },
			{ x: 260, y: 320 },
		),
	);
	await canvas.deselect();

	ids.push(
		await drawFromCatalog(
			canvas,
			"uml",
			"class",
			{ x: 300, y: 200 },
			{ x: 440, y: 320 },
		),
	);
	await canvas.deselect();

	ids.push(
		await drawFromCatalog(
			canvas,
			"general",
			"actor",
			{ x: 500, y: 200 },
			{ x: 600, y: 320 },
		),
	);
	await canvas.deselect();

	ids.push(
		await drawFromCatalog(
			canvas,
			"annotation",
			"callout",
			{ x: 120, y: 400 },
			{ x: 280, y: 520 },
		),
	);
	await canvas.deselect();

	ids.push(
		await drawFromCatalog(
			canvas,
			"container",
			"frame",
			{ x: 900, y: 560 },
			{ x: 1100, y: 700 },
		),
	);
	await canvas.deselect();

	ids.push(
		await drawFromCatalog(
			canvas,
			"basic",
			"markdown",
			{ x: 320, y: 400 },
			{ x: 480, y: 520 },
		),
	);
	await canvas.deselect();

	// Stickies are center-placed on click (no bounds drawing), which lands this one
	// clear of everything above.
	ids.push(await placeFromCatalog(canvas, "basic", "sticky"));
	await canvas.deselect();

	// The icon is center-placed too, so it lands under the sticky. Overlap is fine
	// here: this suite asks whether every plugin's shape coexists in one document,
	// and a covered element is still a rendered, visible one.
	ids.push(await placeFromCatalog(canvas, "icon", "lucideIconUser"));
	await canvas.deselect();

	ids.push(
		await drawFromCatalog(
			canvas,
			"aws-group",
			"awsGroupVpc",
			{ x: 120, y: 560 },
			{ x: 400, y: 700 },
		),
	);
	await canvas.deselect();

	// Two of the same AWS icon, both center-placed: the icon drawing rewrites the
	// SVG ids it carries per object, so a second copy of one icon is what tells a
	// working rewrite from one document-wide set of ids shared by every instance.
	ids.push(await placeFromCatalog(canvas, "aws", AWS_S3_PRESET_ID));
	await canvas.deselect();
	ids.push(await placeFromCatalog(canvas, "aws", AWS_S3_PRESET_ID));
	await canvas.deselect();

	return ids;
}

test.describe("plugin coexistence", () => {
	test("mounts every plugin and lays the rail out with no duplicates", async ({
		canvas,
	}) => {
		await expect(canvas.page.locator('[data-kind="canvas"]')).toBeVisible();

		// No shape tool lives on the toolbar: neither a preset nor a category button.
		// Visible first, so the empty counts below are not just an absent toolbar.
		await expect(canvas.page.locator(selectors.toolbar)).toBeVisible();
		await expect(
			canvas.page.locator(`${selectors.toolbar} [data-action^="item:"]`),
		).toHaveCount(0);
		await expect(
			canvas.page.locator(`${selectors.toolbar} [data-action^="toggle:"]`),
		).toHaveCount(0);

		// Exact equality, not containment: it pins the order and rules out both a
		// missing entry and a second copy of one.
		expect(await readPresetIds(canvas, selectors.rail)).toEqual(
			RAIL_PRESET_IDS,
		);

		const categoryIds = await canvas.page
			.locator(CATEGORY_TOGGLES)
			.evaluateAll((elements) =>
				elements.map((element) =>
					(element.getAttribute("data-action") ?? "").slice("toggle:".length),
				),
			);
		expect(categoryIds).toEqual([PINNED_CATEGORY.id]);
	});

	test("fills the catalog with every plugin's own presets", async ({
		canvas,
	}) => {
		await canvas.openCatalog();

		const sectionIds = await canvas.page
			.locator(selectors.catalogRows)
			.evaluateAll((elements) =>
				elements.map((element) =>
					(element.getAttribute("data-action") ?? "").slice("show:".length),
				),
			);
		expect(sectionIds).toEqual(LIBRARY_SECTIONS.map((section) => section.id));
		await canvas.closeStencilPanel();

		const allPresetIds: string[] = [];
		for (const section of LIBRARY_SECTIONS) {
			await openCategoryFromCatalog(canvas, section.id);
			const presetIds = await readPresetIds(canvas, selectors.stencilPanel);
			expect(presetIds).toContain(section.ownPresetId);
			allPresetIds.push(...presetIds);
			await canvas.closeStencilPanel();
		}

		// Every plugin owns a disjoint set of presets, so an id filed under two
		// sections means two of them claimed the same one.
		expect(findDuplicates(allPresetIds)).toEqual([]);
	});

	test("opens the pinned category from the rail", async ({ canvas }) => {
		await canvas.page.click(selectors.categoryButton(PINNED_CATEGORY.id));
		const flyoutSelector = selectors.categoryPanel(PINNED_CATEGORY.id);
		await expect(canvas.page.locator(flyoutSelector)).toBeVisible();

		const presetIds = await readPresetIds(canvas, flyoutSelector);
		expect(presetIds).toContain(PINNED_CATEGORY.ownPresetId);

		await canvas.page.keyboard.press("Escape");
		await expect(canvas.page.locator(flyoutSelector)).toHaveCount(0);
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
