/**
 * `.jis.json`（jiscribe ドキュメント）を、CanvasDriver の「テスト済み UI 操作」だけで
 * キャンバス上に再構築する。新しいプリミティブは足さず、drawShape / setColor /
 * typeTextAt / createConnector / setStrokeDashType の合成のみで成立させる。
 *
 * 狙い: ランディングのデモギャラリーにある図（cloud-native-commerce.jis.json）と同じ図を、
 * AI が UI を操作するだけで描き起こせる、というマーケ訴求をそのままテストにする。
 */

import type { CanvasDriver } from "../support/CanvasDriver";
import type { AnchorId } from "../support/selectors";

type Point = { x: number; y: number };

type DocRect = {
	id: string;
	type: "rect";
	x: number;
	y: number;
	width: number;
	height: number;
	fill?: string;
	stroke?: string;
	text?: string;
	fontColor?: string;
};

type DocPolyline = {
	id: string;
	type: "polyline";
	points: Point[];
	stroke?: string;
	strokeDashType?: string;
};

type DocNode = DocRect | DocPolyline;

type DocConnectorEnd = { owner: { id: string }; anchor: { id: AnchorId } };

type DocConnector = {
	id: string;
	source: DocConnectorEnd;
	target: DocConnectorEnd;
	stroke?: string;
	strokeDashType?: string;
};

/** renderArchitectureDoc が消費する `.jis.json` の部分集合 */
export type ArchitectureDoc = { root: DocNode[]; connectors: DocConnector[] };

// 新規描画時のデフォルト値。これと同じなら ObjectMenu 操作を省略する。
const DEFAULT_FILL = "transparent";
const DEFAULT_STROKE = "#374151";

// ビューポート端 20px で自動スクロール（パン）が起きると座標前提が崩れるため、
// ドキュメント全体をこの安全帯（端から 30px 以上）に収まるよう縮尺・配置する。
// 既定ビューポートは 1440x900（playwright.config.ts）。
const SAFE = { left: 30, top: 30, right: 1410, bottom: 860 };

/** ドキュメント座標 → 画面座標の射影関数を作る（全体を安全帯に等比フィット） */
function makeProjector(doc: ArchitectureDoc): (x: number, y: number) => Point {
	let maxX = 0;
	let maxY = 0;
	const extend = (x: number, y: number) => {
		maxX = Math.max(maxX, x);
		maxY = Math.max(maxY, y);
	};
	for (const node of doc.root) {
		if (node.type === "rect") {
			extend(node.x + node.width, node.y + node.height);
		} else {
			for (const point of node.points) {
				extend(point.x, point.y);
			}
		}
	}

	const scale = Math.min(
		(SAFE.right - SAFE.left) / maxX,
		(SAFE.bottom - SAFE.top) / maxY,
	);
	const offsetX = SAFE.left + (SAFE.right - SAFE.left - maxX * scale) / 2;
	const offsetY = SAFE.top + (SAFE.bottom - SAFE.top - maxY * scale) / 2;

	return (x, y) => ({ x: offsetX + x * scale, y: offsetY + y * scale });
}

const rectCenter = (rect: DocRect): Point => ({
	x: rect.x + rect.width / 2,
	y: rect.y + rect.height / 2,
});

/** 図形の辺の中点（コネクターの接続点）をドキュメント座標で返す */
function connectPoint(rect: DocRect, anchor: AnchorId): Point {
	const cx = rect.x + rect.width / 2;
	const cy = rect.y + rect.height / 2;
	switch (anchor) {
		case "topCenter":
			return { x: cx, y: rect.y };
		case "bottomCenter":
			return { x: cx, y: rect.y + rect.height };
		case "leftCenter":
			return { x: rect.x, y: cy };
		case "rightCenter":
			return { x: rect.x + rect.width, y: cy };
	}
}

/** 1つの矩形を描き、色・テキストを設定する（描画直後は自動選択される） */
async function renderRect(
	canvas: CanvasDriver,
	project: (x: number, y: number) => Point,
	rect: DocRect,
): Promise<void> {
	await canvas.drawShape(
		"Rectangle",
		project(rect.x, rect.y),
		project(rect.x + rect.width, rect.y + rect.height),
	);

	if (rect.fill && rect.fill !== DEFAULT_FILL) {
		await canvas.setColor("bg-color", rect.fill);
	}
	if (rect.stroke && rect.stroke !== DEFAULT_STROKE) {
		await canvas.setColor("stroke-color", rect.stroke);
	}
	if (rect.text && rect.fontColor) {
		await canvas.setColor("font-color", rect.fontColor);
	}

	// ObjectMenu が図形を覆ってテキスト編集を阻害しないよう、一度閉じてから入力する。
	await canvas.deselect();
	if (rect.text) {
		const center = rectCenter(rect);
		await canvas.typeTextAt(project(center.x, center.y), rect.text);
		await canvas.commitText();
	}
}

