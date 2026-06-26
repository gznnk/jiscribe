import { test, expect } from "../../fixtures";

/**
 * 楕円（Ellipse）の描画ジオメトリを精密に守る。
 *
 * draw.spec は「ellipse 要素ができる」までで、寸法（rx/ry）や中心は未検証だった。
 * 実装（Ellipse.tsx）は中心原点で描く: cx=0, cy=0, rx=width/2, ry=height/2、中心は
 * transform の (e,f) に出す。描画矩形から rx/ry と中心がちょうど決まることを固める。
 * rx↔ry の取り違えや中心ずれ（cx/cy に中心を入れてしまう等）は要素タグの検証では捕まらない。
 *
 * zoom=1 なので描画座標＝world 座標。(400,200)-(600,320) は 幅200×高120・中心(500,260)。
 */
test.describe("楕円の描画ジオメトリ", () => {
	test("描画矩形から rx=幅/2・ry=高/2・中心=transform(e,f) がちょうど決まる", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Ellipse",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);
		const ellipse = canvas.objectById(id);

		// 中心原点で描くので楕円要素自身の cx/cy は 0。
		expect(await ellipse.getAttribute("cx")).toBe("0");
		expect(await ellipse.getAttribute("cy")).toBe("0");
		// rx = 幅/2 = 100、ry = 高/2 = 60。
		expect(await ellipse.getAttribute("rx")).toBe("100");
		expect(await ellipse.getAttribute("ry")).toBe("60");
		// 中心は transform の (e,f) = (500,260)。無回転・無反転の単位行列。
		expect(await ellipse.getAttribute("transform")).toBe(
			"matrix(1, 0, 0, 1, 500, 260)",
		);
	});

	test("縦長の描画矩形では rx<ry になる（rx/ry の取り違えを弾く）", async ({
		canvas,
	}) => {
		// 幅120×高200 の縦長。rx=60 < ry=100 になるはず。
		const id = await canvas.drawShape(
			"Ellipse",
			{ x: 440, y: 160 },
			{ x: 560, y: 360 },
		);
		const ellipse = canvas.objectById(id);

		expect(await ellipse.getAttribute("rx")).toBe("60");
		expect(await ellipse.getAttribute("ry")).toBe("100");
		// 中心 (500,260)。
		expect(await ellipse.getAttribute("transform")).toBe(
			"matrix(1, 0, 0, 1, 500, 260)",
		);
	});
});
