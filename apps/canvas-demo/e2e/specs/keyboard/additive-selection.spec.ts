import { test, expect } from "../../fixtures";

/**
 * Ctrl/Meta+クリックによる追加選択（additive selection）の検証。
 *
 * 複数選択は「複数図形をグループ化せずにまとめて扱う」中核機能だが、既存テストは
 * マーキー選択（basic-gestures）とグループ化（group）に限られ、Ctrl+クリックでの
 * 選択追加や Ctrl+A 全選択からのまとめ移動はカバーされていなかった。選択モデル
 * （determineSelection の additive 分岐 / multiSelectGroup 経由のまとめ移動）は
 * リファクタで壊れやすいため、「まとめて動く」という観測可能な振る舞いで守る。
 *
 * 追加選択は Ctrl/Meta+クリック（Shift は移動時の軸固定なので使わない）。
 * 追加選択は座標変換を通す canvas.ctrlClickAt を使う。
 */

test.describe("複数選択（Ctrl+クリック / Ctrl+A）", () => {
	test("Ctrl+クリックで選択に追加し、まとめて移動できる", async ({
		canvas,
	}) => {
		// A: 中心 (370,260)、B: 中心 (630,260)
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

		// A を選択 → Ctrl+クリックで B を追加
		await canvas.selectAt({ x: 370, y: 260 });
		await canvas.ctrlClickAt({ x: 630, y: 260 });

		// A をドラッグ（+50,+40）すると、追加選択された B も同じだけ動く
		await canvas.drag({ x: 370, y: 260 }, { x: 420, y: 300 });

		await expect
			.poll(() => canvas.objectById(a).getAttribute("transform"), {
				message: "A が移動すること",
			})
			.toBe("matrix(1, 0, 0, 1, 420, 300)");
		expect(await canvas.objectById(b).getAttribute("transform")).toBe(
			"matrix(1, 0, 0, 1, 680, 300)",
		);
	});

	test("Ctrl+A で全選択し、まとめて移動できる", async ({ canvas }) => {
		// A: 中心 (370,260)、B: 中心 (630,260)
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

		// 全選択してから A をドラッグ（+50,+40）すると、全図形が同じだけ動く
		await canvas.selectAll();
		await canvas.drag({ x: 370, y: 260 }, { x: 420, y: 300 });

		await expect
			.poll(() => canvas.objectById(a).getAttribute("transform"), {
				message: "A が移動すること",
			})
			.toBe("matrix(1, 0, 0, 1, 420, 300)");
		expect(await canvas.objectById(b).getAttribute("transform")).toBe(
			"matrix(1, 0, 0, 1, 680, 300)",
		);
	});

	test("Ctrl+クリックは選択済みの図形を選択から外す（トグルオフ）", async ({
		canvas,
	}) => {
		// 横並びの 3 矩形。A 中心 (300,260) / B 中心 (550,260) / C 中心 (800,260)。
		const a = await canvas.drawShape(
			"Rectangle",
			{ x: 230, y: 200 },
			{ x: 370, y: 320 },
		);
		await canvas.deselect();
		const b = await canvas.drawShape(
			"Rectangle",
			{ x: 480, y: 200 },
			{ x: 620, y: 320 },
		);
		await canvas.deselect();
		const c = await canvas.drawShape(
			"Rectangle",
			{ x: 730, y: 200 },
			{ x: 870, y: 320 },
		);
		await canvas.deselect();

		// 全選択（A・B・C）してから、Ctrl+クリックで B を選択から外す。
		await canvas.selectAll();
		await canvas.ctrlClickAt({ x: 550, y: 260 });

		// 残った選択（A・C）を A からドラッグ（+100,+50）。A・C は動くが、外した B は動かない。
		await canvas.drag({ x: 300, y: 260 }, { x: 400, y: 310 });

		await expect
			.poll(() => canvas.objectById(a).getAttribute("transform"), {
				message: "A が移動すること",
			})
			.toBe("matrix(1, 0, 0, 1, 400, 310)");
		expect(await canvas.objectById(c).getAttribute("transform")).toBe(
			"matrix(1, 0, 0, 1, 900, 310)",
		);
		// トグルオフした B は選択から外れているので動かない。
		expect(await canvas.objectById(b).getAttribute("transform")).toBe(
			"matrix(1, 0, 0, 1, 550, 260)",
		);
	});
});
