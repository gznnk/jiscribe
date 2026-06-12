// hero-showcase.jis.json をブラウザ上の UI 操作（ツール選択・ドラッグ・テキスト入力・
// ObjectMenu での色設定・アンカードラッグによるコネクター接続）で再現するデモ。
// 実行: node apps/svg-canvas-demo/scripts/replay-hero-showcase.mjs （http://localhost:5174/ が起動している前提）
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

const docPath = join(
	dirname(fileURLToPath(import.meta.url)),
	"../../vscode-extension/images/hero-showcase.jis.json",
);
const doc = JSON.parse(readFileSync(docPath, "utf8"));

// ドキュメント座標(1280x868) → 画面座標。左ツールバーを避けて右下に少しずらす
const OFFSET = { x: 100, y: 16 };
const COMMIT_SPOT = { x: 1415, y: 892 }; // 図の外側。テキスト確定や選択解除に使う

// 新規描画時のデフォルト値。これと同じ値はメニュー操作を省略する
const DEFAULT_FILL = "transparent";
const DEFAULT_STROKE = "#374151";

// HEADLESS=1 で非表示実行（動作検証用）
const headless = process.env.HEADLESS === "1";
const browser = await chromium.launch({ headless, slowMo: headless ? 0 : 10 });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://localhost:5174/", { waitUntil: "networkidle" });
await page.waitForTimeout(800);

function toScreen(docX, docY) {
	return { x: docX + OFFSET.x, y: docY + OFFSET.y };
}

async function pause(ms = 100) {
	await page.waitForTimeout(ms);
}

// DEBUG=1 のとき、キャンバスのパン/ズーム（viewBox）の変化を操作ごとに出力
const debugViewBox = process.env.DEBUG === "1";
let lastViewBox = null;
async function logViewBoxIfChanged(label) {
	if (!debugViewBox) {
		return;
	}
	const viewBox = await page.evaluate(() => {
		const svgs = [...document.querySelectorAll("svg")];
		let canvas = null;
		let best = 0;
		for (const svg of svgs) {
			const r = svg.getBoundingClientRect();
			if (r.width * r.height > best) {
				best = r.width * r.height;
				canvas = svg;
			}
		}
		return canvas?.getAttribute("viewBox") ?? null;
	});
	if (viewBox !== lastViewBox) {
		console.log(`  [viewBox] ${label}: ${lastViewBox} -> ${viewBox}`);
		lastViewBox = viewBox;
	}
}

// DEBUG=1 のとき、既存オブジェクトの位置・色の変化（=意図しない移動や着色）を検出する
let lastObjectSnapshot = new Map();
async function logObjectDriftIfAny(label) {
	if (!debugViewBox) {
		return;
	}
	const snapshot = await page.evaluate(() =>
		[...document.querySelectorAll("[data-kind=object]")].map((el) => ({
			id: el.getAttribute("data-id"),
			transform: el.getAttribute("transform"),
			fill: el.getAttribute("fill"),
		})),
	);
	for (const obj of snapshot) {
		const prev = lastObjectSnapshot.get(obj.id);
		if (prev && prev.transform !== obj.transform) {
			console.log(
				`  [MOVED] ${label}: ${obj.id} ${prev.transform} -> ${obj.transform}`,
			);
		}
		if (prev && prev.fill !== obj.fill) {
			console.log(`  [FILL] ${label}: ${obj.id} ${prev.fill} -> ${obj.fill}`);
		}
	}
	lastObjectSnapshot = new Map(snapshot.map((obj) => [obj.id, obj]));
}

async function drag(fromX, fromY, toX, toY, steps = 6) {
	await page.mouse.move(fromX, fromY);
	await page.mouse.down();
	await page.mouse.move(toX, toY, { steps });
	await page.mouse.up();
}

async function deselect() {
	await page.mouse.click(COMMIT_SPOT.x, COMMIT_SPOT.y);
	// 直後のクリックがダブルクリック判定と衝突しないよう長めに待つ
	await pause(300);
}

