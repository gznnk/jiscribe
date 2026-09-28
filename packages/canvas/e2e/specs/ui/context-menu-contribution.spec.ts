import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * Rows an object type adds to the context menu, and the press that decides whose
 * rows those are.
 *
 * The contributing type is the harness plugin's `pin` (specShapesPlugin): it
 * declares a `contextMenu` naming the plugin's own `openPinPanel` command and a
 * second id nothing registers. No core type contributes anything, so every other
 * press here shows the built-in block that context-menu-z-order and
 * driver-context-menu are written against.
 */

/** Every command row of the open menu, in the order they are drawn. */
async function contextMenuCommandIds(canvas: CanvasDriver): Promise<string[]> {
	const parts = await canvas.page
		.locator('[data-id="context-menu"][data-part^="command:"]')
		.evaluateAll((elements) =>
			elements.map((element) => element.getAttribute("data-part") ?? ""),
		);
	return parts.map((part) => part.replace("command:", ""));
}

/** Places a pin at the canvas center and right-clicks it, leaving the menu open. */
async function openContextMenuOnPin(canvas: CanvasDriver): Promise<string> {
	const id = await canvas.placeShape("Pin");
	const box = await canvas.objectById(id).boundingBox();
	if (!box) {
		throw new Error("the placed pin has no bounding box");
	}
	await canvas.openContextMenu(
		canvas.toContent({
			x: box.x + box.width / 2,
			y: box.y + box.height / 2,
		}),
	);
	return id;
}

test.describe("context menu contribution", () => {
	test("draws the pressed type's rows after the built-in ones", async ({
		canvas,
	}) => {
		await openContextMenuOnPin(canvas);

		const ids = await contextMenuCommandIds(canvas);
		expect(ids).toContain("openPinPanel");
		expect(
			ids.indexOf("openPinPanel"),
			'placement "after" puts the contributed rows below the whole built-in block',
		).toBeGreaterThan(ids.indexOf("export"));
	});

	test("draws no row for a contributed item naming an unregistered command", async ({
		canvas,
	}) => {
		await openContextMenuOnPin(canvas);

		expect(await contextMenuCommandIds(canvas)).not.toContain(
			"pinCommandNobodyRegistered",
		);
	});

	test("leaves the menu built-in over a shape of a type contributing nothing", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });

		await canvas.openContextMenu({ x: 500, y: 260 });

		const ids = await contextMenuCommandIds(canvas);
		expect(ids).not.toContain("openPinPanel");
		expect(ids, "the built-in block is still there").toContain("copy");
	});

	test("leaves the menu built-in over the background", async ({ canvas }) => {
		await openContextMenuOnPin(canvas);
		await canvas.deselect();

		await canvas.openContextMenu({ x: 120, y: 120 });

		expect(await contextMenuCommandIds(canvas)).not.toContain("openPinPanel");
	});

	// The contributed row carries the same `data-part` as a built-in one, so the
	// press goes through ContextMenuHandler to the plugin's command.
	test("runs the contributed command when its row is pressed", async ({
		canvas,
	}) => {
		await openContextMenuOnPin(canvas);
		await expect(canvas.page.locator(selectors.propertyPanel)).toHaveCount(0);

		await canvas.clickContextMenuCommand("openPinPanel");

		await expect(canvas.page.locator(selectors.propertyPanel)).toBeVisible();
	});
});
