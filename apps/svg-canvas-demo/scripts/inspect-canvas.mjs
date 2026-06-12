import { chromium } from "@playwright/test";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://localhost:5174/", { waitUntil: "networkidle" });
await page.waitForTimeout(600);

const data = await page.evaluate(() => {
	// 画面上で最も面積が大きい svg をメインキャンバスとみなす
	const svgs = [...document.querySelectorAll("svg")];
	let canvas = null,
		best = 0;
	for (const s of svgs) {
		const r = s.getBoundingClientRect();
		const area = r.width * r.height;
		if (area > best) {
			best = area;
			canvas = s;
		}
	}
	const cr = canvas.getBoundingClientRect();
	const shapes = [];
	for (const el of canvas.querySelectorAll(
		"rect,ellipse,circle,polygon,path,line",
	)) {
		const r = el.getBoundingClientRect();
		if (r.width < 8 || r.height < 8) continue; // ハンドル等の極小要素を除外
		const fill = getComputedStyle(el).fill;
		shapes.push({
			tag: el.tagName,
			fill,
			cx: Math.round(r.x + r.width / 2),
			cy: Math.round(r.y + r.height / 2),
			w: Math.round(r.width),
			h: Math.round(r.height),
			attrs: {
				x: el.getAttribute("x"),
				y: el.getAttribute("y"),
				cx: el.getAttribute("cx"),
				cy: el.getAttribute("cy"),
				transform: el.getAttribute("transform"),
				d: el.getAttribute("d")?.slice(0, 40),
			},
		});
	}
	return {
		canvasRect: { x: cr.x, y: cr.y, w: cr.width, h: cr.height },
		count: shapes.length,
		shapes,
	};
});

await browser.close();
console.log(JSON.stringify(data, null, 2));
