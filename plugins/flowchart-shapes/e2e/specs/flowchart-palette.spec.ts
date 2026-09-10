import type { CanvasDriver } from "@jiscribe/canvas-sdk/testing/e2e";
import { test, expect, selectors } from "@jiscribe/canvas-sdk/testing/e2e";

/**
 * Guards that every preset the flowchart flyout offers can be created by drag
 * and renders as the SVG element its presentation writes. The element is the
 * part the unit tests cannot see: a shape whose outline and text region are both
 * right still reaches nobody if its stencil never enters drawing mode, and the
 * tag is what tells the three ways a flowchart shape is drawn apart —
 * `<polygon>` for the straight-edged ones, `<path>` for the curved ones, and
 * `<g>` where the drawing is several elements and only the group carries
 * `data-kind` (the composite sheets of multiDocument, and the shapes whose label
 * hangs below the box with a hit area of its own).
 *
 * It also pins the "reuse the type, let the preset carry the meaning" decision:
 * `process` is core's rect and `onPageConnector` core's ellipse, while
 * `offPageConnector`, which no core type draws, has a type of its own.
 *
 * The last test keeps the table below level with the flyout, so a preset added
 * to flowchartStencilCategory arrives here rather than going untested.
 */

const FLOWCHART = "flowchart";

/** One shape per page, so every preset is drawn in the same empty box. */
const FROM = { x: 300, y: 220 };
const TO = { x: 440, y: 320 };

/** Every preset the flowchart flyout offers, with the element it renders as. */
const PRESETS: ReadonlyArray<{ presetId: string; tag: string }> = [
	{ presetId: "process", tag: "rect" },
	{ presetId: "diamond", tag: "polygon" },
	{ presetId: "stadium", tag: "rect" },
	{ presetId: "subroutine", tag: "path" },
	{ presetId: "parallelogram", tag: "polygon" },
	{ presetId: "document", tag: "path" },
	{ presetId: "multiDocument", tag: "g" },
	{ presetId: "db", tag: "g" },
	{ presetId: "storedData", tag: "path" },
	{ presetId: "display", tag: "path" },
	{ presetId: "manualInput", tag: "polygon" },
	{ presetId: "card", tag: "polygon" },
	{ presetId: "trapezoid", tag: "polygon" },
	{ presetId: "hexagon", tag: "polygon" },
	{ presetId: "delay", tag: "path" },
	{ presetId: "loopLimit", tag: "polygon" },
	{ presetId: "extract", tag: "g" },
	{ presetId: "cross", tag: "g" },
	{ presetId: "onPageConnector", tag: "ellipse" },
	{ presetId: "offPageConnector", tag: "polygon" },
];

/** Creates one presetId from the flowchart flyout by diagonal drag and returns its SVG tag name. */
async function createFromFlyout(
	canvas: CanvasDriver,
	presetId: string,
): Promise<string | undefined> {
	const id = await canvas.drawShapeFromFlyout(FLOWCHART, presetId, FROM, TO);
	const created = (await canvas.captureObjects()).find((obj) => obj.id === id);
	return created?.tag;
}

test.describe("flowchart palette", () => {
	for (const { presetId, tag } of PRESETS) {
		test(`creates ${presetId} from the flyout as <${tag}>`, async ({
			canvas,
		}) => {
			expect(await createFromFlyout(canvas, presetId)).toBe(tag);
		});
	}

	test("offers exactly the presets this spec draws", async ({ canvas }) => {
		await canvas.page.click(selectors.categoryButton(FLOWCHART));
		const flyout = canvas.page.locator(selectors.categoryFlyout(FLOWCHART));
		await expect(flyout).toBeVisible();

		const offered = await flyout
			.locator('[data-part^="item:"]')
			.evaluateAll((items) =>
				items.map((item) =>
					(item.getAttribute("data-part") ?? "").replace("item:", ""),
				),
			);
		expect(offered).toEqual(PRESETS.map(({ presetId }) => presetId));
	});
});
