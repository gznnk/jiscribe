import { test, expect } from "../../fixtures";

/**
 * マーキー（範囲選択）の包含ルール。
 *
 * collectIdsInArea は「バウンディングボックスが矩形に**完全に含まれる**」オブジェクトだけを
 * 選択する契約（部分的にかかっただけでは選ばれない）。この境界条件はうっかり交差判定へ
 * 変えてしまう退行が起きやすく、起きると「囲ったつもりのない図形まで動く／消える」という
 * 体験になる。完全包含した図形だけが選択されることを、まとめ移動の結果で守る。
 */
test.describe("マーキーの包含ルール（完全包含のみ選択）", () => {
	test("枠に完全に入った図形だけが選択され、はみ出した図形は選ばれない", async ({
		canvas,
	}) => {
		// A: bbox x300-440 / B: bbox x560-700（ともに y200-320）
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

		// 枠 (260,160)-(600,360): A は完全に内側、B は右端 (700) が枠 (600) からはみ出す。
		await canvas.drag({ x: 260, y: 160 }, { x: 600, y: 360 }, 12);

		// 選択は A のみ。右に 1px ナッジすると A だけ動き、B は不動。
		await canvas.nudge("right");
		await expect
			.poll(() => canvas.objectById(a).getAttribute("transform"), {
				message: "完全包含された A は動くこと",
			})
			.toBe("matrix(1, 0, 0, 1, 371, 260)");
		expect(await canvas.objectById(b).getAttribute("transform")).toBe(
			"matrix(1, 0, 0, 1, 630, 260)",
		);
	});

	test("枠が両方を完全に包含すれば両方とも選択される", async ({ canvas }) => {
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

		// 枠 (260,160)-(740,360): A も B も完全に内側。
		await canvas.drag({ x: 260, y: 160 }, { x: 740, y: 360 }, 12);

		await canvas.nudge("right");
		await expect
			.poll(() => canvas.objectById(a).getAttribute("transform"))
			.toBe("matrix(1, 0, 0, 1, 371, 260)");
		expect(await canvas.objectById(b).getAttribute("transform")).toBe(
			"matrix(1, 0, 0, 1, 631, 260)",
		);
	});
});
