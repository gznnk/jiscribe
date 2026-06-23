import { test, expect } from "../../fixtures";

/**
 * 接続された図形ごとコネクターを切り取り→貼り付けしたときの端点リマップ検証。
 *
 * connector-copy-paste はコピー（handlePaste）と複製（DuplicateCommand）を守るが、
 * 切り取り（Ctrl+X = クリップボードへ載せて即削除）→貼り付けは別フロー。元の図形が
 * 消えているぶん、貼り付けたコネクターの端点が「削除済みの元 ID」を指したまま復活すると、
 * どこにも繋がらず移動に追従しない壊れ方をする。貼り付け後の図形を動かしてコネクターが
 * 追従することで、新しい図形へ正しくリマップされたことを守る。
 */

/** transform="matrix(a,b,c,d,e,f)" から中心座標（e,f）を取り出す */
function centerOf(transform: string | null): { x: number; y: number } {
	const nums = transform?.match(/-?\d+(?:\.\d+)?/g)?.map(Number);
	if (!nums || nums.length < 6) {
		throw new Error(`transform を解釈できない: ${transform}`);
	}
	return { x: nums[4], y: nums[5] };
}

test.describe("接続図形ごとのコネクター切り取り→貼り付け（端点リマップ）", () => {
	test("切り取って貼り付けたコネクターは復活した図形に繋がり、移動に追従する", async ({
		canvas,
	}) => {
		// 上矩形 中心 (500,200) / 下矩形 中心 (500,450) を縦コネクターで接続。
		await canvas.drawShape("Rectangle", { x: 400, y: 150 }, { x: 600, y: 250 });
		await canvas.deselect();
		await canvas.drawShape("Rectangle", { x: 400, y: 400 }, { x: 600, y: 500 });
		await canvas.deselect();
		await canvas.selectAt({ x: 500, y: 200 });
		await canvas.createConnector("bottomCenter", { x: 500, y: 400 });
		await canvas.deselect();

		// 全選択して切り取り → すべて消える。
		await canvas.selectAll();
		await canvas.cut();
		await expect
			.poll(async () => (await canvas.captureObjects()).length, {
				message: "切り取りで図形・コネクターがすべて消えること",
			})
			.toBe(0);

		// 貼り付け → 図形 2・コネクター 1 が復活する。
		await canvas.paste();
		await expect
			.poll(async () => (await canvas.captureObjects()).length, {
				message: "貼り付けで合計 3 が復活すること",
			})
			.toBe(3);

		const objects = await canvas.captureObjects();
		const connector = objects.find((o) => o.tag === "polyline");
		const rects = objects.filter((o) => o.tag === "rect");
		expect(rects.length).toBe(2);
		if (!connector?.id) {
			throw new Error("貼り付けられたコネクターが見つからない");
		}

		// 上側（中心Y が小さい方）の矩形を特定し、その中心から大きく右へ動かす。
		const topRect = rects.reduce((upper, cur) =>
			centerOf(cur.transform).y < centerOf(upper.transform).y ? cur : upper,
		);
		const topCenter = centerOf(topRect.transform);

		const pointsBefore = await canvas
			.objectById(connector.id)
			.getAttribute("points");

		await canvas.deselect();
		await canvas.drag(topCenter, { x: topCenter.x + 250, y: topCenter.y });

		// コネクターが復活した上矩形に繋がっているので、移動に追従して points が変わる。
		await expect
			.poll(() => canvas.objectById(connector.id!).getAttribute("points"), {
				message: "貼り付けたコネクターが復活図形の移動に追従すること",
			})
			.not.toBe(pointsBefore);
	});
});
