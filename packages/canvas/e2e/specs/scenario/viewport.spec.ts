import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * ビューポートのフレーミング操作（Zoom to Fit / Zoom to Selection）の検証。
 *
 * これらはキーボードショートカット（Ctrl+0 / Ctrl+2）から実行され、
 * 内容や選択のバウンディングボックスを計算して viewBox を組み立てる。
 * バウンド計算は壊れても画面が真っ白にならず気づきにくいため、
 * 「対象が枠内に入る」という不変条件で守る。
 *
 * 図形の transform（matrix の e,f＝中心）も viewBox も同じ SVG 座標系なので、
 * zoom / pan の状態に関わらず中心座標を viewBox の範囲と直接比較できる。
 */

type ViewBox = { minX: number; minY: number; width: number; height: number };

/** "minX minY width height" 形式の viewBox 文字列を数値に分解する */
function parseViewBox(raw: string | null): ViewBox {
	if (!raw) {
		throw new Error("viewBox が取得できない");
	}
	const [minX, minY, width, height] = raw.trim().split(/\s+/).map(Number);
	return { minX, minY, width, height };
}

/** 図形の transform="matrix(1, 0, 0, 1, e, f)" から中心座標（e,f）を取り出す */
function centerOf(transform: string | null): { x: number; y: number } {
	if (!transform) {
		throw new Error("transform が取得できない");
	}
	const nums = transform.match(/-?\d+(?:\.\d+)?/g)?.map(Number);
	if (!nums || nums.length < 6) {
		throw new Error(`transform を解釈できない: ${transform}`);
	}
	return { x: nums[4], y: nums[5] };
}

/** 点が viewBox の矩形内（境界含む）にあるか */
function contains(box: ViewBox, point: { x: number; y: number }): boolean {
	return (
		point.x >= box.minX &&
		point.x <= box.minX + box.width &&
		point.y >= box.minY &&
		point.y <= box.minY + box.height
	);
}

/** 指定 data-id の図形の中心座標を返す */
async function centerOfObject(
	canvas: CanvasDriver,
	id: string,
): Promise<{ x: number; y: number }> {
	const obj = (await canvas.captureObjects()).find((o) => o.id === id);
	if (!obj) {
		throw new Error(`図形 ${id} が見つからない`);
	}
	return centerOf(obj.transform);
}

test.describe("ビューポートのフレーミング", () => {
	test("Zoom to Fit は全図形を枠内に収める", async ({ canvas }) => {
		// ビューポート（1440x900）より十分小さい範囲に散らして配置する。
		// → fit ではズームインして viewBox 幅が初期より小さくなるはず。
		const leftId = await canvas.drawShape(
			"Rectangle",
			{ x: 200, y: 200 },
			{ x: 360, y: 300 },
		);
		const rightId = await canvas.drawShape(
			"Rectangle",
			{ x: 1000, y: 600 },
			{ x: 1160, y: 720 },
		);
		await canvas.deselect();

		const before = parseViewBox(await canvas.getViewBox());

		await canvas.zoomToFit();

		await expect
			.poll(() => canvas.getViewBox(), {
				message: "Zoom to Fit で viewBox が変化すること",
			})
			.not.toBe(
				`${before.minX} ${before.minY} ${before.width} ${before.height}`,
			);

		const after = parseViewBox(await canvas.getViewBox());
		const leftCenter = await centerOfObject(canvas, leftId);
		const rightCenter = await centerOfObject(canvas, rightId);

		expect(contains(after, leftCenter), "左図形が枠内に入ること").toBe(true);
		expect(contains(after, rightCenter), "右図形が枠内に入ること").toBe(true);
		// 内容がビューポートより小さいのでズームインして枠が狭くなる
		expect(after.width).toBeLessThan(before.width);
	});

	test("Zoom to Selection は選択図形だけを枠に収める（非選択は枠外）", async ({
		canvas,
	}) => {
		const selectedId = await canvas.drawShape(
			"Rectangle",
			{ x: 200, y: 200 },
			{ x: 360, y: 300 },
		);
		const otherId = await canvas.drawShape(
			"Rectangle",
			{ x: 1000, y: 600 },
			{ x: 1160, y: 720 },
		);

		// 左の図形だけを選択する（drawShape 直後は右が選択されている）
		await canvas.selectAt({ x: 280, y: 250 });

		const before = parseViewBox(await canvas.getViewBox());

		await canvas.zoomToSelection();

		await expect
			.poll(() => canvas.getViewBox(), {
				message: "Zoom to Selection で viewBox が変化すること",
			})
			.not.toBe(
				`${before.minX} ${before.minY} ${before.width} ${before.height}`,
			);

		const after = parseViewBox(await canvas.getViewBox());
		const selectedCenter = await centerOfObject(canvas, selectedId);

		expect(contains(after, selectedCenter), "選択図形が枠内に入ること").toBe(
			true,
		);
		// selection は内容全体ではなく選択範囲に寄せるので、離れた非選択図形は枠外になる。
		// ビューポートカリング（#212）により枠外の図形は DOM から消えるため、
		// 「DOM に存在しない」も枠外の成立として扱う
		const other = (await canvas.captureObjects()).find((o) => o.id === otherId);
		expect(
			other === undefined || !contains(after, centerOf(other.transform)),
			"非選択図形は枠外であること",
		).toBe(true);
		expect(after.width).toBeLessThan(before.width);
	});

	test("図形がないとき Zoom to Fit は何もしない", async ({ canvas }) => {
		const before = await canvas.getViewBox();

		await canvas.zoomToFit();

		// canExecute が false（objects 0 件）なので viewBox は不変
		await expect.poll(() => canvas.getViewBox()).toBe(before);
	});

	test("選択がないとき Zoom to Selection は何もしない", async ({ canvas }) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });
		await canvas.deselect();

		const before = await canvas.getViewBox();

		await canvas.zoomToSelection();

		// canExecute が false（selectedIds 0 件）なので viewBox は不変
		await expect.poll(() => canvas.getViewBox()).toBe(before);
	});
});
