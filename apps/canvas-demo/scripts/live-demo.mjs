// ブラウザを実際に表示しながら、図形の追加・移動などを実演するデモ。
// 実行: node apps/canvas-demo/scripts/live-demo.mjs （http://localhost:5174/ が起動している前提）
import { chromium } from "@playwright/test";

const browser = await chromium.launch({
	headless: false,
	slowMo: 50, // 各操作の間を空けて目で追えるようにする
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://localhost:5174/", { waitUntil: "networkidle" });
await page.waitForTimeout(1000);

// マウスをゆっくり動かしてドラッグする（steps を多めにして軌跡を見せる）
async function drag(fromX, fromY, toX, toY, steps = 40) {
	await page.mouse.move(fromX, fromY);
	await page.mouse.down();
	await page.mouse.move(toX, toY, { steps });
	await page.mouse.up();
}

async function pause(ms = 800) {
	await page.waitForTimeout(ms);
}

// --- 1. 矩形ツールで新しい矩形を描く ---
console.log("1. Rectangle ツールで矩形を追加");
await page.click('button[title="Rectangle"]');
await pause(400);
await drag(500, 200, 700, 320);
await pause();

// --- 2. 楕円ツールで楕円を描く ---
console.log("2. Ellipse ツールで楕円を追加");
await page.click('button[title="Ellipse"]');
await pause(400);
await drag(800, 200, 980, 330);
await pause();

// --- 3. 描いた矩形をドラッグで移動 ---
console.log("3. 矩形をドラッグで移動");
await page.mouse.click(600, 260); // 選択
await pause(400);
await drag(600, 260, 600, 550);
await pause();

// --- 4. 楕円もドラッグで移動 ---
console.log("4. 楕円をドラッグで移動");
await page.mouse.click(890, 265);
await pause(400);
await drag(890, 265, 1100, 550);
await pause();

// --- 5. 範囲選択（マーキー）で2つまとめて選択して移動 ---
console.log("5. 範囲選択して2つまとめて移動");
await page.mouse.click(300, 750); // いったん選択解除
await pause(400);
await drag(420, 430, 1250, 700, 30); // 空白から囲んで選択
await pause(600);
await drag(700, 560, 550, 350); // まとめてドラッグ
await pause();

// --- 6. Sticky（付箋）を追加 ---
console.log("6. Sticky を追加");
await page.click('button[title="Sticky"]');
await pause(400);
await drag(950, 600, 1150, 750);
await pause(1500);

console.log("デモ完了。5秒後にブラウザを閉じます。");
await pause(5000);
await browser.close();
