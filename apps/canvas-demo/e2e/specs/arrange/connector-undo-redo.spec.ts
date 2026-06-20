import { test, expect } from "../../fixtures";

/**
 * コネクター作成の undo / redo が、履歴 + canvasToState 往復（コネクターも rootIds の一員）を
 * 通して正しく消えて戻ることを実操作で検証する。
 */
test.describe("コネクターの undo / redo", () => {
	test("コネクター作成は undo で消え、redo で同じ ID が戻る", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 150 }, { x: 600, y: 250 });
		await canvas.deselect();
		await canvas.drawShape("Rectangle", { x: 400, y: 450 }, { x: 600, y: 550 });
		await canvas.deselect();

		await canvas.selectAt({ x: 500, y: 200 });
		const connectorId = await canvas.createConnector("bottomCenter", {
			x: 500,
			y: 450,
		});
		await canvas.deselect();

		// 作成直後: コネクターが存在（z-order 上にいる）
		await expect
			.poll(() => canvas.zOrderIndex(connectorId))
			.toBeGreaterThanOrEqual(0);

		// undo → コネクターが消える
		await canvas.undo();
		await expect.poll(() => canvas.zOrderIndex(connectorId)).toBe(-1);

		// redo → 同じ ID で戻る
		await canvas.redo();
		await expect
			.poll(() => canvas.zOrderIndex(connectorId))
			.toBeGreaterThanOrEqual(0);
	});
});
