import { test, expect } from "../../fixtures";

/**
 * ビューポートのパン（右ドラッグ）の振る舞い不変条件。
 *
 * driver-input.spec は「rightDrag で viewBox が変わる」までを守るが、ユーザーが実際に
 * 頼る不変条件——(1) パンしても図形のワールド座標は動かない、(2) ズーム倍率は変わらない、
 * (3) パン後の新しい画面位置で図形を選択できる（screen↔world 変換が正しい）——は
 * 未カバーだった。座標変換の退行は viewBox が変わるだけのテストでは見逃すため、
 * 「パン後に新位置でクリックして選択できる」で守る。
 *
 * 既定ビューポート（zoom=1）では viewBox 幅＝SVG ピクセル幅なので、
 * 画面座標 = ワールド座標 − viewBox.min（スケール 1）で対応づく。
 */

type ViewBox = { minX: number; minY: number; width: number; height: number };

function parseViewBox(raw: string | null): ViewBox {
	if (!raw) {
		throw new Error("viewBox が取得できない");
	}
	const [minX, minY, width, height] = raw.trim().split(/\s+/).map(Number);
	return { minX, minY, width, height };
}

test.describe("ビューポートのパン", () => {
	test("パンしても図形のワールド座標は不動で、新しい画面位置から選択できる", async ({
		canvas,
	}) => {
		// 中心 (500,300) の矩形。
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 420, y: 250 },
			{ x: 580, y: 350 },
		);
		await canvas.deselect();

		const worldBefore = await canvas.objectById(id).getAttribute("transform");
		const vbBefore = parseViewBox(await canvas.getViewBox());

		// 右ドラッグでパンする。
		await canvas.rightDrag({ x: 700, y: 500 }, { x: 850, y: 600 });

		const vbAfter = parseViewBox(await canvas.getViewBox());

		// ズーム倍率は変わらない（viewBox の寸法が保たれる）。
		expect(vbAfter.width).toBeCloseTo(vbBefore.width, 3);
		expect(vbAfter.height).toBeCloseTo(vbBefore.height, 3);
		// パンしたので原点（min）はずれる。
		expect(
			vbAfter.minX !== vbBefore.minX || vbAfter.minY !== vbBefore.minY,
		).toBe(true);
		// 図形のワールド座標（transform）は動かない。
		expect(await canvas.objectById(id).getAttribute("transform")).toBe(
			worldBefore,
		);

		// パン後の新しい画面位置（= ワールド中心 − viewBox.min）でクリックして選択できる。
		// 変換が壊れていればここは空振りし、selectAt がコントロール待ちで失敗する。
		const screen = { x: 500 - vbAfter.minX, y: 300 - vbAfter.minY };
		await canvas.selectAt(screen);
		expect(await canvas.isControlVisible("transform/resize:bottomRight")).toBe(
			true,
		);
	});
});
