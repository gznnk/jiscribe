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

	test("同じ選択への連続ナッジは 1 回の undo でまとめて戻り、redo で再適用される", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);
		// 中心は (500, 260)
		expect(await canvas.objectById(id).getAttribute("transform")).toBe(
			"matrix(1, 0, 0, 1, 500, 260)",
		);

		// 選択を変えずに右へ 5 回ナッジ（合計 +5px）。historyCoalesce で 1 エントリにまとまる。
		for (let i = 0; i < 5; i++) {
			await canvas.nudge("right");
		}
		await expect
			.poll(() => canvas.objectById(id).getAttribute("transform"), {
				message: "5 回ナッジで +5px 動くこと",
			})
			.toBe("matrix(1, 0, 0, 1, 505, 260)");

		// 1 回の undo で 5px 分すべて戻る（1px ずつではない＝コアレス済み）。
		await canvas.undo();
		await expect
			.poll(() => canvas.objectById(id).getAttribute("transform"), {
				message: "1 回の undo で連続ナッジがまとめて元へ戻ること",
			})
			.toBe("matrix(1, 0, 0, 1, 500, 260)");

		// 1 回の redo で +5px がまとめて再適用される。
		await canvas.redo();
		await expect
			.poll(() => canvas.objectById(id).getAttribute("transform"), {
				message: "1 回の redo で連続ナッジがまとめて再適用されること",
			})
			.toBe("matrix(1, 0, 0, 1, 505, 260)");
	});
});