async function captureObjects() {
	return page.evaluate(() =>
		[
			...document.querySelectorAll("[data-kind=object], [data-kind=connector]"),
		].map((el) => ({
			id: el.getAttribute("data-id"),
			transform: el.getAttribute("transform"),
		})),
	);
}

// ツールを選んでドラッグで図形を描く。ツール選択クリックが効かず既存図形を
// 動かしてしまうことがあるため、新規オブジェクトの増加を検証してリトライする
async function drawShape(toolTitle, fromX, fromY, toX, toY) {
	for (let attempt = 0; attempt < 3; attempt++) {
		const before = await captureObjects();
		await page.click(`button[title="${toolTitle}"]`);
		await pause(120);
		await drag(fromX, fromY, toX, toY);
		await pause(150);
		const after = await captureObjects();
		if (after.length > before.length) {
			return true;
		}
		// 誤って既存図形を動かしてしまった場合は undo で戻す
		const beforeTransforms = new Map(
			before.map((obj) => [obj.id, obj.transform]),
		);
		const moved = after.some(
			(obj) =>
				beforeTransforms.has(obj.id) &&
				beforeTransforms.get(obj.id) !== obj.transform,
		);
		if (moved) {
			await page.keyboard.press("Control+z");
			await pause(200);
		}
		console.log(`  ! ${toolTitle} の描画をリトライ (${attempt + 1}回目)`);
	}
	return false;
}

// 選択中オブジェクトの ObjectMenu からカラーピッカーを開き、CSS カラーを入力して確定
async function setColor(sectionId, cssColor) {
	const toggle = page.locator(`[data-id="object-menu:toggle:${sectionId}"]`);
	try {
		await toggle.click({ timeout: 2000 });
		await page.fill('input[placeholder="CSS color"]', cssColor, {
			timeout: 2000,
		});
		await page.keyboard.press("Enter");
		await pause(60);
	} catch {
		console.log(`  ! ${sectionId} を ${cssColor} に設定できなかった`);
	}
}

// 選択中の線（ポリライン・コネクター）を破線にする
async function setDashed() {
	try {
		await page.click('[data-id="object-menu:toggle:line-style"]', {
			timeout: 2000,
		});
		await page.click('[data-id="object-menu:set:strokeDashType:dashed"]', {
			timeout: 2000,
		});
		await pause(60);
	} catch {
		console.log("  ! 破線に設定できなかった");
	}
}

// 矩形を描き、色・テキストを設定する。描画直後は自動的に選択状態になる
async function drawRect(rectDoc) {
	const tl = toScreen(rectDoc.x, rectDoc.y);
	const br = toScreen(rectDoc.x + rectDoc.width, rectDoc.y + rectDoc.height);
	const drawn = await drawShape("Rectangle", tl.x, tl.y, br.x, br.y);
	if (!drawn) {
		console.log(`  ! ${rectDoc.id} を描画できなかった`);
		return;
	}

	if (rectDoc.fill && rectDoc.fill !== DEFAULT_FILL) {
		await setColor("bg-color", rectDoc.fill);
	}
	if (rectDoc.stroke && rectDoc.stroke !== DEFAULT_STROKE) {
		await setColor("stroke-color", rectDoc.stroke);
	}
	if (rectDoc.text && rectDoc.fontColor) {
		await setColor("font-color", rectDoc.fontColor);
	}

	if (rectDoc.text) {
		// 開いたままのカラードロップダウンが図形を覆い、ダブルクリックを
		// 吸ってしまうことがあるため、一度選択解除してメニューを閉じる
		await deselect();
		const center = toScreen(
			rectDoc.x + rectDoc.width / 2,
			rectDoc.y + rectDoc.height / 2,
		);
		let editorOpened = false;
		for (let attempt = 0; attempt < 3 && !editorOpened; attempt++) {
			await page.mouse.dblclick(center.x, center.y);
			try {
				await page.waitForSelector("[data-kind=text-editor]", {
					timeout: 1000,
				});
				editorOpened = true;
			} catch {
				await pause(150);
			}
		}
		if (editorOpened) {
			await page.keyboard.type(rectDoc.text);
		} else {
			console.log(`  ! ${rectDoc.id} のテキストエディタが開かなかった`);
		}
	}
	await deselect();
}

