import { test, expect } from "../../fixtures";

/**
 * キーボードによるズーム（Ctrl+= / Ctrl+-）の検証。
 *
 * 既存テストは wheel ズーム（CanvasEventHandler 経路）の基点保持を守るが、
 * キーボードショートカット（ZoomInCommand / ZoomOutCommand）は別経路で、
 * e2e では未カバーだった。これらは「ビューポート中心を基点に」viewBox を組み直す
 * （minX/minY を中心から再計算する）ため、壊れると拡大率は変わるのに中心がずれる、
 * あるいは何も起きない、という退行になる。倍率変化（viewBox 幅）と中心保持の
 * 両方で守る。
 */

type ViewBox = { minX: number; minY: number; width: number; height: number };

function parseViewBox(raw: string | null): ViewBox {
	if (!raw) {
		throw new Error("viewBox が取得できない");
	}
	const [minX, minY, width, height] = raw.trim().split(/\s+/).map(Number);
	return { minX, minY, width, height };
}

const centerX = (vb: ViewBox): number => vb.minX + vb.width / 2;
const centerY = (vb: ViewBox): number => vb.minY + vb.height / 2;

test.describe("キーボードズーム", () => {
	test("Ctrl+= でズームインすると viewBox 幅が縮み、中心は保たれる", async ({
		canvas,
	}) => {
		const before = parseViewBox(await canvas.getViewBox());

		await canvas.zoomIn();

		await expect
			.poll(async () => parseViewBox(await canvas.getViewBox()).width, {
				message: "ズームインで viewBox 幅が縮むこと",
			})
			.toBeLessThan(before.width);

		const after = parseViewBox(await canvas.getViewBox());
		// 中心基点なので画面中心の world 座標は動かない。
		expect(centerX(after)).toBeCloseTo(centerX(before), 0);
		expect(centerY(after)).toBeCloseTo(centerY(before), 0);
	});

	test("Ctrl+- でズームアウトすると viewBox 幅が広がり、中心は保たれる", async ({
		canvas,
	}) => {
		const before = parseViewBox(await canvas.getViewBox());

		await canvas.zoomOut();

		await expect
			.poll(async () => parseViewBox(await canvas.getViewBox()).width, {
				message: "ズームアウトで viewBox 幅が広がること",
			})
			.toBeGreaterThan(before.width);

		const after = parseViewBox(await canvas.getViewBox());
		expect(centerX(after)).toBeCloseTo(centerX(before), 0);
		expect(centerY(after)).toBeCloseTo(centerY(before), 0);
	});
});
