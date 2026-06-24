import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * 非等倍 viewBox（ズーム中）で新規図形を描いたとき、対角ドラッグ（画面座標）が
 * 正しい world の位置・寸法へ逆変換されることの検証（screen→world の作成変換）。
 *
 * drag-under-zoom は移動、resize-under-zoom はリサイズ経路を守るが、いずれも
 * 「すでに存在する図形」を動かす。図形の新規作成は、ドラッグ矩形を
 * world = viewBox.min + content × scale で逆変換する別経路で、ここが壊れると
 * 「ズーム中に描くと意図とずれた場所・サイズで生成される」体感バグになる。
 * zoom=1 では content == world で退行が隠れるため、ズームインした状態で確かめる。
 */

const TOLERANCE_PX = 2;

type ViewBox = { minX: number; minY: number; width: number; height: number };

function parseViewBox(raw: string | null): ViewBox {
	if (!raw) {
		throw new Error("viewBox が取得できない");
	}
	const [minX, minY, width, height] = raw.trim().split(/\s+/).map(Number);
	return { minX, minY, width, height };
}

/** transform="matrix(1, 0, 0, 1, e, f)" の e,f（＝図形の中心 world 座標）を取り出す */
function centerOf(transform: string | null): { x: number; y: number } {
	const nums = transform?.match(/-?\d+(?:\.\d+)?/g)?.map(Number);
	if (!nums || nums.length < 6) {
		throw new Error(`transform を解釈できない: ${transform}`);
	}
	return { x: nums[4], y: nums[5] };
}

/** 最大面積の svg（キャンバス本体）の画面幅。getViewBox と同じ選び方。 */
async function svgScreenWidth(canvas: CanvasDriver): Promise<number> {
	return canvas.page.evaluate(() => {
		const svgs = [...document.querySelectorAll("svg")];
		let best = 0;
		let width = 0;
		for (const svg of svgs) {
			const rect = svg.getBoundingClientRect();
			const area = rect.width * rect.height;
			if (area > best) {
				best = area;
				width = rect.width;
			}
		}
		return width;
	});
}

test.describe("ズーム下での図形描画", () => {
	test("ズームイン後に描いた矩形は world の位置・寸法が逆変換に従う", async ({
		canvas,
	}) => {
		// 図形のない状態でビューポートをズームインする（ctrl+wheel は純粋なビューポート操作）。
		const initialViewBox = await canvas.getViewBox();
		await canvas.wheel({ x: 700, y: 450 }, { deltaY: -200, ctrl: true });
		await expect
			.poll(() => canvas.getViewBox(), {
				message: "ズームインで viewBox が変化すること",
			})
			.not.toBe(initialViewBox);

		const vb = parseViewBox(await canvas.getViewBox());
		const scale = vb.width / (await svgScreenWidth(canvas));
		// ズームインしたので画面 1px が表す world 長は短くなる（< 1）。
		// これが満たされないとテストが zoom=1 と区別できず無意味になるため先に固める。
		expect(scale).toBeLessThan(1);

		// コンテンツ座標で対角ドラッグして矩形を描く。
		const from = { x: 400, y: 200 };
		const to = { x: 600, y: 360 };
		const id = await canvas.drawShape("Rectangle", from, to);

		const obj = (await canvas.captureObjects()).find((o) => o.id === id);
		if (!obj) {
			throw new Error(`図形 ${id} が見つからない`);
		}
		const worldCenter = centerOf(obj.transform);
		const rect = canvas.objectById(id);
		const worldWidth = Number(await rect.getAttribute("width"));
		const worldHeight = Number(await rect.getAttribute("height"));

		// world = viewBox.min + content × scale。
		// 退行（割り戻し忘れ）が起きると content がそのまま world になりここで落ちる。
		const expectedCenterX = vb.minX + ((from.x + to.x) / 2) * scale;
		const expectedCenterY = vb.minY + ((from.y + to.y) / 2) * scale;
		const expectedWidth = (to.x - from.x) * scale;
		const expectedHeight = (to.y - from.y) * scale;

		expect(Math.abs(worldCenter.x - expectedCenterX)).toBeLessThanOrEqual(
			TOLERANCE_PX,
		);
		expect(Math.abs(worldCenter.y - expectedCenterY)).toBeLessThanOrEqual(
			TOLERANCE_PX,
		);
		expect(Math.abs(worldWidth - expectedWidth)).toBeLessThanOrEqual(
			TOLERANCE_PX,
		);
		expect(Math.abs(worldHeight - expectedHeight)).toBeLessThanOrEqual(
			TOLERANCE_PX,
		);
	});
});