async function drawPolyline(polylineDoc) {
	const from = toScreen(polylineDoc.points[0].x, polylineDoc.points[0].y);
	const last = polylineDoc.points[polylineDoc.points.length - 1];
	const to = toScreen(last.x, last.y);
	const drawn = await drawShape("Polyline", from.x, from.y, to.x, to.y);
	if (!drawn) {
		console.log(`  ! ${polylineDoc.id} を描画できなかった`);
		return;
	}

	if (polylineDoc.stroke) {
		await setColor("line-color", polylineDoc.stroke);
	}
	if (polylineDoc.strokeDashType === "dashed") {
		await setDashed();
	}
	await deselect();
}

// 図形の connectPoint（辺の中点）のドキュメント座標を算出
function calcConnectPoint(rectDoc, anchorId) {
	const cx = rectDoc.x + rectDoc.width / 2;
	const cy = rectDoc.y + rectDoc.height / 2;
	switch (anchorId) {
		case "topCenter":
			return { x: cx, y: rectDoc.y };
		case "bottomCenter":
			return { x: cx, y: rectDoc.y + rectDoc.height };
		case "leftCenter":
			return { x: rectDoc.x, y: cy };
		case "rightCenter":
			return { x: rectDoc.x + rectDoc.width, y: cy };
		default:
			return { x: cx, y: cy };
	}
}

// 選択中の図形に表示される接続アンカー（指定の辺）の画面座標を取得
async function findCreateAnchor(anchorId) {
	return page.evaluate((suffix) => {
		const el = [...document.querySelectorAll("[data-kind=control]")].find(
			(e) => {
				const id = e.getAttribute("data-id") ?? "";
				return id.startsWith("connection-anchor:create") && id.endsWith(suffix);
			},
		);
		if (!el) {
			return null;
		}
		const r = el.getBoundingClientRect();
		return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
	}, `:${anchorId}`);
}

// 既知 ID に含まれない新しいコネクターを探し、各セグメント中点の画面座標を返す
async function findNewConnector(knownIds) {
	return page.evaluate((known) => {
		const els = [...document.querySelectorAll("polyline[data-kind=connector]")];
		const el = els.find((e) => !known.includes(e.getAttribute("data-id")));
		if (!el) {
			return null;
		}
		const nums = (el.getAttribute("points") ?? "")
			.trim()
			.split(/[\s,]+/)
			.map(Number);
		const pts = [];
		for (let i = 0; i + 1 < nums.length; i += 2) {
			pts.push({ x: nums[i], y: nums[i + 1] });
		}
		const ctm = el.getScreenCTM();
		const midpoints = [];
		for (let i = 0; i + 1 < pts.length; i++) {
			const mid = new DOMPoint(
				(pts[i].x + pts[i + 1].x) / 2,
				(pts[i].y + pts[i + 1].y) / 2,
			).matrixTransform(ctm);
			midpoints.push({ x: mid.x, y: mid.y });
		}
		// 中央のセグメントから順にクリック候補とする
		const centerIndex = (midpoints.length - 1) / 2;
		const ordered = midpoints
			.map((mid, i) => ({ mid, distance: Math.abs(i - centerIndex) }))
			.sort((a, b) => a.distance - b.distance)
			.map((entry) => entry.mid);
		return { id: el.getAttribute("data-id"), midpoints: ordered };
	}, knownIds);
}

// コネクターの線上をクリックして選択する。成功すれば line-color メニューが現れる
async function selectConnector(midpoints) {
	for (const mid of midpoints) {
		await page.mouse.click(mid.x, mid.y);
		await pause(120);
		const selected = await page.evaluate(
			() =>
				!!document.querySelector('[data-id="object-menu:toggle:line-color"]'),
		);
		if (selected) {
			return true;
		}
	}
	return false;
}

