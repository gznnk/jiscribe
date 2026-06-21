import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * グループの複製・削除の整合性。
 *
 * 既存の group.spec は移動と解除を守るが、グループを 1 単位として複製・削除したときに
 * 「メンバー（子孫）まで正しく追従するか」は検証されていなかった。複製は
 * buildSelectedIdsWithDescendants + cloneObjects、削除は DeleteCommand の collectIds 再帰で
 * 子孫を辿る実装で、ここが壊れると「箱だけ複製されて中身が空」「親だけ消えて子が孤立」
 * といったツリー破損になる。観測可能な不変条件（メンバー数・まとめ移動・undo 復元）で守る。
 */

/** A: 中心 (370,260) / B: 中心 (630,260) を描き、マーキーで囲ってグループ化する */
async function drawAndGroupPair(canvas: CanvasDriver) {
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

	await canvas.drag({ x: 260, y: 160 }, { x: 740, y: 360 }, 12);
	await canvas.group();

	return { a, b };
}

test.describe("グループの複製・削除", () => {
	test("グループを複製するとメンバーごと複製され、複製同士もグループ化される", async ({
		canvas,
	}) => {
		const { a, b } = await drawAndGroupPair(canvas);

		// グループ化直後はグループが選択済み。Ctrl+D でメンバーごと複製される。
		await canvas.duplicate();

		// 矩形は 2 → 4 に増える（複製はメンバーまで含む）
		await expect
			.poll(async () => (await canvas.captureObjects()).length, {
				message: "メンバー 2 つが複製されて合計 4 になること",
			})
			.toBe(4);

		// 複製直後は複製グループが選択された状態。複製は元から +20,+20 ずれて配置される
		// （複製グループは A クローン中心 390,280 を含む）。選択グループをドラッグすると、
		// 複製メンバーだけがまとめて +100,+40 動き、元の A・B は動かない。
		await canvas.drag({ x: 390, y: 280 }, { x: 490, y: 320 });

		// 元の 2 つは不動
		expect(await canvas.objectById(a).getAttribute("transform")).toBe(
			"matrix(1, 0, 0, 1, 370, 260)",
		);
		expect(await canvas.objectById(b).getAttribute("transform")).toBe(
			"matrix(1, 0, 0, 1, 630, 260)",
		);

		// 複製された 2 つは「グループとして」一緒に動いている（390,280→490,320 / 650,280→750,320）
		const cloneTransforms = (await canvas.captureObjects())
			.filter((obj) => obj.id !== a && obj.id !== b)
			.map((obj) => obj.transform)
			.sort();
		expect(cloneTransforms).toEqual([
			"matrix(1, 0, 0, 1, 490, 320)",
			"matrix(1, 0, 0, 1, 750, 320)",
		]);
	});

	test("グループを削除すると全メンバーが消え、undo で復元されグループも保たれる", async ({
		canvas,
	}) => {
		const { a, b } = await drawAndGroupPair(canvas);

		// グループ選択中に削除すると、子孫（A・B）まで消える
		await canvas.deleteSelection();
		await expect
			.poll(async () => (await canvas.captureObjects()).length, {
				message: "グループ削除で全メンバーが消えること",
			})
			.toBe(0);

		// 1 回の undo で 2 つとも戻る
		await canvas.undo();
		await expect
			.poll(async () => (await canvas.captureObjects()).length, {
				message: "undo でメンバー 2 つが復元されること",
			})
			.toBe(2);

		// グループ構造も復元されている: A をクリックするとグループ全体が選択され、
		// ドラッグで B も同じだけ動く（+100,+40）。
		await canvas.deselect();
		await canvas.selectAt({ x: 370, y: 260 });
		await canvas.drag({ x: 370, y: 260 }, { x: 470, y: 300 });

		await expect
			.poll(() => canvas.objectById(a).getAttribute("transform"))
			.toBe("matrix(1, 0, 0, 1, 470, 300)");
		expect(await canvas.objectById(b).getAttribute("transform")).toBe(
			"matrix(1, 0, 0, 1, 730, 300)",
		);
	});
});
