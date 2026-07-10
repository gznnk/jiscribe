import type { Page } from "@playwright/test";
import type * as CanvasModule from "@workspace/canvas";

import { expect, test } from "../../fixtures";

/**
 * 画像エクスポートの round-trip（#55）を検証する spec。
 *
 * - PNG: ツールバーの Export as PNG → ダウンロードされた PNG（iTXt に
 *   .jis.json 入り）をページへドロップ → 図形が復元されること
 * - SVG: Export as SVG → <foreignObject> を含まず（GitHub 対応・taint 回避）、
 *   <metadata> の .jis.json が parseCanvasText を通ること
 */

/** ダウンロードをトリガーしてファイル内容を base64 で返す */
const downloadFromToolbar = async (
	page: Page,
	testId: string,
): Promise<{ name: string; base64: string }> => {
	const downloadPromise = page.waitForEvent("download");
	await page.getByTestId(testId).click();
	const download = await downloadPromise;
	const stream = await download.createReadStream();
	const chunks: Buffer[] = [];
	for await (const chunk of stream) {
		chunks.push(chunk as Buffer);
	}
	return {
		name: download.suggestedFilename(),
		base64: Buffer.concat(chunks).toString("base64"),
	};
};

test("PNG エクスポート → ドロップで図形が復元される", async ({
	canvas,
	page,
}) => {
	await canvas.drawShape("Rectangle", { x: 150, y: 120 }, { x: 400, y: 260 });
	await canvas.typeTextAt({ x: 275, y: 190 }, "round trip");
	await canvas.commitText();
	await canvas.drawShape("Ellipse", { x: 480, y: 300 }, { x: 640, y: 420 });
	await canvas.deselect();

	const before = await canvas.captureObjects();
	expect(before.length).toBe(2);

	const png = await downloadFromToolbar(page, "export:png");
	expect(png.name).toMatch(/\.png$/);

	// まっさらな状態に戻してからドロップで復元する
	await page.reload();
	await expect.poll(async () => (await canvas.captureObjects()).length).toBe(0);

	await page.evaluate(async (base64) => {
		const res = await fetch(`data:image/png;base64,${base64}`);
		const file = new File([await res.blob()], "exported.png", {
			type: "image/png",
		});
		const dataTransfer = new DataTransfer();
		dataTransfer.items.add(file);
		const target = document.querySelector(".app")!;
		target.dispatchEvent(
			new DragEvent("drop", {
				bubbles: true,
				cancelable: true,
				dataTransfer,
			}),
		);
	}, png.base64);

	// 状態待ち: ドロップ復元で図形が現れる
	await expect.poll(async () => (await canvas.captureObjects()).length).toBe(2);

	const after = await canvas.captureObjects();
	expect(after.map((obj) => obj.id).sort()).toEqual(
		before.map((obj) => obj.id).sort(),
	);
	expect(after.map((obj) => obj.transform).sort()).toEqual(
		before.map((obj) => obj.transform).sort(),
	);
});

test("SVG エクスポートは foreignObject を含まず metadata から復元できる", async ({
	canvas,
	page,
}) => {
	await canvas.drawShape("Rectangle", { x: 150, y: 120 }, { x: 400, y: 260 });
	await canvas.typeTextAt({ x: 275, y: 190 }, "svg export\n日本語ラベル");
	await canvas.commitText();
	await canvas.deselect();

	const svg = await downloadFromToolbar(page, "export:svg");
	expect(svg.name).toMatch(/\.jis\.svg$/);

	const svgText = Buffer.from(svg.base64, "base64").toString("utf-8");
	expect(svgText).not.toContain("<foreignObject");
	expect(svgText).toContain("svg export");
	// スタンドアロンでは emotion クラスも --jiscribe-* カスタムプロパティも
	// 解決できないため、描画スタイルは computed 値で焼き込まれていること
	// （欠けると fill が初期値の黒になり図形が黒潰れする）
	expect(svgText).not.toContain("var(--");
	expect(svgText).toMatch(/style="[^"]*stroke:/);

	// metadata の .jis.json が Canvas の入力契約（parseCanvasText）を満たすこと
	const parsed = await page.evaluate(async (text) => {
		// Vite dev サーバーは bare id を /@id/ 経由で解決する
		const mod = (await import(
			"/@id/@workspace/canvas" as string
		)) as typeof CanvasModule;
		const svgDoc = new DOMParser().parseFromString(text, "image/svg+xml");
		const source = mod.extractCanvasSource(
			svgDoc.documentElement as unknown as SVGSVGElement,
		);
		if (!source) {
			return null;
		}
		return mod.parseCanvasText(JSON.stringify(source));
	}, svgText);

	expect(parsed?.kind).toBe("ok");
});
