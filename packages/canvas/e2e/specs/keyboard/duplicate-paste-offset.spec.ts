import { test, expect } from "../../fixtures";

/**
 * 複製 / 貼り付けの「配置位置」の検証。
 *
 * 既存の clipboard.spec はオブジェクト数の増減しか見ておらず、複製/貼り付けが
 * 元の真上に重なってしまう回帰（ユーザーには増えたことが分からない）を検出できない。
 * ここでは既定オフセット（+20,+20）と、複製の move-aware オフセット（Figma 方式:
 * 直前の複製を動かすと、その移動量が次の複製オフセットになる）を守る。
 *
 * 位置は transform="matrix(1, 0, 0, 1, e, f)"（e,f＝中心）で検証する。
 */

/** いま存在する全図形の中心 transform 文字列の一覧 */
async function transforms(canvas: {
	captureObjects: () => Promise<{ transform: string | null }[]>;
}): Promise<(string | null)[]> {
	return (await canvas.captureObjects()).map((o) => o.transform);
}

test.describe("複製 / 貼り付けの配置位置", () => {
	test("複製は +20,+20 ずらして配置し、元図形はそのまま残る", async ({
		canvas,
	}) => {
		// 中心 (500,260) の矩形
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });

		await canvas.duplicate();

		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(2);

		const list = await transforms(canvas);
		// 元はそのまま、複製は +20,+20
		expect(list).toContain("matrix(1, 0, 0, 1, 500, 260)");
		expect(list).toContain("matrix(1, 0, 0, 1, 520, 280)");
	});

	test("貼り付けは +20,+20 ずらして配置する", async ({ canvas }) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });

		await canvas.copy();
		await canvas.paste();

		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(2);

		const list = await transforms(canvas);
		expect(list).toContain("matrix(1, 0, 0, 1, 500, 260)");
		expect(list).toContain("matrix(1, 0, 0, 1, 520, 280)");
	});

	test("複製の move-aware オフセット: 複製を動かすと次の複製は同じ移動量で続く", async ({
		canvas,
	}) => {
		// 中心 (500,260) の矩形
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });

		// 1回目の複製 → (520,280) に作られ、複製が選択される
		await canvas.duplicate();
		await expect
			.poll(() => transforms(canvas))
			.toContain("matrix(1, 0, 0, 1, 520, 280)");

		// 複製を (520,280) → (620,280) へ移動（+100,0）
		await canvas.drag({ x: 520, y: 280 }, { x: 620, y: 280 });
		await expect
			.poll(() => transforms(canvas))
			.toContain("matrix(1, 0, 0, 1, 620, 280)");

		// 2回目の複製 → 直前の移動量 (+100,0) がオフセットになり (720,280) に作られる
		await canvas.duplicate();

		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(3);
		const list = await transforms(canvas);
		expect(list).toContain("matrix(1, 0, 0, 1, 500, 260)"); // 元
		expect(list).toContain("matrix(1, 0, 0, 1, 620, 280)"); // 移動した1回目の複製
		expect(list).toContain("matrix(1, 0, 0, 1, 720, 280)"); // move-aware な2回目の複製
	});
});
