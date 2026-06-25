import { test, expect } from "../../fixtures";

/**
 * パン（右ドラッグ）の「移動量」を精密に守る。
 *
 * pan.spec は「viewBox の min がずれる／ワールド座標は不動」までで、ずれ量は未検証だった。
 * zoom=1 では画面ドラッグ量＝world 移動量なので、viewBox の原点(min)はドラッグ量ぶん
 * ちょうど動く（コンテンツがカーソルに追従する向き = 右下ドラッグで min は減る）。
 * パン量に係数が紛れ込む／ズーム割り戻しを誤る退行は「ずれた」検証では捕まらない。
 *
 * 併せて zoom=1 不変（viewBox 幅＝SVG ピクセル幅）も保つ。
 */

type ViewBox = { minX: number; minY: number; width: number; height: number };

function parseViewBox(raw: string | null): ViewBox {
	if (!raw) {
		throw new Error("viewBox が取得できない");
	}
	const [minX, minY, width, height] = raw.trim().split(/\s+/).map(Number);
	return { minX, minY, width, height };
}

const TOLERANCE_PX = 2;
/** 右ドラッグの画面移動量 */
const DRAG_FROM = { x: 700, y: 500 };
const DRAG_TO = { x: 850, y: 600 };
const DELTA = { x: DRAG_TO.x - DRAG_FROM.x, y: DRAG_TO.y - DRAG_FROM.y }; // (150,100)

test.describe("パンの移動量", () => {
	test("zoom=1 では viewBox 原点がドラッグ量ぶんちょうど動く（倍率は不変）", async ({
		canvas,
	}) => {
		// 図形を 1 つ置いて選択解除（パンに無関係なことの確認用）。
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 420, y: 250 },
			{ x: 580, y: 350 },
		);
		await canvas.deselect();
		const worldBefore = await canvas.objectById(id).getAttribute("transform");

		const before = parseViewBox(await canvas.getViewBox());

		await canvas.rightDrag(DRAG_FROM, DRAG_TO);

		await expect
			.poll(async () => parseViewBox(await canvas.getViewBox()).minX, {
				message: "パンで viewBox.minX が動くこと",
			})
			.not.toBe(before.minX);

		const after = parseViewBox(await canvas.getViewBox());

		// 原点はドラッグ量ぶんちょうど動く（コンテンツ追従 = 右下ドラッグで min は減る）。
		expect(Math.abs(after.minX - before.minX - -DELTA.x)).toBeLessThanOrEqual(
			TOLERANCE_PX,
		);
		expect(Math.abs(after.minY - before.minY - -DELTA.y)).toBeLessThanOrEqual(
			TOLERANCE_PX,
		);
		// ズーム倍率（viewBox 寸法）は不変。
		expect(after.width).toBeCloseTo(before.width, 3);
		expect(after.height).toBeCloseTo(before.height, 3);
		// 図形のワールド座標は動かない。
		expect(await canvas.objectById(id).getAttribute("transform")).toBe(
			worldBefore,
		);
	});
});
