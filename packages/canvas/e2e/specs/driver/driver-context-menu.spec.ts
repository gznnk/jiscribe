import { test, expect } from "../../fixtures";
import { selectors } from "../../support/selectors";

/**
 * Driver self-test for CanvasDriver's context menu operations.
 */
test.describe("driver: context menu", () => {
	test("opens the context menu when a shape is right-clicked", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });

		await canvas.openContextMenu({ x: 500, y: 260 });

		expect(await canvas.contextMenuVisible()).toBe(true);
	});

	test("adds an object and closes the menu on a command item (duplicate)", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });
		const before = (await canvas.captureObjects()).length;

		await canvas.openContextMenu({ x: 500, y: 260 });
		await canvas.clickContextMenuCommand("duplicate");

		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(before + 1);
		await expect.poll(() => canvas.contextMenuVisible()).toBe(false);
	});

	// The paste callback item runs through React's onClick rather than a gesture,
	// but PASTE makes handlePaste set contextMenuPosition to null, so the menu closes.
	test("adds an object and closes the menu on a callback item (paste)", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });

		// Copy first (command path; this closes the menu).
		await canvas.openContextMenu({ x: 500, y: 260 });
		await canvas.clickContextMenuCommand("copy");
		const afterCopy = (await canvas.captureObjects()).length;

		// Then paste (callback path).
		await canvas.openContextMenu({ x: 500, y: 260 });
		await canvas.clickContextMenuItem("paste");

		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(afterCopy + 1);
		await expect.poll(() => canvas.contextMenuVisible()).toBe(false);
	});

	// Nothing is copied first: the OS clipboard read fails without permission and
	// internalClipboard is null too.
	test("closes the menu when paste is clicked with nothing to paste (#34)", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });
		const before = (await canvas.captureObjects()).length;

		await canvas.openContextMenu({ x: 500, y: 260 });
		await canvas.clickContextMenuItem("paste");

		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(before);
		await expect.poll(() => canvas.contextMenuVisible()).toBe(false);
	});

	test("closes the menu when clicking outside it", async ({ canvas }) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });

		await canvas.openContextMenu({ x: 500, y: 260 });
		expect(await canvas.contextMenuVisible()).toBe(true);

		await canvas.deselect();

		await expect.poll(() => canvas.contextMenuVisible()).toBe(false);
	});

	test("removes the selection on cut, and the cut shape pastes back", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });
		const before = (await canvas.captureObjects()).length;

		await canvas.openContextMenu({ x: 500, y: 260 });
		await canvas.clickContextMenuCommand("cut");

		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(before - 1);

		// The cut put it on the internal clipboard, which is what tells cut apart
		// from delete.
		await canvas.openContextMenu({ x: 500, y: 260 });
		await canvas.clickContextMenuItem("paste");
		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(before);
	});

	test("removes the selection on delete", async ({ canvas }) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });
		const before = (await canvas.captureObjects()).length;

		await canvas.openContextMenu({ x: 500, y: 260 });
		await canvas.clickContextMenuCommand("delete");

		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(before - 1);
		await expect.poll(() => canvas.contextMenuVisible()).toBe(false);
	});

	test("raises the selection one step on bringForward", async ({ canvas }) => {
		// DOM order follows creation order: back (index 0) -> front (index 1)
		const back = await canvas.drawShape(
			"Rectangle",
			{ x: 300, y: 200 },
			{ x: 440, y: 320 },
		);
		await canvas.deselect();
		await canvas.drawShape("Rectangle", { x: 500, y: 200 }, { x: 640, y: 320 });
		await canvas.deselect();
		await canvas.selectAt({ x: 370, y: 260 });
		expect(await canvas.objectIndex(back)).toBe(0);

		await canvas.openContextMenu({ x: 370, y: 260 });
		await canvas.clickContextMenuCommand("bringForward");

		await expect.poll(() => canvas.objectIndex(back)).toBe(1);
	});

	// The two item kinds are wired differently: a callback item drops its onClick
	// when disabled, while a command item keeps its data-part whatever its state.
	// What holds the press back is then the native button's `disabled` and nothing
	// else — a MenuItem that stopped being a <button>, or that moved the part onto
	// an inner element, would hand every press straight to ContextMenuHandler. So
	// the assertion is on the attribute itself: `toBeDisabled` passes for a
	// disabled form control (or aria-disabled) and for nothing else.
	test("gates its command items on the button's own disabled attribute", async ({
		canvas,
	}) => {
		// One shape selected: group wants two of them, ungroup wants a group, and
		// copy is happy — so the same menu carries both states at once.
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });

		await canvas.openContextMenu({ x: 500, y: 260 });

		await expect(
			canvas.page.locator(selectors.contextMenuCommand("group")),
		).toBeDisabled();
		await expect(
			canvas.page.locator(selectors.contextMenuCommand("ungroup")),
		).toBeDisabled();
		await expect(
			canvas.page.locator(selectors.contextMenuCommand("copy")),
			"the row is read per command, not switched off wholesale",
		).toBeEnabled();
	});

	// The menu's own visibility says nothing here: a press a disabled button
	// swallows is retargeted to its ancestors, reaches the viewport under the menu
	// and closes it from there, exactly as a press beside the menu would.
	test("runs nothing when a disabled command item is pressed", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });
		const before = await canvas.captureObjects();

		await canvas.openContextMenu({ x: 500, y: 260 });
		// force: this is the press a user makes on the item; without it Playwright
		// would refuse on the very attribute under test.
		await canvas.page
			.locator(selectors.contextMenuCommand("group"))
			.click({ force: true });

		expect(
			await canvas.captureObjects(),
			"nothing was grouped, and nothing was moved by the press falling through",
		).toEqual(before);
	});
});
