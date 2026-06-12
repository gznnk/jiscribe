// ブラウザを表示しながら行う全部入りデモショー。
// ニコちゃん描画 → 回転 → リサイズパルス → コネクター接続 → バウンドボール → フィナーレ。
// 実行: node apps/svg-canvas-demo/scripts/live-show.mjs （http://localhost:5174/ が起動している前提）
import { chromium } from "@playwright/test";

const browser = await chromium.launch({ headless: false, slowMo: 30 });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://localhost:5174/", { waitUntil: "networkidle" });
await page.waitForTimeout(800);

async function pause(ms = 600) {
	await page.waitForTimeout(ms);
}

async function drag(fromX, fromY, toX, toY, steps = 25) {
	await page.mouse.move(fromX, fromY);
	await page.mouse.down();
	await page.mouse.move(toX, toY, { steps });
	await page.mouse.up();
}

// 始点で押下し、点列に沿ってマウスを動かして離す（自由曲線ドラッグ）
async function dragAlong(points) {
	await page.mouse.move(points[0].x, points[0].y);
	await page.mouse.down();
	for (const p of points.slice(1)) {
		await page.mouse.move(p.x, p.y);
	}
	await page.mouse.up();
}

async function drawWith(toolTitle, fromX, fromY, toX, toY) {
	await page.click(`button[title="${toolTitle}"]`);
	await drag(fromX, fromY, toX, toY);
	await pause(300);
}

// 選択中に表示されるコントロールの中心座標を data-id 前方一致で取得
async function findControl(idPrefix) {
	return page.evaluate((prefix) => {
		const el = [...document.querySelectorAll("[data-kind=control]")].find((e) =>
			e.getAttribute("data-id")?.startsWith(prefix),
		);
		if (!el) {
			return null;
		}
		const r = el.getBoundingClientRect();
		return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
	}, idPrefix);
}

// --- Act 1: ニコちゃんマークを描く ---
console.log("Act 1: ニコちゃんマーク");
await drawWith("Ellipse", 520, 180, 920, 560); // 顔
await drawWith("Ellipse", 610, 270, 660, 330); // 左目
await drawWith("Ellipse", 780, 270, 830, 330); // 右目
await drawWith("Ellipse", 640, 430, 800, 480); // 口
await pause(800);

// --- Act 2: 口を回転ハンドルでグルグル回す ---
console.log("Act 2: 回転");
await page.mouse.click(720, 455); // 口を選択
await pause(400);
let rotHandle = await findControl("transform-control:rotation");
if (rotHandle) {
	const cx = 720;
	const cy = 455;
	const radius = Math.hypot(rotHandle.x - cx, rotHandle.y - cy);
	const startAngle = Math.atan2(rotHandle.y - cy, rotHandle.x - cx);
	const spin = [];
	for (let i = 0; i <= 72; i++) {
		const a = startAngle + (i / 72) * Math.PI * 2 * 2; // 2回転
		spin.push({ x: cx + radius * Math.cos(a), y: cy + radius * Math.sin(a) });
	}
	await dragAlong(spin);
}
await pause(800);

// --- Act 3: 顔全体をリサイズで脈打たせる ---
console.log("Act 3: リサイズパルス");
await page.mouse.click(560, 220); // 顔の縁あたりを選択
await pause(400);
let corner = await findControl("transform-control:bottomRight");
if (corner) {
	const beat = [{ x: corner.x, y: corner.y }];
	for (let i = 0; i < 3; i++) {
		beat.push({ x: corner.x + 60, y: corner.y + 60 });
		beat.push({ x: corner.x - 30, y: corner.y - 30 });
	}
	beat.push({ x: corner.x, y: corner.y });
	await dragAlong(beat);
}
await page.mouse.click(200, 800); // 選択解除
await pause(800);

// --- Act 4: 2つの矩形を描いてコネクターで接続 ---
console.log("Act 4: コネクター接続");
await drawWith("Rectangle", 1050, 150, 1250, 250);
await drawWith("Rectangle", 1050, 400, 1250, 500);
await page.mouse.click(1150, 200); // 上の矩形を選択してアンカー表示
await pause(400);
const anchor = await findControl("connection-anchor:create");
if (anchor) {
	const bottomAnchor = await findControl("connection-anchor:create").then(
		async () => {
			// 下辺のアンカー（bottomCenter）を優先して探す
			return page.evaluate(() => {
				const el = [...document.querySelectorAll("[data-kind=control]")].find(
					(e) =>
						e.getAttribute("data-id")?.startsWith("connection-anchor:create") &&
						e.getAttribute("data-id")?.endsWith("bottomCenter"),
				);
				if (!el) {
					return null;
				}
				const r = el.getBoundingClientRect();
				return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
			});
		},
	);
	const from = bottomAnchor ?? anchor;
	await drag(from.x, from.y, 1150, 400, 40); // 下の矩形の上辺へ
}
await page.mouse.click(200, 800);
await pause(800);

// --- Act 5: ボールを描いてバウンドさせる ---
console.log("Act 5: バウンドボール");
await drawWith("Ellipse", 120, 680, 180, 740);
await page.mouse.click(150, 710); // ボールを選択
await pause(300);
const bounce = [];
const floorY = 710;
for (let i = 0; i <= 120; i++) {
	const t = i / 120;
	const x = 150 + t * 1100;
	const height = 320 * (1 - t * 0.75); // 減衰
	const y = floorY - Math.abs(Math.sin(t * Math.PI * 4)) * height;
	bounce.push({ x, y });
}
await dragAlong(bounce);
await pause(800);

// --- Finale: 全部囲んでみんなで円舞 ---
console.log("Finale: 全員で円舞");
await page.mouse.click(80, 850);
await drag(100, 100, 1400, 870, 20); // 全体をマーキー選択
await pause(500);
const dance = [];
const danceCx = 720;
const danceCy = 480;
for (let i = 0; i <= 60; i++) {
	const a = (i / 60) * Math.PI * 2;
	dance.push({
		x: danceCx + 80 * Math.sin(a),
		y: danceCy + 80 * Math.sin(a) * Math.cos(a),
	});
}
await dragAlong(dance);
await pause(2000);

console.log("ショー終了。5秒後にブラウザを閉じます。");
await pause(5000);
await browser.close();
