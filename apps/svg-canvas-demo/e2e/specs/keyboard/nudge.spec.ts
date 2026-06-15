import { test, expect } from "../../fixtures";

/**
 * 矢印キーによるナッジ移動。通常 1px / Shift 併用 10px。
 * 既定ビューポート（zoom=1）では移動量がそのまま transform の e,f に反映される。
 */
test.describe("キーボード: ナッジ移動", () => {
	test("矢印キーで 1px 移動する", async ({ canvas }) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);
		// 中心は (500, 260)
		expect(await canvas.objectById(id).getAttribute("transform")).toBe(
			"matrix(1, 0, 0, 1, 500, 260)",
		);

		await canvas.nudge("right");
		await expect
			.poll(() => canvas.objectById(id).getAttribute("transform"))
			.toBe("matrix(1, 0, 0, 1, 501, 260)");

		await canvas.nudge("down");
		await expect
			.poll(() => canvas.objectById(id).getAttribute("transform"))
			.toBe("matrix(1, 0, 0, 1, 501, 261)");
	});

	test("Shift+矢印キーで 10px 移動する", async ({ canvas }) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);

		await canvas.nudge("left", { large: true });
		await expect
			.poll(() => canvas.objectById(id).getAttribute("transform"))
			.toBe("matrix(1, 0, 0, 1, 490, 260)");

		await canvas.nudge("up", { large: true });
		await expect
			.poll(() => canvas.objectById(id).getAttribute("transform"))
			.toBe("matrix(1, 0, 0, 1, 490, 250)");
	});
});
