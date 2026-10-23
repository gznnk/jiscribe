import type { CanvasDriver } from "@jiscribe/canvas-sdk/testing/e2e";
import { test, expect, selectors } from "@jiscribe/canvas-sdk/testing/e2e";

/** The picker's own test hooks; everything else is reached through `selectors`. */
const GRID = '[data-testid="icon-picker-grid"]';
const SEARCH = '[data-testid="icon-picker-search"]';

test.describe("icon picker", () => {
	test("replaces the icon with the one clicked in the grid", async ({
		canvas,
	}) => {
		const id = await canvas.placeShapeFromFlyout("icon", "lucideIconUser");
		const shape = canvas.objectById(id);
		const before = await shape.locator("path").first().getAttribute("d");

		await canvas.page.click(selectors.objectMenuToggle("lucide-icon"));
		// Pressed and released with a pause between, the way a hand clicks. An instant
		// click is not the same event: the canvas captures the pointer for the duration
		// of a press, so a React onClick on the cell would fire for the fast one and
		// never for this one.
		const cell = canvas.page.locator(selectors.objectMenuSet("icon", "lock"));
		const box = await cell.boundingBox();
		if (box === null) {
			throw new Error("the lock cell is not laid out");
		}
		await canvas.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
		await canvas.page.mouse.down();
		await canvas.page.waitForTimeout(150);
		await canvas.page.mouse.up();

		// The picker writes `icon`, so the drawing changes without the box moving.
		await expect
			.poll(async () => shape.locator("path").first().getAttribute("d"))
			.not.toBe(before);
	});

	test("narrows the grid to what the search matches", async ({ canvas }) => {
		await canvas.placeShapeFromFlyout("icon", "lucideIconUser");
		await canvas.page.click(selectors.objectMenuToggle("lucide-icon"));

		const cells = canvas.page.locator(
			`[data-testid="icon-picker-grid"] [data-action^="set:icon:"]`,
		);
		// count() does not auto-wait, so it has to follow a wait for the panel: taken
		// straight after the toggle click it reads 0 cells and the comparison below is
		// against an empty grid.
		await expect(canvas.page.locator(GRID)).toBeVisible();
		const commonCount = await cells.count();
		expect(commonCount).toBeGreaterThan(20);

		await canvas.page.fill('[data-testid="icon-picker-search"]', "lock");
		await expect(cells.first()).toHaveAttribute("data-action", "set:icon:lock");
		expect(await cells.count()).toBeLessThan(commonCount);
	});
});