/** ルート直下のポリライン（凡例の線など）を描き、色・線種を設定する */
async function renderPolyline(
	canvas: CanvasDriver,
	project: (x: number, y: number) => Point,
	polyline: DocPolyline,
): Promise<void> {
	const first = polyline.points[0];
	const last = polyline.points[polyline.points.length - 1];
	await canvas.drawShape(
		"Polyline",
		project(first.x, first.y),
		project(last.x, last.y),
	);

	if (polyline.stroke) {
		await canvas.setColor("line-color", polyline.stroke);
	}
	if (polyline.strokeDashType === "dashed") {
		await canvas.setStrokeDashType("line-style", "dashed");
	}
	await canvas.deselect();
}

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * 作成済みコネクターを線上クリックで選択する。
 * コネクターは作成直後に選択されないため、スタイル変更には選択し直しが要る。
 * 共有トランク（複数コネクターが重なる幹線）を避けるため、ターゲット側に近い
 * セグメント中点から順に試す。線は SVG 座標＝画面座標（ズーム1・パンなし）。
 */
async function selectConnectorById(
	canvas: CanvasDriver,
	connectorId: string,
): Promise<void> {
	const pointsAttr = await canvas
		.objectById(connectorId)
		.getAttribute("points");
	if (!pointsAttr) {
		throw new Error(`コネクター ${connectorId} の points が取得できない`);
	}
	const numbers = pointsAttr
		.trim()
		.split(/[\s,]+/)
		.map(Number);
	const points: Point[] = [];
	for (let i = 0; i + 1 < numbers.length; i += 2) {
		points.push({ x: numbers[i], y: numbers[i + 1] });
	}
	const targetEnd = points[points.length - 1];

	const midpoints: Point[] = [];
	for (let i = 0; i + 1 < points.length; i++) {
		midpoints.push({
			x: (points[i].x + points[i + 1].x) / 2,
			y: (points[i].y + points[i + 1].y) / 2,
		});
	}
	midpoints.sort((a, b) => distance(a, targetEnd) - distance(b, targetEnd));

	const lineColorToggle = canvas.page.locator(
		'[data-id="object-menu:toggle:line-color"]',
	);
	for (const mid of midpoints) {
		await canvas.page.mouse.click(mid.x, mid.y);
		try {
			await lineColorToggle.waitFor({ state: "visible", timeout: 700 });
			return;
		} catch {
			// このセグメント中点では当たらなかった。次の候補を試す。
		}
	}
	throw new Error(`コネクター ${connectorId} を線上クリックで選択できなかった`);
}

/** コネクターを選択し直して色・線種を設定する */
async function styleConnector(
	canvas: CanvasDriver,
	connectorId: string,
	style: { stroke?: string; dashed: boolean },
): Promise<void> {
	if (!style.stroke && !style.dashed) {
		return;
	}
	await selectConnectorById(canvas, connectorId);
	if (style.stroke) {
		await canvas.setColor("line-color", style.stroke);
	}
	if (style.dashed) {
		await canvas.setStrokeDashType("line-style", "dashed");
	}
	await canvas.deselect();
}

/** 接続元を選択 → アンカーから接続先の辺へドラッグ → コネクターを着色 */
async function renderConnector(
	canvas: CanvasDriver,
	project: (x: number, y: number) => Point,
	rectsById: Map<string, DocRect>,
	connector: DocConnector,
): Promise<void> {
	const source = rectsById.get(connector.source.owner.id);
	const target = rectsById.get(connector.target.owner.id);
	if (!source || !target) {
		throw new Error(`コネクター ${connector.id} の接続先図形が見つからない`);
	}

	const sourceCenter = rectCenter(source);
	await canvas.selectAt(project(sourceCenter.x, sourceCenter.y));

	const drop = connectPoint(target, connector.target.anchor.id);
	const connectorId = await canvas.createConnector(
		connector.source.anchor.id,
		project(drop.x, drop.y),
	);

	await styleConnector(canvas, connectorId, {
		stroke: connector.stroke,
		dashed: connector.strokeDashType === "dashed",
	});
}

/**
 * ドキュメントを丸ごと再構築する。
 * z 順（ルート配列の順）に図形を描いてから、コネクターを順に接続・着色する。
 */
export async function renderArchitectureDoc(
	canvas: CanvasDriver,
	doc: ArchitectureDoc,
): Promise<void> {
	const project = makeProjector(doc);

	const rectsById = new Map<string, DocRect>();
	for (const node of doc.root) {
		if (node.type === "rect") {
			rectsById.set(node.id, node);
		}
	}

	for (const node of doc.root) {
		if (node.type === "rect") {
			await renderRect(canvas, project, node);
		} else {
			await renderPolyline(canvas, project, node);
		}
	}

	for (const connector of doc.connectors) {
		await renderConnector(canvas, project, rectsById, connector);
	}
}
