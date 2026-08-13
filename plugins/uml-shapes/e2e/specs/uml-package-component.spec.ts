import { test, expect } from "@jiscribe/canvas-sdk/testing/e2e";
import type { CanvasDriver } from "@jiscribe/canvas-sdk/testing/e2e";

/**
 * The two single-box UML shapes. Guarded behavior:
 * - each is created from the uml flyout and renders as one composite <g>
 * - the package's name is laid out in the body below the tab, so the editor never
 *   opens over the tab
 * - the line closing the body's top edge under the tab is stroked as thickly as
 *   the silhouette around it: it is drawn over the fill, not under it
 *   (UmlPackageBox), and drawing it the other way round halves it
 * - the component draws its icon as the body box plus three pieces, all painted
 *   with the shape's own fill so the tabs hide the crossings
 * - both hold a plain body text, edited by double-clicking the shape
 *
 * How a box shape resizes, rotates or connects is the core suite's business; only
 * what these two add is covered here.
 */

const CATEGORY = "uml";

const PACKAGE_FROM = { x: 300, y: 200 };
const PACKAGE_TO = { x: 460, y: 308 };
/** Well inside the body, below the 16px tab. */
const PACKAGE_BODY_SPOT = { x: 380, y: 270 };

const COMPONENT_FROM = { x: 600, y: 200 };
const COMPONENT_TO = { x: 760, y: 290 };
const COMPONENT_CENTER = { x: 680, y: 245 };

/** Computed stroke-width of every stroked part of the object, in DOM order. */
async function strokeWidths(
	canvas: CanvasDriver,
	id: string,
): Promise<number[]> {
	return canvas.page.evaluate((objectId) => {
		const group = document.querySelector(
			`[data-kind="object"][data-id="${objectId}"]`,
		);
		if (!group) {
			return [];
		}
		return [...group.querySelectorAll("polygon, path, line")].map((element) =>
			Number.parseFloat(getComputedStyle(element).strokeWidth),
		);
	}, id);
}

test.describe("umlPackage", () => {
	test("creates it from the uml flyout and edits the name in the body", async ({
		canvas,
	}) => {
		const id = await canvas.drawShapeFromFlyout(
			CATEGORY,
			"umlPackage",
			PACKAGE_FROM,
			PACKAGE_TO,
		);
		await canvas.deselect();

		const group = canvas.page.locator(`[data-kind="object"][data-id="${id}"]`);
		// One object = one data-kind element, holding the silhouette and the line.
		await expect(group).toHaveCount(1);
		expect(
			await group.evaluate((element) => element.tagName.toLowerCase()),
		).toBe("g");

		await canvas.typeTextAt(PACKAGE_BODY_SPOT, "OrderService");
		// The region is the body, so the editor starts below the tab rather than at
		// the top of the box.
		const editorBox = await canvas.page
			.locator('[data-testid="text-editor"]')
			.boundingBox();
		if (!editorBox) {
			throw new Error("no bounding box for the editor frame");
		}
		expect(editorBox.y).toBeGreaterThan(canvas.toScreen(PACKAGE_FROM).y);

		await canvas.commitText();
		await expect(canvas.page.locator("body")).toContainText("OrderService");
	});

	test("strokes the line under the tab as thickly as the silhouette", async ({
		canvas,
	}) => {
		const id = await canvas.drawShapeFromFlyout(
			CATEGORY,
			"umlPackage",
			PACKAGE_FROM,
			PACKAGE_TO,
		);
		await canvas.deselect();

		const widths = await strokeWidths(canvas, id);
		expect(widths).toHaveLength(2);
		expect(widths[1]).toBe(widths[0]);
	});
});

test.describe("umlComponent", () => {
	test("creates it from the uml flyout with the icon over its body", async ({
		canvas,
	}) => {
		const id = await canvas.drawShapeFromFlyout(
			CATEGORY,
			"umlComponent",
			COMPONENT_FROM,
			COMPONENT_TO,
		);
		await canvas.deselect();

		// The box plus the icon's three pieces, every one of them stroked alike.
		const widths = await strokeWidths(canvas, id);
		expect(widths).toHaveLength(4);
		expect(new Set(widths).size).toBe(1);

		// The tabs are painted after the body they cross, which is what hides the
		// crossings; a reordering would show up as the icon body coming last.
		const paintOrder = await canvas.page.evaluate((objectId) => {
			const group = document.querySelector(
				`[data-kind="object"][data-id="${objectId}"]`,
			);
			return [...(group?.querySelectorAll("path") ?? [])].map((element) =>
				(element.getAttribute("d") ?? "").split(" ").slice(1, 3).join(","),
			);
		}, id);
		// Both tabs start left of the icon body they overlap.
		const [, iconBody, upperTab, lowerTab] = paintOrder;
		const startX = (start: string): number => Number(start.split(",")[0]);
		expect(startX(upperTab)).toBeLessThan(startX(iconBody));
		expect(startX(lowerTab)).toBeLessThan(startX(iconBody));
	});

	test("edits the name over the whole box", async ({ canvas }) => {
		await canvas.drawShapeFromFlyout(
			CATEGORY,
			"umlComponent",
			COMPONENT_FROM,
			COMPONENT_TO,
		);
		await canvas.deselect();

		await canvas.typeTextAt(COMPONENT_CENTER, "PaymentGateway");
		await canvas.commitText();
		await expect(canvas.page.locator("body")).toContainText("PaymentGateway");
	});
});
