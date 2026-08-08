import { test, expect } from "../../fixtures";

/**
 * Grouping (Ctrl+G) / ungrouping (Ctrl+Shift+G).
 * After grouping, clicking a member selects the whole group and they move together
 * (autoSelectParentGroups). After ungrouping they move individually.
 */
test.describe("group", () => {
	test("moves the members together once they are grouped", async ({
		canvas,
	}) => {
		const a = await canvas.drawShape(
			"Rectangle",
			{ x: 300, y: 200 },
			{ x: 440, y: 320 },
		);
		await canvas.deselect();
		const b = await canvas.drawShape(
			"Rectangle",
			{ x: 560, y: 200 },
			{ x: 700, y: 320 },
		);
		await canvas.deselect();

		// Marquee-select both and group them
		await canvas.drag({ x: 260, y: 160 }, { x: 740, y: 360 }, 12);
		await canvas.group();
		await canvas.deselect();

		// Clicking A selects the whole group, so the drag moves both
		await canvas.selectAt({ x: 370, y: 260 });
		await canvas.drag({ x: 370, y: 260 }, { x: 470, y: 300 });

		// Both move by the same amount (+100, +40)
		await expect
			.poll(() => canvas.objectById(a).getAttribute("transform"))
			.toBe("matrix(1, 0, 0, 1, 470, 300)");
		expect(await canvas.objectById(b).getAttribute("transform")).toBe(
			"matrix(1, 0, 0, 1, 730, 300)",
		);
	});

	test("moves the members individually after ungrouping", async ({
		canvas,
	}) => {
		const a = await canvas.drawShape(
			"Rectangle",
			{ x: 300, y: 200 },
			{ x: 440, y: 320 },
		);
		await canvas.deselect();
		const b = await canvas.drawShape(
			"Rectangle",
			{ x: 560, y: 200 },
			{ x: 700, y: 320 },
		);
		await canvas.deselect();

		await canvas.drag({ x: 260, y: 160 }, { x: 740, y: 360 }, 12);
		await canvas.group();
		await canvas.ungroup();
		await canvas.deselect();

		// Clicking and moving A alone leaves B put
		await canvas.selectAt({ x: 370, y: 260 });
		await canvas.drag({ x: 370, y: 260 }, { x: 470, y: 260 });

		await expect
			.poll(() => canvas.objectById(a).getAttribute("transform"))
			.toBe("matrix(1, 0, 0, 1, 470, 260)");
		expect(await canvas.objectById(b).getAttribute("transform")).toBe(
			"matrix(1, 0, 0, 1, 630, 260)",
		);
	});
});
