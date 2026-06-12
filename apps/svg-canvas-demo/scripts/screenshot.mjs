// 任意の URL を Chromium で開いて PNG に保存する開発用スクリプト。
// 使い方:
//   node apps/svg-canvas-demo/scripts/screenshot.mjs <url> <out.png> [options]
// オプション:
//   --width=1440     ビューポート幅（既定 1440）
//   --height=900     ビューポート高さ（既定 900）
//   --full           ページ全体をキャプチャ（縦に長いLPなどに）
//   --selector=.sel  指定要素だけをキャプチャ
//   --scale=2        deviceScaleFactor（高解像度化、既定 2）
//   --wait=300       描画待ちの追加ミリ秒（既定 300）
//
// 例:
//   node apps/svg-canvas-demo/scripts/screenshot.mjs http://localhost:5173 /tmp/landing.png --full
//   node apps/svg-canvas-demo/scripts/screenshot.mjs http://localhost:5173 /tmp/hero.png --selector=.hero

import { chromium } from "@playwright/test";

function parseArgs(argv) {
	const positional = [];
	const options = {};
	for (const arg of argv) {
		if (arg.startsWith("--")) {
			const [key, value] = arg.slice(2).split("=");
			options[key] = value === undefined ? true : value;
		} else {
			positional.push(arg);
		}
	}
	return { positional, options };
}

const { positional, options } = parseArgs(process.argv.slice(2));
const [url, out] = positional;

if (!url || !out) {
	console.error(
		"Usage: node apps/svg-canvas-demo/scripts/screenshot.mjs <url> <out.png> [--full] [--selector=.sel] [--width=] [--height=] [--scale=] [--wait=]",
	);
	process.exit(1);
}

const width = Number(options.width ?? 1440);
const height = Number(options.height ?? 900);
const scale = Number(options.scale ?? 2);
const waitMs = Number(options.wait ?? 300);

const browser = await chromium.launch();
const page = await browser.newPage({
	viewport: { width, height },
	deviceScaleFactor: scale,
});

await page.goto(url, { waitUntil: "networkidle" });
// フォント読み込みとアニメーション開始を待つ
await page.waitForTimeout(waitMs);

if (options.selector) {
	const element = page.locator(String(options.selector)).first();
	await element.screenshot({ path: out });
} else {
	await page.screenshot({ path: out, fullPage: Boolean(options.full) });
}

await browser.close();
console.log(
	`saved: ${out} (${width}x${height} @${scale}x${options.full ? " full" : ""})`,
);
