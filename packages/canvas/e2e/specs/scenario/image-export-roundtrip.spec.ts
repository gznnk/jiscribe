import type { Page } from "@playwright/test";
import type * as CanvasModule from "@workspace/canvas";

import { expect, test } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * 画像エクスポートの round-trip（#55）を検証する spec。
 *
 * エクスポートはコンテキストメニューの Export… → ダイアログ（形式＋マージン＋
 * データ埋め込み有無）→ Export ボタンで実行する。
 *
 * - PNG: デフォルトマージン(16)のまま書き出し → ダウンロードされた PNG
 *   （iTXt に .jis.json 入り）をページへドロップ → 図形が復元されること
 * - SVG: マージンを 32 に変えて書き出し → <foreignObject> を含まず
 *   （GitHub 対応・taint 回避）、viewBox が指定マージンを反映し、
 *   <metadata> の .jis.json が parseCanvasText を通ること
 * - データ埋め込みなし: 拡張子が .jis なしの素の .svg になり、
 *   <metadata>（埋め込みソース）を含まないこと
 * - 透過背景: 背景 rect が敷かれないこと（デフォルトでは敷かれること）
 */

/**
 * コンテキストメニュー → Export… → ダイアログで形式（と任意でマージン・
 * データ埋め込み有無）を選んで書き出し、ダウンロードされたファイル内容を
 * base64 で返す
 */
const downloadViaExportDialog = async (
	page: Page,
	canvas: CanvasDriver,
	menuPoint: { x: number; y: number },
	format: "png" | "svg",
	options: {
		margin?: number;
		includeSource?: boolean;
		transparentBackground?: boolean;
	} = {},
): Promise<{ name: string; base64: string }> => {
	await canvas.openContextMenu(menuPoint);
	await canvas.clickContextMenuItem("export");
	await expect(page.getByTestId("export-dialog")).toBeVisible();

	await page.getByTestId(`export-dialog:format-${format}`).check();
	if (options.margin !== undefined) {
		await page.getByTestId("export-dialog:margin").fill(String(options.margin));
	}
	if (options.includeSource === false) {
		await page.getByTestId("export-dialog:include-source").uncheck();
	}
	if (options.transparentBackground) {
		await page.getByTestId("export-dialog:transparent-background").check();
	}

	const downloadPromise = page.waitForEvent("download");
	await page.getByTestId("export-dialog:submit").click();
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

	// 図形のない空き地を右クリックしてエクスポート（デフォルトマージン 16）
	const png = await downloadViaExportDialog(
		page,
		canvas,
		{ x: 750, y: 550 },
		"png",
	);
	expect(png.name).toMatch(/\.jis\.png$/);

	// fit-to-content: 出力ピクセルは「コンテンツ境界＋余白16」× scale 2。
	// bounds は rect(150..400 × 120..260) ∪ ellipse(480..640 × 300..420)。
	const pngBytes = Buffer.from(png.base64, "base64");
	const ihdrWidth = pngBytes.readUInt32BE(16);
	const ihdrHeight = pngBytes.readUInt32BE(20);
	expect(Math.abs(ihdrWidth - (640 - 150 + 32) * 2)).toBeLessThanOrEqual(4);
	expect(Math.abs(ihdrHeight - (420 - 120 + 32) * 2)).toBeLessThanOrEqual(4);

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

	// エクスポート範囲が現在のビューに依存しないことを確認するため、
	// 書き出し前にパンして視界をずらしておく
	await canvas.middleDrag({ x: 700, y: 500 }, { x: 550, y: 380 });

	// パン後も視界内にある空き地を右クリックし、マージンを 32 に変えて書き出す
	const svg = await downloadViaExportDialog(
		page,
		canvas,
		{ x: 550, y: 400 },
		"svg",
		{ margin: 32 },
	);
	expect(svg.name).toMatch(/\.jis\.svg$/);

	const svgText = Buffer.from(svg.base64, "base64").toString("utf-8");
	expect(svgText).not.toContain("<foreignObject");
	expect(svgText).toContain("svg export");
	// スタンドアロンでは emotion クラスも --jiscribe-* カスタムプロパティも
	// 解決できないため、描画スタイルは computed 値で焼き込まれていること
	// （欠けると fill が初期値の黒になり図形が黒潰れする）
	expect(svgText).not.toContain("var(--");
	expect(svgText).toMatch(/style="[^"]*stroke:/);

	// fit-to-content: パンしていても viewBox はコンテンツ境界＋指定マージン32
	// （rect は 150,120–400,260 に描画済み）
	const viewBoxMatch = svgText.match(/viewBox="([^"]+)"/);
	expect(viewBoxMatch).not.toBeNull();
	const [vbX, vbY, vbWidth, vbHeight] = viewBoxMatch![1]
		.split(/\s+/)
		.map(Number);
	expect(Math.abs(vbX - (150 - 32))).toBeLessThanOrEqual(2);
	expect(Math.abs(vbY - (120 - 32))).toBeLessThanOrEqual(2);
	expect(Math.abs(vbWidth - (250 + 64))).toBeLessThanOrEqual(4);
	expect(Math.abs(vbHeight - (140 + 64))).toBeLessThanOrEqual(4);

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

