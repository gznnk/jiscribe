import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * The bottom tool bar (`bottomToolbar`): the floating bar centred over the
 * canvas at its bottom edge, where this harness pins its presets.
 *
 * - Its presets are the same `item:<presetId>` contract as the top bar's: a
 *   click arms drawing and a drag onto the canvas places the shape.
 * - It floats over the canvas without shrinking it, and shows only while the
 *   chrome is collapsed: expanded, the shape library holds the shapes, whether
 *   or not a sidebar is open and whether the library is the page's or the
 *   default one.
 * - Its "Other shapes" button opens a popover above the bar holding the shape
 *   library's search box and sections (the sidebar's, without its header),
 *   shown pressed while open. Using an item, Escape, a press outside it, the
 *   button again and expanding the chrome close it. Dragging off the button
 *   does nothing.
 */

/** Screen rectangle of an element, as boundingBox() reports it. */
type ScreenBox = { x: number; y: number; width: number; height: number };

async function boxOf(
	canvas: CanvasDriver,
	selector: string,
): Promise<ScreenBox> {
	const box = await canvas.page.locator(selector).boundingBox();
	if (!box) {
		throw new Error(`cannot get the box of ${selector}`);
	}
	return box;
}

/** Asserts the bar's centre line is the canvas area's, allowing 1px for rounding. */
async function expectCentredOverCanvas(canvas: CanvasDriver, hint: string) {
	const barBox = await boxOf(canvas, selectors.bottomToolbar);
	const canvasBox = await boxOf(canvas, selectors.canvasArea);
	const barCentreX = barBox.x + barBox.width / 2;
	const canvasCentreX = canvasBox.x + canvasBox.width / 2;
	expect(
		Math.abs(barCentreX - canvasCentreX),
		`${hint}: bar centre ${barCentreX} vs canvas centre ${canvasCentreX}`,
	).toBeLessThanOrEqual(1);
	expect(barBox.y + barBox.height).toBeLessThanOrEqual(
		canvasBox.y + canvasBox.height,
	);
}

