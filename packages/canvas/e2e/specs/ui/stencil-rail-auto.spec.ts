import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * The rail's document categories: below the pins, behind a dashed divider, the
 * library categories the open document uses, derived from the document alone.
 *
 * - Loading a document adds the categories it uses, children of groups
 *   included; a pinned one stays a pin and is not repeated.
 * - Placing a shape of an unused category adds it at once, and deleting the
 *   last such shape takes it away again; undo and redo follow.
 * - A shape a rail preset creates adds no category, even one also listing that
 *   type.
 * - The catalog badges every category the document uses, pinned or not.
 *
 * The harness (e2e/harness/main.tsx) pins `spec` (listing `tile`) and leaves
 * `mixed` (listing `panel` beside core's `rect`) unpinned; `basic` lists only
 * rail presets' types.
 */

const SPEC_CATEGORY = "spec";
const MIXED_CATEGORY = "mixed";
const BASIC_CATEGORY = "basic";

/** A panel and a tile, both inside a group: neither is in `rootIds`. */
const groupedDocText = JSON.stringify({
	version: 1,
	root: [
		{
			id: "group-1",
			type: "group",
			children: [
				{
					id: "panel-1",
					type: "panel",
					x: 200,
					y: 200,
					width: 120,
					height: 80,
				},
				{ id: "tile-1", type: "tile", x: 400, y: 200, width: 120, height: 80 },
			],
		},
	],
});

async function loadDoc(canvas: CanvasDriver, docText: string) {
	await canvas.page.evaluate((text) => {
		const hook = (
			window as unknown as { __setHarnessDoc?: (docText: string) => void }
		).__setHarnessDoc;
		if (!hook) {
			throw new Error(
				"__setHarnessDoc is undefined (harness hook not installed)",
			);
		}
		hook(text);
	}, docText);
}

/** The `toggle:<id>` actions of one rail group, in rail order. */
async function railCategoryActions(
	canvas: CanvasDriver,
	railGroup: "pinned" | "document",
): Promise<(string | null)[]> {
	return canvas.page
		.locator(selectors.railCategoryButtons(railGroup))
		.evaluateAll((buttons) =>
			buttons.map((button) => button.getAttribute("data-action")),
		);
}

test.describe("Stencil rail document categories", () => {
	test("a loaded document adds the categories its shapes and its groups' children use, a pinned one only as its pin", async ({
		canvas,
	}) => {
		await expect(
			canvas.page.locator(selectors.railCategoryButtons("document")),
		).toHaveCount(0);
		await expect(
			canvas.page.locator(selectors.railDocumentDivider),
		).toHaveCount(0);

		await loadDoc(canvas, groupedDocText);
		await expect(canvas.objectById("panel-1")).toHaveCount(1);

		await expect
			.poll(() => railCategoryActions(canvas, "document"))
			.toEqual([`toggle:${MIXED_CATEGORY}`]);
		expect(await railCategoryActions(canvas, "pinned")).toEqual([
			`toggle:${SPEC_CATEGORY}`,
		]);
		await expect(
			canvas.page.locator(selectors.railDocumentDivider),
		).toBeVisible();

		// The added button opens its category like a pinned one.
		await canvas.page.click(selectors.categoryButton(MIXED_CATEGORY));
		await expect(
			canvas.page.locator(selectors.categoryPanel(MIXED_CATEGORY)),
		).toBeVisible();
	});

	test("placing a shape of an unused category from the catalog adds it, and deleting it takes it away", async ({
		canvas,
	}) => {
		await canvas.openCatalog();
		await canvas.page.click(selectors.catalogRow(MIXED_CATEGORY));
		await canvas.page.click(selectors.stencilPanelItem("panel"));
		await expect
			.poll(() => canvas.isDrawingMode(), {
				message: "clicking the panel preset enters drawing mode",
			})
			.toBe(true);
		const before = (await canvas.captureObjects()).length;
		await canvas.drag({ x: 360, y: 240 }, { x: 520, y: 360 });
		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(before + 1);

		await expect
			.poll(() => railCategoryActions(canvas, "document"))
			.toEqual([`toggle:${MIXED_CATEGORY}`]);

		// The new shape is selected, so Delete removes the only panel.
		await canvas.deleteSelection();
		await expect
			.poll(() => railCategoryActions(canvas, "document"))
			.toEqual([]);
		await expect(
			canvas.page.locator(selectors.railDocumentDivider),
		).toHaveCount(0);

		await canvas.undo();
		await expect
			.poll(() => railCategoryActions(canvas, "document"))
			.toEqual([`toggle:${MIXED_CATEGORY}`]);
		await canvas.redo();
		await expect
			.poll(() => railCategoryActions(canvas, "document"))
			.toEqual([]);
	});

	test("a plain rectangle adds no category, not even one also listing a rect-typed preset", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 120, y: 150 }, { x: 240, y: 240 });

		await expect(
			canvas.page.locator(selectors.railCategoryButtons("document")),
		).toHaveCount(0);
		await expect(
			canvas.page.locator(selectors.railDocumentDivider),
		).toHaveCount(0);
		await canvas.openCatalog();
		await expect(
			canvas.page.locator(selectors.catalogInDiagramBadge(MIXED_CATEGORY)),
		).toHaveCount(0);
		await expect(
			canvas.page.locator(selectors.catalogInDiagramBadge(BASIC_CATEGORY)),
		).toHaveCount(0);
	});

	test("the catalog badges every category the document uses, pinned or not", async ({
		canvas,
	}) => {
		await loadDoc(canvas, groupedDocText);
		await expect(canvas.objectById("panel-1")).toHaveCount(1);
		await canvas.openCatalog();

		await expect(
			canvas.page.locator(selectors.catalogInDiagramBadge(MIXED_CATEGORY)),
		).toHaveText("In this diagram");
		await expect(
			canvas.page.locator(selectors.catalogInDiagramBadge(SPEC_CATEGORY)),
		).toHaveText("In this diagram");
		await expect(
			canvas.page.locator(selectors.catalogInDiagramBadge(BASIC_CATEGORY)),
		).toHaveCount(0);
	});
});