test("データ埋め込みなしの SVG エクスポートは素の .svg で metadata を含まない", async ({
	canvas,
	page,
}) => {
	await canvas.drawShape("Rectangle", { x: 150, y: 120 }, { x: 400, y: 260 });
	await canvas.deselect();

	const svg = await downloadViaExportDialog(
		page,
		canvas,
		{ x: 700, y: 500 },
		"svg",
		{ includeSource: false },
	);

	// .jis マーカー（再編集可能の印）が付かない素の .svg であること
	expect(svg.name).toMatch(/\.svg$/);
	expect(svg.name).not.toMatch(/\.jis\.svg$/);

	// 埋め込みソース（<metadata> と jiscribe 名前空間）を含まないこと。
	// 画像自体は通常どおり描画されている（塗り焼き込みは source と無関係）
	const svgText = Buffer.from(svg.base64, "base64").toString("utf-8");
	expect(svgText).not.toContain("<metadata");
	expect(svgText).not.toContain("jiscribe.dev/ns/canvas");
	expect(svgText).toMatch(/style="[^"]*stroke:/);
});

/**
 * 背景 rect（viewBox 全面を fill 属性で覆う rect。buildExportSvg が敷く）が
 * あるかを判定する。図形の rect は transform/style ベースなのでマッチしない。
 */
const hasBackgroundRect = (svgText: string): boolean => {
	const viewBoxMatch = svgText.match(/viewBox="([^"]+)"/);
	expect(viewBoxMatch).not.toBeNull();
	const [x, y, width, height] = viewBoxMatch![1].split(/\s+/);
	return new RegExp(
		`<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="`,
	).test(svgText);
};

test("透過背景の SVG エクスポートは背景 rect を敷かない", async ({
	canvas,
	page,
}) => {
	await canvas.drawShape("Rectangle", { x: 150, y: 120 }, { x: 400, y: 260 });
	await canvas.deselect();

	// まず既定（背景あり）で「背景 rect が敷かれる」前提を固定してから、
	// 透過指定で消えることを見る
	const opaque = await downloadViaExportDialog(
		page,
		canvas,
		{ x: 700, y: 500 },
		"svg",
	);
	const opaqueText = Buffer.from(opaque.base64, "base64").toString("utf-8");
	expect(hasBackgroundRect(opaqueText)).toBe(true);

	const transparent = await downloadViaExportDialog(
		page,
		canvas,
		{ x: 700, y: 500 },
		"svg",
		{ transparentBackground: true },
	);
	const transparentText = Buffer.from(transparent.base64, "base64").toString(
		"utf-8",
	);
	expect(hasBackgroundRect(transparentText)).toBe(false);
	// 図形自体は描画されている
	expect(transparentText).toMatch(/style="[^"]*stroke:/);
});

test("Escape はダイアログを閉じるだけで、選択は解除されない", async ({
	canvas,
	page,
}) => {
	await canvas.drawShape("Rectangle", { x: 150, y: 120 }, { x: 400, y: 260 });
	await canvas.deselect();
	await canvas.selectAt({ x: 275, y: 190 });

	// コンテキストメニューは空きスペースの右クリックでのみ開く（選択は保持される）
	await canvas.openContextMenu({ x: 700, y: 500 });
	await canvas.clickContextMenuItem("export");
	await expect(page.getByTestId("export-dialog")).toBeVisible();

	// フォーカスは Canvas コンテナ側に残っている（入力欄ではない）状態で Escape。
	// bubble 段の DeselectAllCommand に奪われず、ダイアログだけが閉じること。
	await page.keyboard.press("Escape");
	await expect(page.getByTestId("export-dialog")).toHaveCount(0);
	await expect(page.locator("[data-kind=control]").first()).toBeVisible();
});
