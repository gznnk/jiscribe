import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * Guards the ObjectMenu switch between the two boxes a body's vertical alignment
 * is measured against: the region the type's own outline leaves clear, and the
 * shape's whole height (`textVerticalBasis`). The ellipse is the built-in that
 * insets its region — its text is laid out in the inscribed rectangle — so it is
 * the one the switch is offered on, and a rect, whose region is its whole box
 * already, is checked not to be offered it.
 *
 * The doc is injected through the harness hook rather than drawn: the basis is a
 * document field no toolbar gesture writes.
 */

/** Centre and radii of the injected ellipse, in content coordinates. */
const OVAL_CX = 300;
const OVAL_CY = 220;
const OVAL_RX = 140;
const OVAL_RY = 90;

/** Left edge, top edge and box of the injected rect, in content coordinates. */
const RECT_X = 560;
const RECT_Y = 160;
const RECT_WIDTH = 160;
const RECT_HEIGHT = 120;

/**
 * The height of the ellipse's declared region: the inscribed rectangle is
 * 1/√2 of the box on each axis (`calcEllipseTextRegion`).
 */
const REGION_HEIGHT = (OVAL_RY * 2) / Math.SQRT2;

const docText = JSON.stringify({
	version: 1,
	root: [
		{
			id: "oval",
			type: "ellipse",
			cx: OVAL_CX,
			cy: OVAL_CY,
			rx: OVAL_RX,
			ry: OVAL_RY,
			// Opaque so a press at the centre lands on a painted face.
			fill: "#cbd5e1",
			fontSize: 14,
			verticalAlign: "top",
			text: "a label placed against one box or the other",
		},
		{
			id: "plain",
			type: "rect",
			x: RECT_X,
			y: RECT_Y,
			width: RECT_WIDTH,
			height: RECT_HEIGHT,
			fill: "#cbd5e1",
			fontSize: 14,
			text: "a label with only one box to sit in",
		},
	],
});

async function loadDoc(canvas: CanvasDriver) {
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
	await expect(canvas.objectById("oval")).toHaveCount(1);
}

/**
 * The height of the box the shape's text is drawn in, straight off the overlay's
 * foreignObject. For rect and ellipse the shape element and the foreignObject
 * are siblings, so this walks forward from the data-id element.
 */
async function textBoxHeightOf(
	canvas: CanvasDriver,
	id: string,
): Promise<number> {
	return canvas.page.evaluate((targetId) => {
		const shape = document.querySelector(`[data-id="${targetId}"]`);
		if (!shape) {
			throw new Error(`the injected shape "${targetId}" is not on the canvas`);
		}
		let sibling = shape.nextElementSibling;
		while (sibling && sibling.tagName.toLowerCase() !== "foreignobject") {
			sibling = sibling.nextElementSibling;
		}
		if (!sibling) {
			throw new Error(`no text overlay is drawn over "${targetId}"`);
		}
		return Number(sibling.getAttribute("height"));
	}, id);
}

/** The vertical-basis switch, found by the command it fires. */
const basisSwitch = (canvas: CanvasDriver) =>
	canvas.page.locator(selectors.objectMenuCommand("toggleTextVerticalBasis"));

test.describe("the box a body's vertical alignment is measured against", () => {
	test("switches to the whole height from the object menu and back with undo", async ({
		canvas,
	}) => {
		await loadDoc(canvas);
		await canvas.selectAt({ x: OVAL_CX, y: OVAL_CY });

		expect(await textBoxHeightOf(canvas, "oval")).toBeCloseTo(REGION_HEIGHT, 3);

		const toggle = basisSwitch(canvas);
		await expect(toggle).toBeVisible();
		await expect(toggle).toHaveAttribute("title", "Align Text to Full Height");

		// Switched over, the text is placed against the ellipse's whole height
		// rather than the rectangle inscribed in it.
		await toggle.click();
		await expect(toggle).toHaveAttribute("title", "Align Text to Shape Area");
		expect(await textBoxHeightOf(canvas, "oval")).toBe(OVAL_RY * 2);

		// Undo rebuilds the canvas from the previous document, selection included,
		// so the shape is picked up again to read the switch back off the menu.
		await canvas.undo();
		expect(await textBoxHeightOf(canvas, "oval")).toBeCloseTo(REGION_HEIGHT, 3);
		await canvas.selectAt({ x: OVAL_CX, y: OVAL_CY });
		await expect(toggle).toHaveAttribute("title", "Align Text to Full Height");
	});

	test("is not offered on a shape whose region is its whole box already", async ({
		canvas,
	}) => {
		await loadDoc(canvas);
		await canvas.selectAt({
			x: RECT_X + RECT_WIDTH / 2,
			y: RECT_Y + RECT_HEIGHT / 2,
		});

		await expect(canvas.page.locator(selectors.objectMenu)).toBeVisible();
		await expect(basisSwitch(canvas)).toHaveCount(0);
	});
});