test.describe("bottom tool bar", () => {
	test("pins the presets with the stencil item contract, then Other shapes", async ({
		canvas,
	}) => {
		const bar = canvas.page.locator(selectors.bottomToolbar);
		await expect(bar).toBeVisible();
		const rectItem = bar.locator('[data-action="item:rect"]');
		await expect(rectItem).toHaveAttribute("data-kind", "menu");
		await expect(rectItem).toHaveAttribute("data-id", "stencil-library");
		await expect(rectItem).toHaveAttribute("title", "Rectangle");
		await expect(
			canvas.page.locator(selectors.bottomToolbarOtherShapes),
		).toHaveAttribute("title", "Other shapes");
		// The harness pins every preset here, so none is left on the top bar.
		await expect(
			canvas.page.locator(`${selectors.toolbar} [data-action^="item:"]`),
		).toHaveCount(0);
	});

	test("draws a shape from a preset clicked on the bar", async ({ canvas }) => {
		await expect(
			canvas.page.locator(
				`${selectors.bottomToolbar} button[title="Rectangle"]`,
			),
		).toBeVisible();
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 300, y: 200 },
			{ x: 460, y: 300 },
		);
		await expect(canvas.objectById(id)).toBeVisible();
	});

	test("places a shape dragged off the bar onto the canvas", async ({
		canvas,
	}) => {
		const before = (await canvas.captureObjects()).length;
		const item = canvas.page.locator(selectors.shapeItem("rect"));
		// Well inside the canvas and clear of the edge zones (auto-scroll)
		const to = canvas.toScreen({ x: 500, y: 320 });

		await item.hover();
		await canvas.page.mouse.down();
		try {
			await canvas.page.mouse.move(to.x, to.y, { steps: 12 });
		} finally {
			await canvas.page.mouse.up();
		}

		await expect
			.poll(async () => (await canvas.captureObjects()).length, {
				message: "a new shape is created by the D&D off the bottom bar",
			})
			.toBe(before + 1);
	});

	test("floats over the canvas without taking its height", async ({
		canvas,
	}) => {
		const canvasBox = await boxOf(canvas, selectors.canvasArea);
		const viewportHeight = canvas.page.viewportSize()?.height;
		expect(canvasBox.y + canvasBox.height).toBe(viewportHeight);
		await expectCentredOverCanvas(canvas, "no sidebar open");
	});

	test("hides while expanded, both panels closed included, and comes back once collapsed", async ({
		canvas,
	}) => {
		const bottomToolbar = canvas.page.locator(selectors.bottomToolbar);
		await expect(bottomToolbar).toBeVisible();

		await canvas.toggleSidebars();
		await expect(bottomToolbar).toHaveCount(0);
		await canvas.closeStencilLibrary();
		await canvas.closePropertyPanel();
		await expect(bottomToolbar).toHaveCount(0);

		await canvas.toggleSidebars();
		await expect(bottomToolbar).toBeVisible();
		await expectCentredOverCanvas(canvas, "back once collapsed");

		// One sidebar expanding the chrome alone hides it as well.
		await canvas.openPropertyPanel();
		await expect(bottomToolbar).toHaveCount(0);
	});

	/** The default library holds the shapes there, so no exception is made. */
	test("hides while expanded on a page declaring no shape library too", async ({
		canvas,
	}) => {
		await canvas.goto("?noStencilLibrary");
		const bottomToolbar = canvas.page.locator(selectors.bottomToolbar);
		await expect(bottomToolbar).toBeVisible();

		await canvas.openPropertyPanel();
		await expect(bottomToolbar).toHaveCount(0);
	});

	test("does nothing when dragged off Other shapes", async ({ canvas }) => {
		const pageErrors: Error[] = [];
		canvas.page.on("pageerror", (error) => pageErrors.push(error));
		const before = await canvas.captureObjects();
		const otherShapes = canvas.page.locator(selectors.bottomToolbarOtherShapes);

		// The open context menu is what makes the press observable: a press on the
		// button dismisses it, so its closing proves the press was handled.
		await canvas.openContextMenu({ x: 600, y: 400 });
		const to = canvas.toScreen({ x: 500, y: 320 });
		await otherShapes.hover();
		await canvas.page.mouse.down();
		try {
			await canvas.page.mouse.move(to.x, to.y, { steps: 12 });
		} finally {
			await canvas.page.mouse.up();
		}
		await expect.poll(() => canvas.contextMenuVisible()).toBe(false);
		await expect(canvas.page.locator(selectors.drawingPreview)).toHaveCount(0);

		// Arming a tool afterwards is handled after the drag's end, so once it shows,
		// whatever the drag was going to do has been done.
		await canvas.page.click(selectors.toolButton("Rectangle"));
		await expect.poll(() => canvas.isDrawingMode()).toBe(true);
		expect(await canvas.captureObjects()).toEqual(before);
		await expect(canvas.page.locator(selectors.otherShapesPopover)).toHaveCount(
			0,
		);
		expect(pageErrors).toEqual([]);
	});
});

/** The harness's library: core's primitives, then the test-only category. */
const BASIC_SECTION = "basic";
const SPEC_SECTION = "spec";

/** Short enough that the popover's 60% cap leaves its list overflowing. */
const SHORT_VIEWPORT = { width: 1280, height: 300 };

async function openOtherShapes(canvas: CanvasDriver) {
	await canvas.page.click(selectors.bottomToolbarOtherShapes);
	await expect(canvas.page.locator(selectors.otherShapesPopover)).toBeVisible();
}

async function expectOtherShapesClosed(canvas: CanvasDriver) {
	await expect(canvas.page.locator(selectors.otherShapesPopover)).toHaveCount(
		0,
	);
	await expect(
		canvas.page.locator(selectors.bottomToolbarOtherShapes),
	).toHaveAttribute("aria-expanded", "false");
}

