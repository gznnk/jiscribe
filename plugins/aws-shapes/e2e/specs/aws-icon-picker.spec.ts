import { test, expect, selectors } from "@jiscribe/canvas-sdk/testing/e2e";

/** The picker's own test hooks; everything else comes from `selectors`. */
const GRID = '[data-testid="aws-icon-picker-grid"]';
const SEARCH = '[data-testid="aws-icon-picker-search"]';

/** The ObjectMenu section id, kept apart from the toolbar category ("aws"). */
const SECTION = "aws-icon";

const CATEGORY = "aws";
const S3_PRESET = "awsIconServiceAmazonSimpleStorageService";
const LAMBDA = "service/aws-lambda";

test.describe("the AWS icon picker", () => {
	test("narrows the grid to what the term matches", async ({ canvas }) => {
		await canvas.placeShapeFromFlyout(CATEGORY, S3_PRESET);
		await canvas.page.click(selectors.objectMenuToggle(SECTION));

		const cells = canvas.page.locator(`${GRID} [data-part^="set:icon:"]`);
		// count() does not auto-wait, so the panel is waited for first. Counting
		// straight away reads 0 and the comparison below is against an empty grid.
		await expect(canvas.page.locator(GRID)).toBeVisible();
		const tier1Count = await cells.count();
		expect(tier1Count).toBeGreaterThan(20);

		await canvas.page.fill(SEARCH, "lambda");
		await expect(
			canvas.page.locator(`${GRID} [data-part="set:icon:${LAMBDA}"]`),
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
			`${GRID} [data-part="set:icon:${LAMBDA}"]`,
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
			canvas.page.locator(`${GRID} [data-part="set:icon:${S3}"]`),
		).toBeVisible();

		// A chip writes nothing to the canvas and only moves state inside the
		// panel, so unlike a cell it has to answer an ordinary click.
		await canvas.page.click(`${CATEGORIES} button:has-text("Compute")`);

		await expect(
			canvas.page.locator(`${GRID} [data-part="set:icon:${LAMBDA}"]`),
		).toBeVisible();
		await expect(
			canvas.page.locator(`${GRID} [data-part="set:icon:${S3}"]`),
		).toHaveCount(0);
	});
});
