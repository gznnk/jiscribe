import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * 非等倍 viewBox（ズーム中）でのリサイズが、ハンドルの画面移動量をスケールで
 * 割り戻して正しい world 寸法変化にすることの検証（screen→world のリサイズ変換）。
 *
 * drag-under-zoom.spec が移動（translate）経路を守るのに対し、こちらはリサイズ
 * （TransformController の寸法計算）経路を守る。ハンドル位置とドラッグ差分の両方が
 * 絡む分、移動より倍率の取りこぼしが起きやすい。既存の resize.spec / resize-flip /
 * resize-snap はすべて zoom=1 で、その場では handleΔ(screen) == 寸法Δ(world) となり
 * 退行が隠れるため、ズームインした状態で「寸法Δ == handleΔ × scale」を確かめる。
 *
 * スナップは ctrl 押下で無効化し（単一図形でも寸法スナップが入りうるため）、
 * ハンドルの純粋な追従だけを測る。
 */

const TOLERANCE_PX = 2;

/**
 * 現在のズーム倍率に対応する「画面 1px が表す world 長」＝ viewBox 幅 ÷ SVG 画面幅。
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

/** 変形ハンドルの画面座標中心（boundingBox は画面座標を返す） */
async function handleScreenCenter(
	canvas: CanvasDriver,
	handle: "bottomRight",
): Promise<{ x: number; y: number }> {
	const control = canvas.page.locator(selectors.transformControl(handle));
	await expect(control).toBeVisible();
	const box = await control.boundingBox();
	if (!box) {
		throw new Error(`変形ハンドル ${handle} の位置が取得できない`);
	}
	return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

test.describe("ズーム下でのリサイズ", () => {
	test("ズームイン後の bottomRight リサイズは world 寸法を画面移動量×スケールだけ変える", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);
		// drawShape 直後は自動選択。ハンドルを出したままズームする（選択は zoom で消えない）。
		const rect = canvas.objectById(id);

		// 図形中心にカーソルを置いてズームイン。基点が中心なので中心の画面位置は不動。
		const box0 = await rect.boundingBox();
		if (!box0) {
			throw new Error("図形の boundingBox が取得できない");
		}
		const center = canvas.toContent({
			x: box0.x + box0.width / 2,
			y: box0.y + box0.height / 2,
		});
		await canvas.wheel(center, { deltaY: -200, ctrl: true });
		await expect
			.poll(async () => (await rect.boundingBox())?.width ?? 0, {
				message: "ズームインで図形が画面上で拡大すること",
			})
			.toBeGreaterThan(box0.width + 1);

		const scale = await worldPerScreenPixel(canvas);
		// ズームインしたので画面 1px が表す world 長は短くなる（< 1）。
		// これが満たされないとテストが zoom=1 と区別できず無意味になるため先に固める。
		expect(scale).toBeLessThan(1);

		// world 寸法（width/height 属性）はズームでは変わらない。リサイズ直前の値を基準にする。
		const worldW0 = Number(await rect.getAttribute("width"));
		const worldH0 = Number(await rect.getAttribute("height"));

		// bottomRight ハンドルを既知の「画面移動量」だけドラッグする。
		// dragTransformHandle は to をコンテンツ座標で受け取り、ハンドル中心から
		// toScreen(to) へドラッグするため、to = toContent(handle + delta) とすれば
		// 画面移動量はちょうど delta になる。ctrl でスナップを無効化する。
		const handle = await handleScreenCenter(canvas, "bottomRight");
		const screenDelta = { x: 140, y: 90 };
		const to = canvas.toContent({
			x: handle.x + screenDelta.x,
			y: handle.y + screenDelta.y,
		});
		await canvas.dragTransformHandle("bottomRight", to, { ctrl: true });

		const worldW1 = Number(await rect.getAttribute("width"));
		const worldH1 = Number(await rect.getAttribute("height"));

		// world 寸法変化 = 画面移動量 × スケール。
		// 退行（割り戻し忘れ）が起きると 寸法Δ ≒ screenΔ になりここで落ちる。
		expect(
			Math.abs(worldW1 - worldW0 - screenDelta.x * scale),
		).toBeLessThanOrEqual(TOLERANCE_PX);
		expect(
			Math.abs(worldH1 - worldH0 - screenDelta.y * scale),
		).toBeLessThanOrEqual(TOLERANCE_PX);
	});
});