const rectsById = new Map();
for (const obj of doc.root) {
	if (obj.type === "rect") {
		rectsById.set(obj.id, obj);
	}
}

// --- 図形を z 順（ドキュメント順）に描画 ---
console.log(`図形 ${doc.root.length} 個を描画`);
for (const obj of doc.root) {
	if (obj.type === "rect") {
		await drawRect(obj);
	} else if (obj.type === "polyline") {
		await drawPolyline(obj);
	}
	console.log(`  + ${obj.type} ${obj.id}`);
	await logViewBoxIfChanged(obj.id);
	await logObjectDriftIfAny(obj.id);
}

// --- コネクターを接続してスタイル設定 ---
console.log(`コネクター ${doc.connectors.length} 本を接続`);
const knownConnectorIds = [];
for (const connector of doc.connectors) {
	const srcRect = rectsById.get(connector.source.owner.id);
	const tgtRect = rectsById.get(connector.target.owner.id);
	if (!srcRect || !tgtRect) {
		console.log(`  - skip ${connector.id}（図形が見つからない）`);
		continue;
	}
	// 接続元を選択してアンカーを表示し、ドラッグでコネクターを作成。
	// クリックやドラッグが誤認識されることがあるため、作成を検証してリトライする
	const srcCenter = toScreen(
		srcRect.x + srcRect.width / 2,
		srcRect.y + srcRect.height / 2,
	);
	const dropDoc = calcConnectPoint(tgtRect, connector.target.anchor.id);
	const drop = toScreen(dropDoc.x, dropDoc.y);
	let created = null;
	for (let attempt = 0; attempt < 3 && !created; attempt++) {
		await page.mouse.click(srcCenter.x, srcCenter.y);
		await pause(300);
		const anchor = await findCreateAnchor(connector.source.anchor.id);
		if (!anchor) {
			console.log(`  ! ${connector.id} のアンカーが見つからずリトライ`);
			await deselect();
			continue;
		}
		await drag(anchor.x, anchor.y, drop.x, drop.y, 10);
		await pause();
		created = await findNewConnector(knownConnectorIds);
		if (!created) {
			console.log(`  ! ${connector.id} が作成されずリトライ`);
			await deselect();
		}
	}
	if (!created) {
		console.log(`  - skip ${connector.id}（作成できなかった）`);
		continue;
	}

	// 作成したコネクターを選択し直して色・線種を設定
	knownConnectorIds.push(created.id);
	const selected = await selectConnector(created.midpoints);
	if (selected) {
		if (connector.stroke) {
			await setColor("line-color", connector.stroke);
		}
		if (connector.strokeDashType === "dashed") {
			await setDashed();
		}
		await deselect();
	} else {
		console.log(`  ! ${connector.id} を選択できず色設定をスキップ`);
	}
	console.log(`  + ${connector.id}`);
	await logViewBoxIfChanged(connector.id);
	await logObjectDriftIfAny(connector.id);
}

await deselect();

// --- テキストが全部入ったか検証 ---
const expectedTexts = doc.root
	.filter((obj) => obj.type === "rect" && obj.text)
	.map((obj) => ({ id: obj.id, firstLine: obj.text.split("\n")[0] }));
const bodyText = await page.evaluate(() => document.body.textContent ?? "");
const missingTexts = expectedTexts.filter(
	(entry) => !bodyText.includes(entry.firstLine),
);
if (missingTexts.length) {
	console.log(
		`テキスト未反映: ${missingTexts.map((entry) => entry.id).join(", ")}`,
	);
} else {
	console.log(`テキスト ${expectedTexts.length} 件すべて反映を確認`);
}

await page.screenshot({ path: "/tmp/hero-showcase-replay.png" });
console.log("再現完了。10秒後にブラウザを閉じます。");
await page.waitForTimeout(10000);
await browser.close();
