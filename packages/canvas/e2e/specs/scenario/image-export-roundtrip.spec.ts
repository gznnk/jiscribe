import type { Page } from "@playwright/test";
import type * as CanvasModule from "@workspace/canvas";

import { expect, test } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

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
 * - 複数スロット図形（record、#167）: 全スロットのテキストが <text> で出力されること
 * - コネクターラベル: foreignObject ではなく <text>＋箱の <rect> として
 *   書き出され（B1）、PNG でもラスタライズされること
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

test("record（複数スロット）の SVG エクスポートは全スロットを <text> で出力する", async ({
	canvas,
	page,
}) => {
	await canvas.drawShapeFromFlyout(
		"uml",
		"record",
		{ x: 300, y: 200 },
		{ x: 520, y: 280 },
	);
	await canvas.deselect();

	// タイトル帯（上端 28px 内）= name スロット、その下 = rows スロット
	await canvas.typeTextAt({ x: 410, y: 212 }, "Users");
	await canvas.commitText();
	await canvas.typeTextAt({ x: 410, y: 255 }, "id: string\nname: string");
	await canvas.commitText();
	await canvas.deselect();

	// データ埋め込みを外し、本文一致 = 描画された <text> 由来と確定させる
	const svg = await downloadViaExportDialog(
		page,
		canvas,
		{ x: 750, y: 550 },
		"svg",
		{ includeSource: false },
	);
	const svgText = Buffer.from(svg.base64, "base64").toString("utf-8");

	expect(svgText).not.toContain("<foreignObject");
	const textElements = [...svgText.matchAll(/<text[\s\S]*?<\/text>/g)].join(
		" ",
	);
	expect(textElements).toContain("Users");
	expect(textElements).toContain("id: string");
	expect(textElements).toContain("name: string");
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

type Box = { x: number; y: number; width: number; height: number };

/** ラベルの背景色・枠線色（既定でない値であることが検証の前提）。 */
const LABEL_FILL = "rgb(220, 38, 38)";
const LABEL_STROKE = "rgb(59, 130, 246)";
const LABEL_STROKE_WIDTH = 2;

/** ラベルボックス（foreignObject 内側の LabelBox div）のロケーター。 */
const labelBoxOf = (canvas: CanvasDriver) =>
	canvas.page
		.locator("foreignObject[data-kind=connector][data-part=label]")
		.locator("div")
		.first();

/** ラベル foreignObject のジオメトリ属性（＝ワールド座標のラベル箱）。 */
const labelForeignObjectBox = async (canvas: CanvasDriver): Promise<Box> => {
	const attributes = await canvas.page
		.locator("foreignObject[data-kind=connector][data-part=label]")
		.evaluate((element) => ({
			x: element.getAttribute("x"),
			y: element.getAttribute("y"),
			width: element.getAttribute("width"),
			height: element.getAttribute("height"),
		}));
	return {
		x: Number(attributes.x),
		y: Number(attributes.y),
		width: Number(attributes.width),
		height: Number(attributes.height),
	};
};

/**
 * 2つの矩形をコネクターで結び、既定でないスタイル（赤背景・青枠 2px）の
 * ラベルを付けて、既定位置（作成時のアンカー）から動かす。
 */
const setupStyledLabeledConnector = async (
	canvas: CanvasDriver,
): Promise<void> => {
	await canvas.drawShape("Rectangle", { x: 300, y: 150 }, { x: 500, y: 250 });
	await canvas.deselect();
	await canvas.drawShape("Rectangle", { x: 700, y: 300 }, { x: 900, y: 400 });
	await canvas.deselect();

	await canvas.selectAt({ x: 400, y: 200 });
	const connectorId = await canvas.createConnector("rightCenter", {
		x: 715,
		y: 350,
	});
	await canvas.deselect();

	// 線上（最初のセグメントの中点）をダブルクリックしてラベルを付ける。
	const points = (await canvas.objectById(connectorId).getAttribute("points"))!
		.trim()
		.split(/\s+/)
		.map((pair) => {
			const [x, y] = pair.split(",").map(Number);
			return { x, y };
		});
	const onLine = {
		x: (points[0].x + points[1].x) / 2,
		y: (points[0].y + points[1].y) / 2,
	};
	await canvas.typeTextAt(onLine, "Yes");
	await canvas.commitText();

	// 背景色・枠線を既定から変える（エクスポートに塗りと枠が出ることを見るため）。
	await canvas.clickAt(onLine);
	await canvas.openObjectMenu("label-bg-color");
	await canvas.page.click(selectors.objectMenuSet("label.fill", "#dc2626"));
	await canvas.openObjectMenu("label-border-style");
	await canvas.setNumberInput("label.strokeWidth", LABEL_STROKE_WIDTH);
	await canvas.openObjectMenu("label-border-color");
	await canvas.page.click(selectors.objectMenuSet("label.stroke", "#3b82f6"));

	const labelBox = labelBoxOf(canvas);
	await expect(labelBox).toHaveCSS("background-color", LABEL_FILL);
	await expect(labelBox).toHaveCSS("border-top-color", LABEL_STROKE);

	// 既定位置（label.position / label.offset 無指定の中点）から動かす。選択中は
	// コントロールハンドルがラベルに重なるので解除してから掴む。
	await canvas.deselect();
	const before = await labelForeignObjectBox(canvas);
	const screenBox = await labelBox.boundingBox();
	if (!screenBox) {
		throw new Error("ラベルボックスの位置が取得できない");
	}
	const grabPoint = canvas.toContent({
		x: screenBox.x + screenBox.width / 2,
		y: screenBox.y + screenBox.height / 2,
	});
	await canvas.drag(grabPoint, { x: grabPoint.x, y: grabPoint.y - 40 }, 10);
	await expect
		.poll(async () => (await labelForeignObjectBox(canvas)).y, {
			message: "ドラッグでラベルが既定位置から動くこと",
		})
		.toBeLessThan(before.y - 20);
};

type SvgAttributes = Record<string, string>;

/** SVG テキストから指定タグの開始タグを拾い、属性を名前→値で返す。 */
const parseTagAttributes = (
	svgText: string,
	tagName: string,
): SvgAttributes[] =>
	(svgText.match(new RegExp(`<${tagName}\\b[^>]*>`, "g")) ?? []).map((tag) => {
		const attributes: SvgAttributes = {};
		for (const [, name, value] of tag.matchAll(/([\w:-]+)="([^"]*)"/g)) {
			attributes[name] = value;
		}
		return attributes;
	});

/** viewBox を数値 4 つに分解する。 */
const parseViewBox = (svgText: string): Box => {
	const viewBoxMatch = svgText.match(/viewBox="([^"]+)"/);
	expect(viewBoxMatch).not.toBeNull();
	const [x, y, width, height] = viewBoxMatch![1].split(/\s+/).map(Number);
	return { x, y, width, height };
};

