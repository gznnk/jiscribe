import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * 非等倍 viewBox（ズーム中）での図形ドラッグが、画面移動量をスケールで割り戻して
 * 正しいワールド移動量にすることの検証（screen→world のドラッグ変換）。
 *
 * 既存テストはビューポート変換の周辺をそれぞれ別の不変条件で守っているが、
 * 「ズームした状態で図形をドラッグして動かす」経路は隙間だった:
 *   - zoom-cursor-anchor.spec … ズームの基点保持（カーソル直下が動かない）。図形は動かさない
 *   - pan.spec                … パン後の選択（zoom=1 での screen↔world）。ズームしない
 *   - draw.spec「図形はドラッグで移動できる」… 移動はするが zoom=1 のみ
 * ポインタ移動量をズーム倍率で割り戻す計算が壊れると、「ズーム中はドラッグで図形が
 * 動きすぎる／動かなすぎる」体感バグになるが画面自体は壊れないため気づきにくい。
 * zoom=1 では screenΔ == worldΔ で退行が隠れるため、ズームインした状態で確かめる。
 */

const TOLERANCE_PX = 2;

/** transform="matrix(1, 0, 0, 1, e, f)" の e,f（＝図形の中心ワールド座標）を取り出す */
function centerOf(transform: string | null): { x: number; y: number } {
	const nums = transform?.match(/-?\d+(?:\.\d+)?/g)?.map(Number);
	if (!nums || nums.length < 6) {
		throw new Error(`transform を解釈できない: ${transform}`);
	}
	return { x: nums[4], y: nums[5] };
}

/** 図形の中心ワールド座標（captureObjects の transform 由来） */
async function worldCenter(
	canvas: CanvasDriver,
	id: string,
): Promise<{ x: number; y: number }> {
	const obj = (await canvas.captureObjects()).find((o) => o.id === id);
	if (!obj) {
		throw new Error(`図形 ${id} が見つからない`);
	}
	return centerOf(obj.transform);
}

/** 図形の中心コンテンツ座標（boundingBox の画面座標を toContent で変換） */
async function contentCenter(
	canvas: CanvasDriver,
	id: string,
): Promise<{ x: number; y: number }> {
	const box = await canvas.objectById(id).boundingBox();
	if (!box) {
		throw new Error(`図形 ${id} の boundingBox が取得できない`);
	}
	return canvas.toContent({
		x: box.x + box.width / 2,
		y: box.y + box.height / 2,
	});
}

/** 図形の画面上の幅（ズーム適用待ちのシグナルに使う） */
async function screenWidth(canvas: CanvasDriver, id: string): Promise<number> {
	const box = await canvas.objectById(id).boundingBox();
	if (!box) {
		throw new Error(`図形 ${id} の boundingBox が取得できない`);
	}
	return box.width;
}

/**
 * 現在のズーム倍率に対応する「画面 1px が表すワールド長」＝ viewBox 幅 ÷ SVG 画面幅。
 * zoom=1 で 1、ズームインで 1 未満になる。最大面積の svg をキャンバス本体とみなす
 * （getViewBox と同じ選び方）。
 */
async function worldPerScreenPixel(canvas: CanvasDriver): Promise<number> {
	const raw = await canvas.getViewBox();
	if (!raw) {
		throw new Error("viewBox が取得できない");
	}
	const vbWidth = Number(raw.trim().split(/\s+/)[2]);
	const svgScreenWidth = await canvas.page.evaluate(() => {
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
	return vbWidth / svgScreenWidth;
}

test.describe("ズーム下での図形ドラッグ", () => {
	test("ズームイン後にドラッグすると、ワールド移動量は画面移動量×スケールになる", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);
		await canvas.deselect();

		// 図形中心にカーソルを置いてズームイン。基点が中心なので中心の画面位置は不動。
		const centerBeforeZoom = await contentCenter(canvas, id);
		const widthBeforeZoom = await screenWidth(canvas, id);
		await canvas.wheel(centerBeforeZoom, { deltaY: -200, ctrl: true });
		await expect
			.poll(() => screenWidth(canvas, id), {
				message: "ズームインで図形が画面上で拡大すること",
			})
			.toBeGreaterThan(widthBeforeZoom + 1);

		const scale = await worldPerScreenPixel(canvas);
		// ズームインしたので画面 1px が表すワールド長は短くなる（< 1）。
		// これが満たされないとテストが zoom=1 と区別できず無意味になるため先に固める。
		expect(scale).toBeLessThan(1);

		// ズームは viewBox を変えるだけで図形のワールド座標は動かさない。
		const worldBefore = await worldCenter(canvas, id);

		// 図形中心（コンテンツ座標）を掴んで画面上で +160, +100 ドラッグする。
		const grab = await contentCenter(canvas, id);
		const screenDelta = { x: 160, y: 100 };
		await canvas.drag(grab, {
			x: grab.x + screenDelta.x,
			y: grab.y + screenDelta.y,
		});

		const worldAfter = await worldCenter(canvas, id);

		// ワールド移動量 = 画面移動量 × スケール。
		// 退行（割り戻し忘れ）が起きると worldΔ ≒ screenΔ になりここで落ちる。
		expect(
			Math.abs(worldAfter.x - worldBefore.x - screenDelta.x * scale),
		).toBeLessThanOrEqual(TOLERANCE_PX);
		expect(
			Math.abs(worldAfter.y - worldBefore.y - screenDelta.y * scale),
		).toBeLessThanOrEqual(TOLERANCE_PX);
	});
});
