import { chromium } from "@playwright/test";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto("http://localhost:5174/", { waitUntil: "networkidle" });
await page.waitForTimeout(600);

// transform="matrix(a,b,c,d,e,f)" の e,f（=位置）を持つ図形を一覧化する
function snapshot() {
	return page.evaluate(() => {
		const svgs = [...document.querySelectorAll("svg")];
		let canvas = null,
			best = 0;
		for (const s of svgs) {
			const r = s.getBoundingClientRect();
			if (r.width * r.height > best) {
				best = r.width * r.height;
				canvas = s;
			}
		}
		const out = [];
		for (const el of canvas.querySelectorAll("rect,ellipse,polygon,path")) {
			const t = el.getAttribute("transform");
			const m = t && t.match(/matrix\(([^)]+)\)/);
			if (!m) continue;
			const n = m[1].split(",").map(Number);
			out.push({
				tag: el.tagName,
				fill: getComputedStyle(el).fill,
				e: Math.round(n[4]),
				f: Math.round(n[5]),
			});
		}
		return out;
	});
}

const before = await snapshot();
await page.screenshot({ path: "/tmp/drag-before.png" });

// 対象: オレンジの楕円 (e≈150, f≈400)。左側の独立した図形。
const startX = 150,
	startY = 400;
const endX = 1050,
	endY = 650;

// 図形上で mousedown → 段階的に move → up（選択+ドラッグを一連で再現）
await page.mouse.move(startX, startY);
await page.mouse.down();
await page.mouse.move((startX + endX) / 2, (startY + endY) / 2, { steps: 10 });
await page.mouse.move(endX, endY, { steps: 10 });
await page.mouse.up();
await page.waitForTimeout(300);
await page.screenshot({ path: "/tmp/drag-after.png" });

const after = await snapshot();
await browser.close();

// before/after を突き合わせ、位置が変わった図形を検出
function key(s) {
	return `${s.tag}|${s.fill}`;
}
const moved = [];
const usedAfter = new Set();
for (const b of before) {
	// 同種(tag+fill)で最も近い after を対応付け
	let bestIdx = -1,
		bestDist = Infinity;
	after.forEach((a, i) => {
		if (usedAfter.has(i) || key(a) !== key(b)) return;
		const d = Math.abs(a.e - b.e) + Math.abs(a.f - b.f);
		if (d < bestDist) {
			bestDist = d;
			bestIdx = i;
		}
	});
	if (bestIdx >= 0) {
		usedAfter.add(bestIdx);
		const a = after[bestIdx];
		if (a.e !== b.e || a.f !== b.f) {
			moved.push({
				tag: b.tag,
				fill: b.fill,
				from: [b.e, b.f],
				to: [a.e, a.f],
			});
		}
	}
}

console.log("=== pageerrors:", errors.length, "===");
if (errors.length) console.log(errors.join("\n"));
console.log("=== shapes total:", before.length, "===");
console.log(
	"=== drag gesture: (" +
		startX +
		"," +
		startY +
		") -> (" +
		endX +
		"," +
		endY +
		") ===",
);
console.log("=== MOVED shapes (" + moved.length + ") ===");
console.log(JSON.stringify(moved, null, 2));