test("コネクターラベルは foreignObject ではなく <text>＋箱の <rect> として書き出される", async ({
	canvas,
	page,
}) => {
	await setupStyledLabeledConnector(canvas);
	const labelBox = await labelForeignObjectBox(canvas);

	await canvas.deselect();
	const svg = await downloadViaExportDialog(
		page,
		canvas,
		{ x: 200, y: 550 },
		"svg",
	);
	const svgText = Buffer.from(svg.base64, "base64").toString("utf-8");

	// foreignObject は残らない（残せば PNG が taint し GitHub でも消える）。
	expect(svgText).not.toContain("<foreignObject");

	// 箱: ラベル foreignObject と同じ位置・大きさの rect が塗りと枠付きで出る。
	// CSS の枠線は内側に描かれるので、SVG の stroke は線幅の半分だけ内側に寄る。
	const labelRect = parseTagAttributes(svgText, "rect").find(
		(attributes) => attributes.fill === LABEL_FILL,
	);
	expect(labelRect, "ラベル背景色の rect が出力されること").toBeDefined();
	expect(labelRect!.stroke).toBe(LABEL_STROKE);
	expect(Number(labelRect!["stroke-width"])).toBe(LABEL_STROKE_WIDTH);
	const inset = LABEL_STROKE_WIDTH / 2;
	expect(Math.abs(Number(labelRect!.x) - (labelBox.x + inset))).toBeLessThan(1);
	expect(Math.abs(Number(labelRect!.y) - (labelBox.y + inset))).toBeLessThan(1);
	expect(
		Math.abs(Number(labelRect!.width) - (labelBox.width - inset * 2)),
	).toBeLessThan(1);
	expect(
		Math.abs(Number(labelRect!.height) - (labelBox.height - inset * 2)),
	).toBeLessThan(1);

	// 文字: ネイティブの <text> になり、箱の中央に置かれる。
	const labelTextBlock = (svgText.match(/<text\b[\s\S]*?<\/text>/g) ?? []).find(
		(block) => block.includes(">Yes<"),
	);
	expect(
		labelTextBlock,
		"ラベル文字列が <text> として出力されること",
	).toBeDefined();
	const tspan = parseTagAttributes(labelTextBlock!, "tspan")[0];
	expect(
		Math.abs(Number(tspan.x) - (labelBox.x + labelBox.width / 2)),
	).toBeLessThan(1);
	expect(Number(tspan.y)).toBeGreaterThan(labelBox.y);
	expect(Number(tspan.y)).toBeLessThan(labelBox.y + labelBox.height);

	// viewBox にラベル箱が収まる（ラベルはコネクターの extent の一部）。
	const viewBox = parseViewBox(svgText);
	expect(viewBox.x).toBeLessThanOrEqual(labelBox.x);
	expect(viewBox.y).toBeLessThanOrEqual(labelBox.y);
	expect(viewBox.x + viewBox.width).toBeGreaterThanOrEqual(
		labelBox.x + labelBox.width,
	);
	expect(viewBox.y + viewBox.height).toBeGreaterThanOrEqual(
		labelBox.y + labelBox.height,
	);
});