test.describe("icon picker chrome", () => {
	/** Places an icon and opens the picker, returning the panel around the grid. */
	const openPicker = async (canvas: CanvasDriver) => {
		await canvas.placeShapeFromFlyout("icon", "lucideIconUser");
		await canvas.page.click(selectors.objectMenuToggle("lucide-icon"));
		const grid = canvas.page.locator(GRID);
		await expect(grid).toBeVisible();
		return grid.locator("xpath=..");
	};

	test("scrolls the grid on a wheel, leaving the canvas where it was", async ({
		canvas,
	}) => {
		await openPicker(canvas);
		const grid = canvas.page.locator(GRID);
		const objectBefore = await canvas.page
			.locator('[data-kind="object"]')
			.first()
			.boundingBox();

		await grid.hover();
		await canvas.page.mouse.wheel(0, 200);

		await expect
			.poll(async () => grid.evaluate((el) => el.scrollTop))
			.toBe(200);
		// A canvas that scrolled would carry the shape with it.
		const objectAfter = await canvas.page
			.locator('[data-kind="object"]')
			.first()
			.boundingBox();
		expect(objectAfter?.y).toBe(objectBefore?.y);
	});

	test("keeps the panel one size however many icons match", async ({
		canvas,
	}) => {
		const panel = await openPicker(canvas);
		const search = canvas.page.locator(SEARCH);
		const heightOf = async () => (await panel.boundingBox())?.height;
		const searchY = async () => (await search.boundingBox())?.y;

		const height = await heightOf();
		const y = await searchY();
		// A panel that opened upward would grow from its bottom edge, so a grid sized to
		// its contents would walk the search field under the pointer as the query narrows.
		for (const query of ["a", "lock", "no-such-icon-anywhere"]) {
			await search.fill(query);
			await expect(await heightOf()).toBe(height);
			expect(await searchY()).toBe(y);
		}
	});

	test("starts from the whole set each time it opens", async ({ canvas }) => {
		await openPicker(canvas);
		const search = canvas.page.locator(SEARCH);
		await search.fill("lock");
		await expect(search).toHaveValue("lock");

		await canvas.page.click(selectors.objectMenuToggle("lucide-icon"));
		await canvas.page.click(selectors.objectMenuToggle("lucide-icon"));

		await expect(canvas.page.locator(SEARCH)).toHaveValue("");
	});

	test("leaves the search field's right-click to the browser", async ({
		canvas,
	}) => {
		await openPicker(canvas);

		await canvas.page.locator(SEARCH).click({ button: "right" });
		await expect(canvas.page.locator(selectors.contextMenuAny)).toHaveCount(0);

		// The canvas answers a right-click with a menu of its own, which would hide the
		// browser's copy / paste one. Shown here last, so the assertion above is known to
		// be watching something that does appear rather than passing on a stale selector.
		await canvas.page.locator('[data-kind="object"]').first().click({
			button: "right",
		});
		await expect(
			canvas.page.locator(selectors.contextMenuAny).first(),
		).toBeVisible();
	});
});

