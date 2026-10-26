import type { CanvasDriver } from "@jiscribe/canvas-sdk/testing/e2e";
import { test, expect, selectors } from "@jiscribe/canvas-sdk/testing/e2e";

/** The picker's own test hooks; everything else comes from `selectors`. */
const GRID = '[data-testid="aws-icon-picker-grid"]';
const SEARCH = '[data-testid="aws-icon-picker-search"]';

/** The ObjectMenu section id, kept apart from the rail category ("aws"). */
const SECTION = "aws-icon";

const CATEGORY = "aws";
const S3_PRESET = "awsIconServiceAmazonSimpleStorageService";
const LAMBDA = "service/aws-lambda";

test.describe("the AWS icon picker", () => {
	test("narrows the grid to what the term matches", async ({ canvas }) => {
		await canvas.placeShapeFromFlyout(CATEGORY, S3_PRESET);
		await canvas.page.click(selectors.objectMenuToggle(SECTION));

		const cells = canvas.page.locator(`${GRID} [data-action^="set:icon:"]`);
		// count() does not auto-wait, so the panel is waited for first. Counting
		// straight away reads 0 and the comparison below is against an empty grid.
		await expect(canvas.page.locator(GRID)).toBeVisible();
		const tier1Count = await cells.count();
		expect(tier1Count).toBeGreaterThan(20);

		await canvas.page.fill(SEARCH, "lambda");
		await expect(
			canvas.page.locator(`${GRID} [data-action="set:icon:${LAMBDA}"]`),
		).toBeVisible();
		expect(await cells.count()).toBeLessThan(tier1Count);
	});

	test("swaps the shape's icon for the one on the pressed cell", async ({
		canvas,
	}) => {
		const id = await canvas.placeShapeFromFlyout(CATEGORY, S3_PRESET);
		const shape = canvas.objectById(id);
		const before = await shape.locator("path").first().getAttribute("d");

		await canvas.page.click(selectors.objectMenuToggle(SECTION));
		await canvas.page.fill(SEARCH, "lambda");
		const cell = canvas.page.locator(
			`${GRID} [data-action="set:icon:${LAMBDA}"]`,
		);
		await expect(cell).toBeVisible();
		// The cell's glyph draws the same asset the shape does, so seeing it on the
		// shape is what says `icon` became that icon.
		const lambdaArt = await cell.locator("path").first().getAttribute("d");
		expect(lambdaArt).not.toBe(before);

		// Press, wait, release: the way a hand does it. An instant click is a
		// different event, and since the canvas captures the pointer while the
		// press is held, a cell's React onClick fires for the quick one only.
		const box = await cell.boundingBox();
		if (box === null) {
			throw new Error("the lambda cell is not laid out");
		}
		await canvas.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
		await canvas.page.mouse.down();
		await canvas.page.waitForTimeout(150);
		await canvas.page.mouse.up();

		await expect
			.poll(async () => shape.locator("path").first().getAttribute("d"))
			.toBe(lambdaArt);
		// The label was still the one the stencil placed, so it follows the icon.
		await expect
			.poll(async () => (await canvas.drawnTextRuns(id)).map((run) => run.text))
			.toEqual(["Lambda"]);
	});
});

test.describe("the AWS icon picker's filter chips", () => {
	const CATEGORIES = '[data-testid="aws-icon-picker-categories"]';
	const S3 = "service/amazon-simple-storage-service";

	test("pressing a category chip leaves that category alone", async ({
		canvas,
	}) => {
		await canvas.placeShapeFromFlyout(CATEGORY, S3_PRESET);
		await canvas.page.click(selectors.objectMenuToggle(SECTION));
		await expect(canvas.page.locator(GRID)).toBeVisible();
		await expect(
			canvas.page.locator(`${GRID} [data-action="set:icon:${S3}"]`),
		).toBeVisible();

		// A chip writes nothing to the canvas and only moves state inside the
		// panel, so unlike a cell it has to answer an ordinary click.
		await canvas.page.click(`${CATEGORIES} button:has-text("Compute")`);

		await expect(
			canvas.page.locator(`${GRID} [data-action="set:icon:${LAMBDA}"]`),
		).toBeVisible();
		await expect(
			canvas.page.locator(`${GRID} [data-action="set:icon:${S3}"]`),
		).toHaveCount(0);
	});
});

