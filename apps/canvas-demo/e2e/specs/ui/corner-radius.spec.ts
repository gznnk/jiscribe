import { test, expect } from "../../fixtures";

/**
 * 矩形の角丸（corner radius / rx）の設定と undo。
 *
 * object-menu.spec は色・線種を守るが、border-style セクションの角丸コントロール（property: rx）は
 * 未カバーだった。角丸は数値入力 → rect の rx 属性へ反映される。設定が rx に出ること、
 * undo で元へ戻ることを属性値で守る。
 */
test.describe("矩形の角丸（rx）", () => {
	test("数値入力で角丸を設定すると rx に反映され、undo で戻る", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);
		const rxBefore = (await canvas.objectById(id).getAttribute("rx")) ?? "0";

		// border-style セクションを開いて角丸を数値入力で設定する
		await canvas.openObjectMenu("border-style");
		await canvas.setNumberInput("rx", 24);
		await expect
			.poll(() => canvas.objectById(id).getAttribute("rx"), {
				message: "rx が設定値になること",
			})
			.toBe("24");

		// 入力欄に残ったフォーカスをキャンバスへ戻してから undo する
		await canvas.selectAt({ x: 500, y: 260 });
		await canvas.undo();
		await expect
			.poll(
				async () => (await canvas.objectById(id).getAttribute("rx")) ?? "0",
				{
					message: "undo で角丸が元に戻ること",
				},
			)
			.toBe(rxBefore);
	});
});
