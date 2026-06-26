import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * 非等倍 viewBox（ズーム中）でのナッジ（矢印キー移動）が、画面スケールに依らず
 * 常に world 座標で一定量（1px / Shift で 10px）動くことの検証。
 *
 * drag/resize/marquee-under-zoom は「screen→world の割り戻しを忘れていないか」を守る
 * （= ズームで挙動が変わってはいけない操作たち）。ナッジはその逆で、もともと world 量で
 * 定義された移動（MoveCommands の NUDGE_STEP=1 / NUDGE_STEP_LARGE=10 は「キャンバス座標 px」）
 * なので、ズームしてもスケールを掛けてはいけない。誰かがナッジを「画面 px」基準に
 * “補正”してしまうと、ズーム中だけ移動量が scale 倍にズレる退行が起きる。ここを固める。
 *
 * 図形の transform 属性は SVG user 単位（= world 座標）で、viewBox（ズーム/パン）には
 * 依存しない。よってズーム下でもナッジ後の transform は zoom=1 と同じ整数値になる。
 * 既存 nudge.spec が zoom=1 でこれを守るのに対し、こちらはズームインした状態で
 * 「移動量が scale 倍にならない」ことまで踏み込む。
 */

/** ズーム倍率（画面 1px が表す world 長 = viewBox 幅 ÷ SVG 画面幅）。zoom=1 で 1、ズームインで <1 */
async function worldPerScreenPixel(canvas: CanvasDriver): Promise<number> {
	const raw = await canvas.getViewBox();
	if (!raw) {
		throw new Error("viewBox が取得できない");
	}
	const vbWidth = Number(raw.trim().split(/\s+/)[2]);
	const svgScreenWidth = await canvas.page.evaluate(() => {
		const svgs = [...document.querySelectorAll("svg")];
		let best = 0;
		let width = 0;
		for (const svg of svgs) {
			const rect = svg.getBoundingClientRect();
			const area = rect.width * rect.height;
			if (area > best) {
				best = area;
				width = rect.width;
			}
		}
		return width;
	});
	return vbWidth / svgScreenWidth;
}

test.describe("ズーム下でのナッジ", () => {
	test("ズームインしてもナッジは world 座標で 1px / Shift で 10px 動く", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);
		const rect = canvas.objectById(id);
		// 中心は (500, 260)。world 座標なので以降ズームしても基準は不変。
		expect(await rect.getAttribute("transform")).toBe(
			"matrix(1, 0, 0, 1, 500, 260)",
		);

		// 図形中心を基点にズームイン（中心の画面位置は不動）。
		const box0 = await rect.boundingBox();
		if (!box0) {
			throw new Error("図形の boundingBox が取得できない");
		}
		const center = canvas.toContent({
			x: box0.x + box0.width / 2,
			y: box0.y + box0.height / 2,
		});
		await canvas.wheel(center, { deltaY: -200, ctrl: true });
		await expect
			.poll(async () => (await rect.boundingBox())?.width ?? 0, {
				message: "ズームインで図形が画面上で拡大すること",
			})
			.toBeGreaterThan(box0.width + 1);

		// ズームが効いていること（scale<1）を先に固める。これが満たされないと
		// テストが zoom=1 と区別できず「scale 倍にならない」検証が無意味になる。
		const scale = await worldPerScreenPixel(canvas);
		expect(scale).toBeLessThan(1);

		// ズームは viewBox を変えるだけ。図形の world transform は不動のまま。
		expect(await rect.getAttribute("transform")).toBe(
			"matrix(1, 0, 0, 1, 500, 260)",
		);

		// 通常ナッジは world で 1px。scale を掛けていれば 1 未満になりここで落ちる。
		await canvas.nudge("right");
		await expect
			.poll(() => rect.getAttribute("transform"), {
				message: "ズーム中でも右ナッジは world で +1px",
			})
			.toBe("matrix(1, 0, 0, 1, 501, 260)");

		await canvas.nudge("down");
		await expect
			.poll(() => rect.getAttribute("transform"), {
				message: "ズーム中でも下ナッジは world で +1px",
			})
			.toBe("matrix(1, 0, 0, 1, 501, 261)");

		// Shift 併用は world で 10px。
		await canvas.nudge("left", { large: true });
		await expect
			.poll(() => rect.getAttribute("transform"), {
				message: "ズーム中でも Shift+左ナッジは world で -10px",
			})
			.toBe("matrix(1, 0, 0, 1, 491, 261)");

		await canvas.nudge("up", { large: true });
		await expect
			.poll(() => rect.getAttribute("transform"), {
				message: "ズーム中でも Shift+上ナッジは world で -10px",
			})
			.toBe("matrix(1, 0, 0, 1, 491, 251)");
	});
});
