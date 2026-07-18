import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Zoom to Fit（Ctrl+0）の「正確なフレーミング」を守る。
 *
 * viewport.spec は「対象が枠内に入る」までで、中心合わせ・余白量は未検証だった。
 * 実装（ZoomToFitCommand）は
 *   ・viewBox 中心 = 内容バウンディングボックスの中心（contentCx/contentCy）
 *   ・制約軸（はみ出す側）で画面 48px（PADDING_PX）ぶんの余白を左右に取る
 * という枠組み。中心ズレや余白計算の取り違えは「枠内に入る」検証では捕まらないため、
 * 中心一致と「制約軸の余白＝48px/zoom」まで踏み込んで固める。
 *
 * 内容 bbox は軸並行矩形なので描画座標がそのまま境界。横長(960×520)に置くので
 * 制約軸は横（width）になる（多少のツールバー高さの差では揺らがない）。
 */

const PADDING_PX = 48;

type ViewBox = { minX: number; minY: number; width: number; height: number };

function parseViewBox(raw: string | null): ViewBox {
	if (!raw) {
		throw new Error("viewBox が取得できない");
	}
	const [minX, minY, width, height] = raw.trim().split(/\s+/).map(Number);
	return { minX, minY, width, height };
}

/** キャンバス本体 svg の画面ピクセル幅（= viewport.width）。zoom 復元に使う */
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

test.describe("Zoom to Fit の正確なフレーミング", () => {
	test("内容の中心に合わせ、制約軸に 48px の余白を左右対称に取る", async ({
		canvas,
	}) => {
		// 内容 bbox: 左200・上200・右1160・下720 → 幅960×高520、中心 (680,460)。
		await canvas.drawShape("Rectangle", { x: 200, y: 200 }, { x: 360, y: 300 });
		await canvas.drawShape(
			"Rectangle",
			{ x: 1000, y: 600 },
			{ x: 1160, y: 720 },
		);
		await canvas.deselect();

		const contentLeft = 200;
		const contentRight = 1160;
		const contentCx = (contentLeft + contentRight) / 2; // 680
		const contentCy = (200 + 720) / 2; // 460

		const before = await canvas.getViewBox();
		await canvas.zoomToFit();
		await expect
			.poll(() => canvas.getViewBox(), {
				message: "Zoom to Fit で viewBox が変化すること",
			})
			.not.toBe(before);

		const vb = parseViewBox(await canvas.getViewBox());
		const svgW = await svgScreenWidth(canvas);
		// zoom = 画面幅 / viewBox幅。world 余白は 48/zoom = 48 * viewBox幅 / 画面幅。
		const expectedMarginWorld = (PADDING_PX * vb.width) / svgW;

		// 中心合わせ: viewBox 中心が内容中心に一致する（x も y も）。
		expect(vb.minX + vb.width / 2).toBeCloseTo(contentCx, 0);
		expect(vb.minY + vb.height / 2).toBeCloseTo(contentCy, 0);

		// 制約軸（横）の左右余白がともに 48px/zoom（左右対称 ＝ 中心合わせの裏付けでもある）。
		const leftMargin = contentLeft - vb.minX;
		const rightMargin = vb.minX + vb.width - contentRight;
		expect(Math.abs(leftMargin - expectedMarginWorld)).toBeLessThanOrEqual(2);
		expect(Math.abs(rightMargin - expectedMarginWorld)).toBeLessThanOrEqual(2);
	});
});