test("PNG エクスポートでもコネクターラベルがラスタライズされる", async ({
	canvas,
	page,
}) => {
	await setupStyledLabeledConnector(canvas);
	const labelBox = await labelForeignObjectBox(canvas);

	// ワールド座標→ピクセルの換算に使う viewBox は SVG 側から取る
	// （どちらも同じマージンなので出力領域は一致する）。
	await canvas.deselect();
	const svg = await downloadViaExportDialog(
		page,
		canvas,
		{ x: 200, y: 550 },
		"svg",
	);
	const viewBox = parseViewBox(
		Buffer.from(svg.base64, "base64").toString("utf-8"),
	);

	const png = await downloadViaExportDialog(
		page,
		canvas,
		{ x: 200, y: 550 },
		"png",
	);

	// ラベル箱の内側（枠線と文字を避けた塗りの領域）に背景色の画素があること。
	const fillPixelCount = await page.evaluate(
		async ({ base64, region, color }) => {
			const image = new Image();
			await new Promise((resolve, reject) => {
				image.onload = resolve;
				image.onerror = reject;
				image.src = `data:image/png;base64,${base64}`;
			});
			const canvasElement = document.createElement("canvas");
			canvasElement.width = image.naturalWidth;
			canvasElement.height = image.naturalHeight;
			const context = canvasElement.getContext("2d")!;
			context.drawImage(image, 0, 0);

			const scale = image.naturalWidth / region.viewBoxWidth;
			const { data } = context.getImageData(
				Math.round((region.x - region.viewBoxX) * scale),
				Math.round((region.y - region.viewBoxY) * scale),
				Math.max(1, Math.round(region.width * scale)),
				Math.max(1, Math.round(region.height * scale)),
			);
			let count = 0;
			for (let i = 0; i < data.length; i += 4) {
				if (
					Math.abs(data[i] - color.r) < 20 &&
					Math.abs(data[i + 1] - color.g) < 20 &&
					Math.abs(data[i + 2] - color.b) < 20
				) {
					count++;
				}
			}
			return count;
		},
		{
			base64: png.base64,
			// 枠線（2）と余白を避け、箱の内側だけを見る
			region: {
				x: labelBox.x + 4,
				y: labelBox.y + 4,
				width: labelBox.width - 8,
				height: labelBox.height - 8,
				viewBoxX: viewBox.x,
				viewBoxY: viewBox.y,
				viewBoxWidth: viewBox.width,
			},
			color: { r: 220, g: 38, b: 38 },
		},
	);

	expect(fillPixelCount).toBeGreaterThan(20);
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
