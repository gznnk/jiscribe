import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * #72 の非回帰。ズーム≠1 で「リサイズのドラッグを保持したままホイールでスクロール」した
 * とき、bottomRight ハンドル（= event.last をカーソル world 位置として使う経路）が
 * 実ビューポート移動量に追従することを検証する。
 *
 * 旧実装は currentPos(=last) に生ピクセルの scrollDelta を加算していた。ビューポートは
 * scrollDelta/zoom（world 単位）しか動かないため、zoom≠1 では last が zoom 倍ずれ、
 * リサイズがカーソルから乖離していた（移動は delta 経由のため影響なし）。
 *
 * 検証は world 寸法の増分で測る:
 *   - 修正後: 幅Δ = scrollDelta × scale（= scrollDelta / zoom）
 *   - 退行時: 幅Δ = scrollDelta（生px。scale を掛け忘れる分 1/scale 倍に膨らむ）
 * zoom=1 では両者が一致して退行が隠れるため、scale を十分小さく（< 0.6）してから測る。
 */

const TOLERANCE_PX = 14;

/** 画面 1px が表す world 長（viewBox 幅 ÷ SVG 画面幅）。zoom=1 で 1、ズームインで < 1。 */
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
	// CI 高負荷時に既定 5s では足りずハンドル出現待ちが flake るため余裕を持たせる。
	await expect(control).toBeVisible({ timeout: 15_000 });
	const box = await control.boundingBox();
	if (!box) {
		throw new Error(`変形ハンドル ${handle} の位置が取得できない`);
	}
	return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

test.describe("ズーム下・リサイズ中のスクロール（#72）", () => {
	test("ドラッグ保持中のホイールスクロールで bottomRight は world で scrollDelta×scale だけ動く（生pxではない）", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 300, y: 180 },
			{ x: 520, y: 340 },
		);
		// drawShape 直後は自動選択。ハンドルを出したままズームする（選択は zoom で消えない）。
		const rect = canvas.objectById(id);

		// 図形中心を基点にズームイン（基点が中心なので中心の画面位置は不動）。
		// ctrl+wheel は 1 ノッチ ×1.1 固定なので、scale が十分小さくなるまで繰り返す。
		const box0 = await rect.boundingBox();
		if (!box0) {
			throw new Error("図形の boundingBox が取得できない");
		}
		const center = canvas.toContent({
			x: box0.x + box0.width / 2,
			y: box0.y + box0.height / 2,
		});
		for (let i = 0; i < 15; i++) {
			if ((await worldPerScreenPixel(canvas)) < 0.5) {
				break;
			}
			await canvas.wheel(center, { deltaY: -200, ctrl: true });
		}

		const scale = await worldPerScreenPixel(canvas);
		// scale が 1 に近いと zoom=1 と区別できず退行が隠れるため、十分小さいことを先に固める。
		expect(scale).toBeLessThan(0.6);

		// bottomRight ハンドルでリサイズを開始し、保持したままにする。
		const handle = await handleScreenCenter(canvas, "bottomRight");
		const worldWInit = Number(await rect.getAttribute("width"));

		await canvas.page.mouse.move(handle.x, handle.y);
		await canvas.page.mouse.down();
		// 外側へ少し広げてドラッグを確立しつつヘッドルームを確保する。
		await canvas.page.mouse.move(handle.x + 60, handle.y + 40, { steps: 6 });

		try {
			// 確立した移動が world 幅に反映されるまで待ってから基準値を読む。
			await expect
				.poll(async () => Number(await rect.getAttribute("width")), {
					message: "ドラッグ確立で world 幅が増えること",
					timeout: 15_000,
				})
				.toBeGreaterThan(worldWInit + 5);
			const widthBefore = Number(await rect.getAttribute("width"));

			// カーソルは動かさず、ドラッグ保持中にホイールで水平スクロールする。
			// deltaX>0 で viewport.minX が scrollDelta/zoom 増え、固定カーソル下の world は
			// 同じだけ右へ動く。bottomRight はそれに追従するので world 幅が増える。
			const scrollDelta = 160;
			await canvas.page.mouse.wheel(scrollDelta, 0);

			await expect
				.poll(async () => Number(await rect.getAttribute("width")), {
					message: "スクロールで world 幅が増えて落ち着くこと",
					timeout: 15_000,
				})
				.toBeGreaterThan(widthBefore + 1);
			const widthAfter = Number(await rect.getAttribute("width"));
			const deltaW = widthAfter - widthBefore;

			// 修正後: 幅Δ ≈ scrollDelta × scale（= 実ビューポート移動量）。
			expect(Math.abs(deltaW - scrollDelta * scale)).toBeLessThanOrEqual(
				TOLERANCE_PX,
			);
			// 退行（生px加算）なら 幅Δ ≈ scrollDelta となり、ここで必ず落ちる。
			expect(deltaW).toBeLessThan(scrollDelta * 0.85);
		} finally {
			await canvas.page.mouse.up();
		}
	});
});