test.describe("Other shapes popover", () => {
	test("opens above the bar from Other shapes, which shows it pressed, leaving the chrome collapsed", async ({
		canvas,
	}) => {
		const otherShapes = canvas.page.locator(selectors.bottomToolbarOtherShapes);
		await expect(otherShapes).toHaveAttribute("aria-expanded", "false");
		await expect(canvas.page.locator(selectors.otherShapesPopover)).toHaveCount(
			0,
		);

		await openOtherShapes(canvas);
		await expect(otherShapes).toHaveAttribute("aria-expanded", "true");
		await expect(canvas.page.locator(selectors.sidebarsToggle)).toHaveAttribute(
			"aria-expanded",
			"false",
		);
		await expect(
			canvas.page.locator(selectors.stencilLibraryPanel),
		).toHaveCount(0);
		// Outside the bar's element, so the bar-scoped selectors keep to the bar.
		await expect(
			canvas.page.locator(
				`${selectors.bottomToolbar} ${selectors.otherShapesPopover}`,
			),
		).toHaveCount(0);

		const popoverBox = await boxOf(canvas, selectors.otherShapesPopover);
		const barBox = await boxOf(canvas, selectors.bottomToolbar);
		const canvasBox = await boxOf(canvas, selectors.canvasArea);
		expect(popoverBox.y + popoverBox.height).toBeLessThanOrEqual(barBox.y);
		// The sidebar's width, centred over the canvas like the bar.
		expect(Math.abs(popoverBox.width - 280)).toBeLessThanOrEqual(1);
		expect(
			Math.abs(
				popoverBox.x +
					popoverBox.width / 2 -
					(canvasBox.x + canvasBox.width / 2),
			),
		).toBeLessThanOrEqual(1);
		expect(popoverBox.height).toBeLessThanOrEqual(canvasBox.height * 0.6);
	});

	test("caps its width at the canvas less the bar's inset on each side", async ({
		canvas,
	}) => {
		// Narrowed once open: at this width the bar itself runs off the page, and
		// the button with it.
		await openOtherShapes(canvas);
		await canvas.page.setViewportSize({ width: 240, height: 600 });
		const popoverBox = await boxOf(canvas, selectors.otherShapesPopover);
		const canvasBox = await boxOf(canvas, selectors.canvasArea);
		expect(
			Math.abs(popoverBox.width - (canvasBox.width - 32)),
		).toBeLessThanOrEqual(1);
	});

	test("lists the shape library, its search starting empty and unfocused on every open", async ({
		canvas,
	}) => {
		await openOtherShapes(canvas);
		const search = canvas.page.locator(selectors.otherShapesPopoverSearch);
		const rectItem = canvas.page.locator(
			selectors.otherShapesPopoverItem("rect"),
		);
		const tileItem = canvas.page.locator(
			selectors.otherShapesPopoverItem("tile"),
		);
		await expect(
			canvas.page.locator(selectors.otherShapesPopoverSection(BASIC_SECTION)),
		).toHaveAttribute("aria-expanded", "true");
		await expect(
			canvas.page.locator(selectors.otherShapesPopoverSection(SPEC_SECTION)),
		).toHaveAttribute("aria-expanded", "true");
		await expect(rectItem).toBeVisible();
		await expect(tileItem).toBeVisible();
		await expect(search).toHaveValue("");
		await expect(search).not.toBeFocused();

		// The search works as the sidebar's does, reaching what a section holds
		// beyond its list.
		await search.fill("brick");
		await expect(
			canvas.page.locator(selectors.otherShapesPopoverItem("brick")),
		).toBeVisible();
		await expect(rectItem).toHaveCount(0);
		await expect(tileItem).toHaveCount(0);

		await canvas.page.click(selectors.bottomToolbarOtherShapes);
		await expectOtherShapesClosed(canvas);
		await openOtherShapes(canvas);
		await expect(search).toHaveValue("");
		await expect(rectItem).toBeVisible();
	});

	test("arms drawing mode from an item and closes", async ({ canvas }) => {
		await openOtherShapes(canvas);
		await canvas.page.click(selectors.otherShapesPopoverItem("rect"));
		await expect
			.poll(() => canvas.isDrawingMode(), {
				message: "a bounds-drawable item from the popover arms drawing mode",
			})
			.toBe(true);
		await expectOtherShapesClosed(canvas);
	});

	test("closes when an item is dragged out of it", async ({ canvas }) => {
		await openOtherShapes(canvas);
		const before = (await canvas.captureObjects()).length;
		const to = canvas.toScreen({ x: 500, y: 200 });
		await canvas.page.locator(selectors.otherShapesPopoverItem("rect")).hover();
		await canvas.page.mouse.down();
		try {
			await canvas.page.mouse.move(to.x, to.y, { steps: 12 });
			await expect(
				canvas.page.locator(selectors.otherShapesPopover),
			).toHaveCount(0);
		} finally {
			await canvas.page.mouse.up();
		}
		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(before + 1);
	});

	test("closes on Escape, the search box focused or not, keeping the selection", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 300, y: 150 }, { x: 400, y: 220 });
		await expect.poll(() => canvas.hasAnyControl()).toBe(true);

		await openOtherShapes(canvas);
		await canvas.page.keyboard.press("Escape");
		await expectOtherShapesClosed(canvas);
		expect(await canvas.hasAnyControl()).toBe(true);

		await openOtherShapes(canvas);
		const search = canvas.page.locator(selectors.otherShapesPopoverSearch);
		await search.click();
		await search.pressSequentially("ell");
		await search.press("Escape");
		await expectOtherShapesClosed(canvas);
		expect(await canvas.hasAnyControl()).toBe(true);
	});

	/** Otherwise the editor's Escape would close the popover instead. */
	test("closes when Enter opens the text editor, leaving Escape to the editor", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 300, y: 150 }, { x: 400, y: 220 });
		await expect.poll(() => canvas.hasAnyControl()).toBe(true);
		await openOtherShapes(canvas);

		await canvas.page.keyboard.press("Enter");
		await canvas.waitForTextEditor();
		await expectOtherShapesClosed(canvas);

		// Escape leaves the editor.
		await canvas.page.keyboard.press("Escape");
		await expect(canvas.page.locator(selectors.textEditor)).toHaveCount(0);
	});

	test("closes when a double click on the picked text opens the editor, leaving Escape to the editor", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 300, y: 150 }, { x: 400, y: 220 });
		// A second click on the selected rect picks its text slot.
		await canvas.clickAt({ x: 350, y: 185 });
		await openOtherShapes(canvas);

		const point = canvas.toScreen({ x: 350, y: 185 });
		await canvas.page.mouse.dblclick(point.x, point.y);
		await canvas.waitForTextEditor();
		await expectOtherShapesClosed(canvas);

		// Escape leaves the editor.
		await canvas.page.keyboard.press("Escape");
		await expect(canvas.page.locator(selectors.textEditor)).toHaveCount(0);
	});

	test("commits an open text edit when it opens", async ({ canvas }) => {
		await canvas.drawShape("Rectangle", { x: 300, y: 150 }, { x: 400, y: 220 });
		await canvas.page.keyboard.press("Enter");
		await canvas.waitForTextEditor();
		await canvas.page.keyboard.type("Hi");

		await openOtherShapes(canvas);
		await expect(canvas.page.locator(selectors.textEditor)).toHaveCount(0);
		await expect(
			canvas.page.locator(selectors.canvasArea).getByText("Hi"),
		).toBeVisible();
	});

	test("closes on a press outside it, on the button again, and when the chrome expands", async ({
		canvas,
	}) => {
		await openOtherShapes(canvas);
		await canvas.clickAt({ x: 600, y: 300 });
		await expectOtherShapesClosed(canvas);

		await openOtherShapes(canvas);
		await canvas.page.click(selectors.bottomToolbarOtherShapes);
		await expectOtherShapesClosed(canvas);

		await openOtherShapes(canvas);
		await canvas.toggleSidebars();
		await expect(canvas.page.locator(selectors.otherShapesPopover)).toHaveCount(
			0,
		);
		await canvas.toggleSidebars();
		await expectOtherShapesClosed(canvas);
	});

	test("closes the category flyout when it opens, and the flyout closes it", async ({
		canvas,
	}) => {
		const flyout = canvas.page.locator(selectors.categoryFlyout(SPEC_SECTION));
		await canvas.page.click(selectors.categoryButton(SPEC_SECTION));
		await expect(flyout).toBeVisible();

		await openOtherShapes(canvas);
		await expect(flyout).toHaveCount(0);

		await canvas.page.click(selectors.categoryButton(SPEC_SECTION));
		await expect(flyout).toBeVisible();
		await expectOtherShapesClosed(canvas);
	});

	test("scrolls its list under the wheel without panning or zooming the canvas", async ({
		canvas,
	}) => {
		await canvas.page.setViewportSize(SHORT_VIEWPORT);
		// Clear of the corner pills and of where the popover opens.
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 100, y: 100 },
			{ x: 200, y: 160 },
		);
		const shape = canvas.objectById(id);
		const shapeBox = await shape.boundingBox();

		await openOtherShapes(canvas);
		const list = canvas.page.locator(
			`${selectors.otherShapesPopover} > :last-child`,
		);
		const isOverflowing = await list.evaluate(
			(element) => element.scrollHeight > element.clientHeight,
		);
		expect(isOverflowing, "the list overflows the capped popover").toBe(true);

		const listBox = await list.boundingBox();
		if (!listBox) {
			throw new Error("cannot get the box of the popover's list");
		}
		await canvas.page.mouse.move(
			listBox.x + listBox.width / 2,
			listBox.y + listBox.height / 2,
		);
		await canvas.page.mouse.wheel(0, 120);
		await expect
			.poll(() => list.evaluate((element) => element.scrollTop))
			.toBeGreaterThan(0);

		// Ctrl held is a zoom over the canvas, and nothing over the popover; the
		// search box, which does not scroll, keeps the wheel as well.
		await canvas.page.keyboard.down("Control");
		await canvas.page.mouse.wheel(0, -120);
		await canvas.page.keyboard.up("Control");
		const searchBox = await boxOf(canvas, selectors.otherShapesPopoverSearch);
		await canvas.page.mouse.move(
			searchBox.x + searchBox.width / 2,
			searchBox.y + searchBox.height / 2,
		);
		await canvas.page.mouse.wheel(0, 120);

		// Arming a tool afterwards is handled after the wheels, so once it shows
		// whatever they were going to do to the camera has been done.
		await canvas.page.click(selectors.otherShapesPopoverItem("rect"));
		await expect.poll(() => canvas.isDrawingMode()).toBe(true);
		expect(await shape.boundingBox()).toEqual(shapeBox);
	});

	test("folds its sections together with the sidebar's", async ({ canvas }) => {
		await openOtherShapes(canvas);
		const popoverSection = canvas.page.locator(
			selectors.otherShapesPopoverSection(BASIC_SECTION),
		);
		await popoverSection.click();
		await expect(popoverSection).toHaveAttribute("aria-expanded", "false");
		await expect(
			canvas.page.locator(selectors.otherShapesPopoverItem("rect")),
		).toHaveCount(0);

		// Expanding the chrome with both panels closed opens both.
		await canvas.toggleSidebars();
		const sidebarSection = canvas.page.locator(
			selectors.stencilLibrarySection(BASIC_SECTION),
		);
		await expect(sidebarSection).toHaveAttribute("aria-expanded", "false");
		await sidebarSection.click();
		await expect(sidebarSection).toHaveAttribute("aria-expanded", "true");

		await canvas.toggleSidebars();
		await openOtherShapes(canvas);
		await expect(popoverSection).toHaveAttribute("aria-expanded", "true");
	});
});
