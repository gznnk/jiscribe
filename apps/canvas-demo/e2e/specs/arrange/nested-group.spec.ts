import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * 入れ子グループ（グループの中のグループ）。
 *
 * group.spec は単層グループのまとめ移動／解除を守るが、グループをさらにグループ化した
 * 入れ子は未カバーだった。入れ子では (1) GroupCommand が既存グループを子に持つ新グループを
 * 作れること、(2) 末端の子をクリックすると最上位（ルート）グループが選択されること
 * （determineSelection の ancestors[0] 経路）、(3) ルートを動かすと孫まで一括で動くこと、
 * (4) 解除（Ctrl+Shift+G）はルート 1 階層だけを剥がし内側のグループは保つこと、が要点。
 * 単体テスト（autoSelectParentGroups / determineSelection）はあるが、UI 通しの非回帰がなかった。
 */

/**
 * A・B を group1 にまとめ、さらに group1・C を group2 にまとめた入れ子グループを作る。
 * A 中心 (280,210) / B 中心 (480,210) / C 中心 (680,210)。作成後は選択解除済み。
 */
async function buildNestedGroup(
	canvas: CanvasDriver,
): Promise<{ a: string; b: string; c: string }> {
	const a = await canvas.drawShape(
		"Rectangle",
		{ x: 220, y: 160 },
		{ x: 340, y: 260 },
	);
	await canvas.deselect();
	const b = await canvas.drawShape(
		"Rectangle",
		{ x: 420, y: 160 },
		{ x: 540, y: 260 },
	);
	await canvas.deselect();

	// A・B をマーキーで選択してグループ化（group1）。
	await canvas.drag({ x: 180, y: 120 }, { x: 580, y: 300 }, 12);
	await canvas.group();
	await canvas.deselect();

	const c = await canvas.drawShape(
		"Rectangle",
		{ x: 620, y: 160 },
		{ x: 740, y: 260 },
	);
	await canvas.deselect();

	// A・B・C を囲むマーキー → group1（A,B 畳み込み）+ C を選択し、入れ子化（group2 = { group1, C }）。
	await canvas.drag({ x: 180, y: 120 }, { x: 780, y: 300 }, 12);
	await canvas.group();
	await canvas.deselect();

	return { a, b, c };
}

test.describe("入れ子グループ", () => {
	test("孫をクリックするとルートグループが選択され、ドラッグで全メンバーが一括移動する", async ({
		canvas,
	}) => {
		const { a, b, c } = await buildNestedGroup(canvas);

		// 孫（A）をクリック → ルート group2 が選択される。
		await canvas.selectAt({ x: 280, y: 210 });
		// ルートをドラッグ（+100,+50）。入れ子の全メンバー（A,B,C）が同じ量動くはず。
		await canvas.drag({ x: 280, y: 210 }, { x: 380, y: 260 });

		await expect
			.poll(() => canvas.objectById(a).getAttribute("transform"), {
				message: "孫 A がルート移動に追従すること",
			})
			.toBe("matrix(1, 0, 0, 1, 380, 260)");
		expect(await canvas.objectById(b).getAttribute("transform")).toBe(
			"matrix(1, 0, 0, 1, 580, 260)",
		);
		expect(await canvas.objectById(c).getAttribute("transform")).toBe(
			"matrix(1, 0, 0, 1, 780, 260)",
		);
	});

	test("解除はルート 1 階層だけを剥がし、内側のグループ（A・B）は残る", async ({
		canvas,
	}) => {
		const { a, b, c } = await buildNestedGroup(canvas);

		// ルート group2 を選択して解除（Ctrl+Shift+G）。group2 が消え、group1 と C が最上位になる。
		await canvas.selectAt({ x: 280, y: 210 });
		await canvas.ungroup();
		await canvas.deselect();

		// A をクリック → 内側の group1 が選択される（group2 が剥がれても group1 は健在）。
		// group1 をドラッグ（+100,+50）すると A・B は一緒に動くが、C は動かない。
		await canvas.selectAt({ x: 280, y: 210 });
		await canvas.drag({ x: 280, y: 210 }, { x: 380, y: 260 });

		await expect
			.poll(() => canvas.objectById(a).getAttribute("transform"), {
				message: "A が group1 の移動に追従すること",
			})
			.toBe("matrix(1, 0, 0, 1, 380, 260)");
		// B も一緒に動く（group1 が保たれている証拠）。
		expect(await canvas.objectById(b).getAttribute("transform")).toBe(
			"matrix(1, 0, 0, 1, 580, 260)",
		);
		// C は group1 の外なので不動。
		expect(await canvas.objectById(c).getAttribute("transform")).toBe(
			"matrix(1, 0, 0, 1, 680, 210)",
		);
	});
});
