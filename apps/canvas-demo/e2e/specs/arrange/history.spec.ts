import { test, expect } from "../../fixtures";

/**
 * Undo / Redo の履歴整合性。
 *
 * 既存の undo テストは削除（selection）・リサイズ（driver-transform）・コネクター作成
 * （connector-undo-redo）に限られていた。ここでは描画・移動・色変更という代表的な
 * 編集操作それぞれが1回の undo で巻き戻り redo で再適用されること、さらに複数操作の
 * 履歴が正しい順序（後入れ先出し）で巻き戻る／やり直されることを守る。
 *
 * 履歴スタックの順序やエントリ粒度はリファクタで壊れやすく、壊れても即クラッシュ
 * しないため、不変条件（図形数・transform・色）で検証する。
 */
test.describe("Undo / Redo の履歴整合性", () => {
	test("描画は undo で消え、redo で同じ ID・位置が戻る", async ({ canvas }) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);
		const transform = await canvas.objectById(id).getAttribute("transform");

		await canvas.undo();
		await expect
			.poll(async () => (await canvas.captureObjects()).length, {
				message: "undo で描画した図形が消えること",
			})
			.toBe(0);

		await canvas.redo();
		await expect
			.poll(async () => (await canvas.captureObjects()).length, {
				message: "redo で図形が戻ること",
			})
			.toBe(1);
		// 同じ id・位置で復元される
		expect(await canvas.objectById(id).getAttribute("transform")).toBe(
			transform,
		);
	});

	test("移動は undo で元の位置に戻り、redo で再適用される", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);
		// 描画直後は選択済み。中心 (500,260) から (560,300) へドラッグ（+60,+40）
		await canvas.drag({ x: 500, y: 260 }, { x: 560, y: 300 });
		await expect
			.poll(() => canvas.objectById(id).getAttribute("transform"))
			.toBe("matrix(1, 0, 0, 1, 560, 300)");

		await canvas.undo();
		await expect
			.poll(() => canvas.objectById(id).getAttribute("transform"), {
				message: "undo で元の位置に戻ること",
			})
			.toBe("matrix(1, 0, 0, 1, 500, 260)");

		await canvas.redo();
		await expect
			.poll(() => canvas.objectById(id).getAttribute("transform"), {
				message: "redo で移動が再適用されること",
			})
			.toBe("matrix(1, 0, 0, 1, 560, 300)");
	});

	test("色変更は undo で元の色に戻り、redo で再適用される", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);
		const originalFill = await canvas.computedColor(id, "fill");
		const newFill = await canvas.normalizeColor("#6366f1");
		expect(originalFill).not.toBe(newFill);

		await canvas.setColor("bg-color", "#6366f1");
		await expect.poll(() => canvas.computedColor(id, "fill")).toBe(newFill);

		await canvas.undo();
		await expect
			.poll(() => canvas.computedColor(id, "fill"), {
				message: "undo で元の色に戻ること",
			})
			.toBe(originalFill);

		await canvas.redo();
		await expect
			.poll(() => canvas.computedColor(id, "fill"), {
				message: "redo で色変更が再適用されること",
			})
			.toBe(newFill);
	});

	test("複数操作は後入れ先出しで巻き戻り、redo で順に復元される", async ({
		canvas,
	}) => {
		// 操作1: A を描画
		const a = await canvas.drawShape(
			"Rectangle",
			{ x: 300, y: 200 },
			{ x: 440, y: 320 },
		);
		await canvas.deselect();
		// 操作2: B を描画
		const b = await canvas.drawShape(
			"Rectangle",
			{ x: 560, y: 200 },
			{ x: 700, y: 320 },
		);
		// 操作3: B を移動（中心 630,260 → 700,300、+70,+40）
		await canvas.drag({ x: 630, y: 260 }, { x: 700, y: 300 });
		await expect
			.poll(() => canvas.objectById(b).getAttribute("transform"))
			.toBe("matrix(1, 0, 0, 1, 700, 300)");

		// undo1: B の移動だけ巻き戻る（図形は2つのまま、B が元位置へ）
		await canvas.undo();
		await expect
			.poll(() => canvas.objectById(b).getAttribute("transform"))
			.toBe("matrix(1, 0, 0, 1, 630, 260)");
		expect(await canvas.captureObjects()).toHaveLength(2);

		// undo2: B の描画が巻き戻る（A だけ残る）
		await canvas.undo();
		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(1);
		expect(await canvas.objectById(a).getAttribute("transform")).toBe(
			"matrix(1, 0, 0, 1, 370, 260)",
		);

		// undo3: A の描画が巻き戻る（空になる）
		await canvas.undo();
		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(0);

		// redo で同じ順に復元される
		await canvas.redo();
		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(1);
		await canvas.redo();
		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(2);
		await canvas.redo();
		await expect
			.poll(() => canvas.objectById(b).getAttribute("transform"), {
				message: "最後の redo で B の移動まで復元されること",
			})
			.toBe("matrix(1, 0, 0, 1, 700, 300)");
	});
});