test.describe("the AWS icon picker in the properties sidebar", () => {
	/** The icon section, as the awsIcon definition names it. */
	const PANEL_SECTION = "awsIcon";
	const TRIGGER = `${selectors.propertyPanel} button[aria-label="AWS Icon"]`;
	const PANEL_GRID = `${selectors.propertyPanelDropdown} ${GRID}`;
	const PANEL_SEARCH = `${selectors.propertyPanelDropdown} ${SEARCH}`;

	test("leads the sidebar, ahead of Layout", async ({ canvas }) => {
		await canvas.openPropertyPanel();
		await canvas.placeShapeFromFlyout(CATEGORY, S3_PRESET);

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

	test("swaps the shape's icon for the one on the pressed cell", async ({
		canvas,
	}) => {
		await canvas.openPropertyPanel();
		const id = await canvas.placeShapeFromFlyout(CATEGORY, S3_PRESET);
		const shape = canvas.objectById(id);

		await canvas.page.click(TRIGGER);
		await canvas.page.fill(PANEL_SEARCH, "lambda");
		const cell = canvas.page.locator(
			`${PANEL_GRID} [data-action="set:icon:${LAMBDA}"]`,
		);
		await expect(cell).toBeVisible();
		const lambdaArt = await cell.locator("path").first().getAttribute("d");

		// Held the way a hand presses, as in the ObjectMenu's spec above.
		const box = await cell.boundingBox();
		if (box === null) {
			throw new Error("the lambda cell is not laid out");
		}
		await canvas.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
		await canvas.page.mouse.down();
		await canvas.page.waitForTimeout(150);
		await canvas.page.mouse.up();

		await expect
			.poll(async () => shape.locator("path").first().getAttribute("d"))
			.toBe(lambdaArt);
		await expect(canvas.page.locator(TRIGGER)).toContainText("Lambda");
	});

	/** Screen rectangle of the first match, failing the test when it is not laid out. */
	async function boxOf(canvas: CanvasDriver, selector: string) {
		const box = await canvas.page.locator(selector).first().boundingBox();
		if (box === null) {
			throw new Error(`cannot get the box of ${selector}`);
		}
		return box;
	}

	test("opens left of the sidebar, as wide as the ObjectMenu's picker", async ({
		canvas,
	}) => {
		await canvas.openPropertyPanel();
		await canvas.placeShapeFromFlyout(CATEGORY, S3_PRESET);
		const triggerBox = await boxOf(canvas, TRIGGER);

		await canvas.page.click(TRIGGER);

		await expect(canvas.page.locator(PANEL_GRID)).toBeVisible();
		const panelBox = await boxOf(canvas, selectors.propertyPanelDropdown);
		const sidebar = await boxOf(canvas, selectors.propertyPanel);
		expect(panelBox.x + panelBox.width).toBeLessThan(sidebar.x);
		expect(Math.abs(panelBox.y - triggerBox.y)).toBeLessThanOrEqual(1);
		// The frame's 300px, plus the panel's border.
		expect(Math.round(panelBox.width)).toBe(302);
	});

	test("rises to end above the sidebar's bottom in a short window", async ({
		canvas,
	}) => {
		await canvas.page.setViewportSize({ width: 1000, height: 400 });
		await canvas.openPropertyPanel();
		await canvas.placeShapeFromFlyout(CATEGORY, S3_PRESET);

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
		await canvas.placeShapeFromFlyout(CATEGORY, S3_PRESET);
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
		await canvas.page.fill(PANEL_SEARCH, "lambda");
		await canvas.page.click(`${PANEL_GRID} [data-action="set:icon:${LAMBDA}"]`);
		await expect(canvas.page.locator(TRIGGER)).toContainText("Lambda");
	});

	test("starts every opening from an empty search", async ({ canvas }) => {
		await canvas.openPropertyPanel();
		await canvas.placeShapeFromFlyout(CATEGORY, S3_PRESET);

		await canvas.page.click(TRIGGER);
		await canvas.page.fill(PANEL_SEARCH, "lambda");
		await canvas.page.keyboard.press("Escape");
		await expect(
			canvas.page.locator(selectors.propertyPanelDropdown),
		).toHaveCount(0);

		await canvas.page.click(TRIGGER);
		await expect(canvas.page.locator(PANEL_SEARCH)).toHaveValue("");
	});
});
