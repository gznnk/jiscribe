import { test, expect } from "../../fixtures";

/**
 * 複数選択したオブジェクトのナッジ移動。
 *
 * 既存の nudge.spec は単一図形の 1px / 10px 移動を守るが、複数選択した状態で矢印キーを
 * 押したとき「全員が同じだけ動くか」は検証されていなかった。ナッジは selectedIds 全体に
 * 同じデルタを加える実装で、単一選択しか動かさない・選択の一部しか動かない退行は
 * リファクタで起きやすい。両図形の transform 差分で守る。
 */
test.describe("複数選択のナッジ移動", () => {
	test("複数選択した図形は矢印キーでまとめて 1px 動く", async ({ canvas }) => {
		// A: 中心 (370,260) / B: 中心 (630,260)
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

		// 全選択して右に 1px ナッジ → 両方が +1,0 動く
		await canvas.selectAll();
		await canvas.nudge("right");

		await expect
			.poll(() => canvas.objectById(a).getAttribute("transform"), {
				message: "A が +1px 動くこと",
			})
			.toBe("matrix(1, 0, 0, 1, 371, 260)");
		expect(await canvas.objectById(b).getAttribute("transform")).toBe(
			"matrix(1, 0, 0, 1, 631, 260)",
		);
	});

	test("複数選択した図形は Shift+矢印でまとめて 10px 動く", async ({
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

		// 全選択して下に Shift+10px ナッジ → 両方が 0,+10 動く
		await canvas.selectAll();
		await canvas.nudge("down", { large: true });

		await expect
			.poll(() => canvas.objectById(a).getAttribute("transform"), {
				message: "A が +10px 動くこと",
			})
			.toBe("matrix(1, 0, 0, 1, 370, 270)");
		expect(await canvas.objectById(b).getAttribute("transform")).toBe(
			"matrix(1, 0, 0, 1, 630, 270)",
		);
	});
});