test.describe("icon picker in the properties sidebar", () => {
	/** The icon section, as the lucideIcon definition names it. */
	const PANEL_SECTION = "lucideIcon";
	const TRIGGER = `${selectors.propertyPanel} button[aria-label="Icon"]`;
	const PANEL_GRID = `${selectors.propertyPanelDropdown} ${GRID}`;
	const PANEL_SEARCH = `${selectors.propertyPanelDropdown} ${SEARCH}`;

	/** Screen rectangle of the first match, failing the test when it is not laid out. */
	async function boxOf(canvas: CanvasDriver, selector: string) {
		const box = await canvas.page.locator(selector).first().boundingBox();
		if (box === null) {
			throw new Error(`cannot get the box of ${selector}`);
		}
		return box;
	}

	test("leads the sidebar, ahead of Layout", async ({ canvas }) => {
		await canvas.openPropertyPanel();
		await canvas.placeShapeFromFlyout("icon", "lucideIconUser");

		await expect(
			canvas.page.locator(selectors.propertyPanelSection(PANEL_SECTION)),
		).toBeVisible();
		const sectionIds = await canvas.page
			.locator(`${selectors.propertyPanel} [data-action^="toggle:"]`)
			.evaluateAll((toggles) =>
				toggles.map((toggle) => toggle.getAttribute("data-action")),
			);
		expect(sectionIds[0]).toBe(`toggle:${PANEL_SECTION}`);
		expect(sectionIds[1]).toBe("toggle:layout");
	});

	test("replaces the icon with the one pressed in the grid", async ({
		canvas,
	}) => {
		await canvas.openPropertyPanel();
		const id = await canvas.placeShapeFromFlyout("icon", "lucideIconUser");
		const shape = canvas.objectById(id);
		await expect(canvas.page.locator(TRIGGER)).toContainText("user");

		await canvas.page.click(TRIGGER);
		await canvas.page.fill(PANEL_SEARCH, "lock");
		const cell = canvas.page.locator(
			`${PANEL_GRID} [data-action="set:icon:lock"]`,
		);
		await expect(cell).toBeVisible();
		const lockArt = await cell.locator("path").first().getAttribute("d");

		// Held the way a hand presses, as in the ObjectMenu's spec above.
		const box = await cell.boundingBox();
		if (box === null) {
			throw new Error("the lock cell is not laid out");
		}
		await canvas.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
		await canvas.page.mouse.down();
		await canvas.page.waitForTimeout(150);
		await canvas.page.mouse.up();

		await expect
			.poll(async () => shape.locator("path").first().getAttribute("d"))
			.toBe(lockArt);
		await expect(canvas.page.locator(TRIGGER)).toContainText("lock");
	});

	test("opens left of the sidebar, as wide as the ObjectMenu's picker", async ({
		canvas,
	}) => {
		await canvas.openPropertyPanel();
		await canvas.placeShapeFromFlyout("icon", "lucideIconUser");
		const triggerBox = await boxOf(canvas, TRIGGER);

		await canvas.page.click(TRIGGER);

		await expect(canvas.page.locator(PANEL_GRID)).toBeVisible();
		const panelBox = await boxOf(canvas, selectors.propertyPanelDropdown);
		const sidebar = await boxOf(canvas, selectors.propertyPanel);
		expect(panelBox.x + panelBox.width).toBeLessThan(sidebar.x);
		expect(Math.abs(panelBox.y - triggerBox.y)).toBeLessThanOrEqual(1);
		// The frame's 284px, plus the panel's border.
		expect(Math.round(panelBox.width)).toBe(286);
	});

	test("rises to end above the sidebar's bottom in a short window", async ({
		canvas,
	}) => {
		await canvas.page.setViewportSize({ width: 1000, height: 400 });
		await canvas.openPropertyPanel();
		await canvas.placeShapeFromFlyout("icon", "lucideIconUser");

		await canvas.page.click(TRIGGER);

		await expect(canvas.page.locator(PANEL_GRID)).toBeVisible();
		const panelBox = await boxOf(canvas, selectors.propertyPanelDropdown);
		const sidebar = await boxOf(canvas, selectors.propertyPanel);
		expect(panelBox.y + panelBox.height).toBeLessThanOrEqual(
			sidebar.y + sidebar.height,
		);
		expect(panelBox.x + panelBox.width).toBeLessThan(sidebar.x);
	});

	test("opens under the trigger, narrowed to the sidebar, when the canvas has no room", async ({
		canvas,
	}) => {
		await canvas.openPropertyPanel();
		await canvas.placeShapeFromFlyout("icon", "lucideIconUser");
		await canvas.page.setViewportSize({ width: 560, height: 720 });
		const triggerBox = await boxOf(canvas, TRIGGER);

		await canvas.page.click(TRIGGER);

		await expect(canvas.page.locator(PANEL_GRID)).toBeVisible();
		const panelBox = await boxOf(canvas, selectors.propertyPanelDropdown);
		const sidebar = await boxOf(canvas, selectors.propertyPanel);
		expect(panelBox.y).toBeGreaterThan(triggerBox.y + triggerBox.height);
		expect(panelBox.x).toBeGreaterThanOrEqual(sidebar.x);
		expect(panelBox.x + panelBox.width).toBeLessThanOrEqual(
			sidebar.x + sidebar.width,
		);

		// The narrowed grid still writes.
		await canvas.page.fill(PANEL_SEARCH, "lock");
		await canvas.page.click(`${PANEL_GRID} [data-action="set:icon:lock"]`);
		await expect(canvas.page.locator(TRIGGER)).toContainText("lock");
	});

	test("starts every opening from an empty search", async ({ canvas }) => {
		await canvas.openPropertyPanel();
		await canvas.placeShapeFromFlyout("icon", "lucideIconUser");

		await canvas.page.click(TRIGGER);
		await canvas.page.fill(PANEL_SEARCH, "lock");
		await canvas.page.keyboard.press("Escape");
		await expect(
			canvas.page.locator(selectors.propertyPanelDropdown),
		).toHaveCount(0);

		await canvas.page.click(TRIGGER);
		await expect(canvas.page.locator(PANEL_SEARCH)).toHaveValue("");
	});
});
