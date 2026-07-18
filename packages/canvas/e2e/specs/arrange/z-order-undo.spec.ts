import { test, expect } from "../../fixtures";

/**
 * 重なり順（z-order）変更の undo / redo。
 *
 * z-order.spec は bringToFront などの結果（DOM 順）を守るが、その操作が履歴に正しく
 * 積まれ undo で元の重なり順へ戻る／redo で再適用されるかは検証されていなかった。
 * arrange 系コマンドが履歴エントリを作り損ねると「重なり順だけ undo できない」という
 * 非対称な退行になる。DOM 順インデックスの往復で守る。
 */
test.describe("重なり順の undo / redo", () => {
	test("bringToFront は undo で元の順序に戻り、redo で再適用される", async ({
		canvas,
	}) => {
		// A を先、B を後に描く → B が前面（DOM 末尾）。重ならない位置に置く。
		const a = await canvas.drawShape(
			"Rectangle",
			{ x: 300, y: 200 },
			{ x: 440, y: 320 },
		);
		await canvas.deselect();
		await canvas.drawShape("Rectangle", { x: 520, y: 200 }, { x: 660, y: 320 });
		await canvas.deselect();

		// 初期は A が背面（index 0）
		expect(await canvas.objectIndex(a)).toBe(0);

		// A を最前面へ → A が index 1（DOM 末尾）になる
		await canvas.selectAt({ x: 370, y: 260 });
		await canvas.arrange("bringToFront");
		await expect
			.poll(() => canvas.objectIndex(a), {
				message: "bringToFront で A が最前面になること",
			})
			.toBe(1);

		// undo で元の重なり順（A が背面）に戻る
		await canvas.undo();
		await expect
			.poll(() => canvas.objectIndex(a), {
				message: "undo で重なり順が戻ること",
			})
			.toBe(0);

		// redo で再び最前面へ
		await canvas.redo();
		await expect
			.poll(() => canvas.objectIndex(a), {
				message: "redo で重なり順変更が再適用されること",
			})
			.toBe(1);
	});
});
