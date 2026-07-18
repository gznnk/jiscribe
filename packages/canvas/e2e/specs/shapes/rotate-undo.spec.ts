import { test, expect } from "../../fixtures";

/**
 * 回転の undo / redo。
 *
 * basic-gestures は「回転ハンドルのドラッグで transform が変わる」までを守るが、回転が
 * 履歴に積まれ undo で元の向きへ戻る／redo で再適用されるかは検証されていなかった。
 * 回転は transform 行列（a,b,c,d 成分）を書き換える操作で、履歴エントリを作り損ねると
 * 「回転だけ巻き戻せない」非対称な退行になる。transform 文字列の往復で守る。
 */
test.describe("回転の undo / redo", () => {
	test("回転は undo で元の向きに戻り、redo で再適用される", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 420, y: 220 },
			{ x: 580, y: 300 },
		);
		// 回転前は無回転（単位行列 + 中心移動）
		const before = await canvas.objectById(id).getAttribute("transform");

		// 回転ハンドルを中心の真上付近へドラッグして回転させる
		await canvas.dragTransformHandle("rotation", { x: 500, y: 120 });
		await expect
			.poll(() => canvas.objectById(id).getAttribute("transform"), {
				message: "回転で transform が変化すること",
			})
			.not.toBe(before);
		const rotated = await canvas.objectById(id).getAttribute("transform");

		// undo で回転前の transform に戻る
		await canvas.undo();
		await expect
			.poll(() => canvas.objectById(id).getAttribute("transform"), {
				message: "undo で回転前の向きへ戻ること",
			})
			.toBe(before);

		// redo で回転後の transform が再適用される
		await canvas.redo();
		await expect
			.poll(() => canvas.objectById(id).getAttribute("transform"), {
				message: "redo で回転が再適用されること",
			})
			.toBe(rotated);
	});
});
