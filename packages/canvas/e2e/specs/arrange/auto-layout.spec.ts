import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * The automatic layout commands from the two places a person reaches them: the
 * context menu and the properties sidebar.
 *
 * A right click on a shape selects that shape alone, which leaves one object to
 * place and the command disabled (selectContextMenuTarget), so the menu is opened
 * on the background with nothing selected: every part of the drawing joined by a
 * line is then arranged.
 */

/** Empty canvas, clear of the three shapes. */
const BACKGROUND = { x: 300, y: 600 };

/** Three rectangles in a row, joined left → middle → right; returns their ids. */
async function drawJoinedRow(canvas: CanvasDriver): Promise<string[]> {
	const ids: string[] = [];
	for (const left of [200, 450, 700]) {
		ids.push(
			await canvas.drawShape(
				"Rectangle",
				{ x: left, y: 200 },
				{ x: left + 120, y: 260 },
			),
		);
		await canvas.deselect();
	}
	for (const [sourceCenterX, targetCenterX] of [
		[260, 510],
		[510, 760],
	]) {
		await canvas.selectAt({ x: sourceCenterX, y: 230 });
		await canvas.createConnector("rightCenter", { x: targetCenterX, y: 230 });
		await canvas.deselect();
	}
	return ids;
}

async function topOf(canvas: CanvasDriver, id: string): Promise<number> {
	const box = await canvas.objectById(id).boundingBox();
	if (!box) {
		throw new Error(`cannot get the position of the shape ${id}`);
	}
	return box.y;
}

test.describe("automatic layout", () => {
	test("stacks a joined row in flow order from the context menu", async ({
		canvas,
	}) => {
		const [left, middle, right] = await drawJoinedRow(canvas);

		await canvas.openContextMenu(BACKGROUND);
		await canvas.clickContextMenuCommand("layoutTopToBottom");
		await expect.poll(() => canvas.contextMenuVisible()).toBe(false);

		await expect
			.poll(
				async () => (await topOf(canvas, middle)) - (await topOf(canvas, left)),
			)
			.toBeGreaterThan(0);
		expect(await topOf(canvas, right)).toBeGreaterThan(
			await topOf(canvas, middle),
		);
	});

	test("offers both directions in the Canvas section and, for a selection, in the Arrange section", async ({
		canvas,
	}) => {
		await drawJoinedRow(canvas);
		const buttons = ["layoutTopToBottom", "layoutLeftToRight"].map(
			(commandId) =>
				canvas.page.locator(selectors.propertyPanelCommand(commandId)),
		);

		// Nothing selected: the panel holds the Canvas section alone.
		await canvas.openPropertyPanel();
		await expect(
			canvas.page.locator(selectors.propertyPanelSection("canvas")),
		).toBeVisible();
		for (const button of buttons) {
			await expect(button).toBeEnabled();
		}
		// Each button draws its arrow as an icon of one shared size, clear of its text,
		// rather than carrying an arrow character the font sizes per glyph.
		const looks = await Promise.all(
			buttons.map((button) =>
				button.evaluate((element) => {
					const icons = element.querySelectorAll("svg");
					const iconBox = icons[0]?.getBoundingClientRect();
					const textBox = element
						.querySelector("span > span")
						?.getBoundingClientRect();
					return {
						iconCount: icons.length,
						iconSize: iconBox ? [iconBox.width, iconBox.height] : null,
						gap: iconBox && textBox ? textBox.left - iconBox.right : null,
						text: element.textContent ?? "",
					};
				}),
			),
		);
		for (const look of looks) {
			expect(look.iconCount).toBe(1);
			expect(look.gap).toBeGreaterThan(0);
			expect(look.text).not.toMatch(/[↓→←↑]/u);
		}
		expect(looks[0].iconSize).toEqual(looks[1].iconSize);

		await canvas.selectAll();
		await expect(
			canvas.page.locator(selectors.propertyPanelSection("arrange")),
		).toBeVisible();
		await expect(
			canvas.page.locator(selectors.propertyPanelSection("canvas")),
		).toHaveCount(0);
		for (const button of buttons) {
			await expect(button).toBeEnabled();
		}
	});
});
