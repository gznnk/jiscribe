import { test, expect } from "../../fixtures";

/**
 * CanvasDriver の入力プリミティブ（wheel / rightDrag / コントロール可視判定）の
 * 動作確認。プロダクトの仕様ではなくドライバ API 自体を検証する。
 */
test.describe("ドライバ動作確認: 入力プリミティブ", () => {
	test("wheel でキャンバスがスクロールする（viewBox が変わる）", async ({
		canvas,
	}) => {
		const before = await canvas.getViewBox();

		await canvas.wheel({ x: 700, y: 450 }, { deltaY: 200 });

		await expect
			.poll(() => canvas.getViewBox(), {
				message: "wheel 後に viewBox が変化すること",
			})
			.not.toBe(before);
	});

	test("ctrl+wheel でキャンバスがズームする（viewBox が変わる）", async ({
		canvas,
	}) => {
		const before = await canvas.getViewBox();

		await canvas.wheel({ x: 700, y: 450 }, { deltaY: -200, ctrl: true });

		await expect.poll(() => canvas.getViewBox()).not.toBe(before);
	});

	test("rightDrag でビューポートがパンする（viewBox が変わる）", async ({
		canvas,
	}) => {
		const before = await canvas.getViewBox();

		await canvas.rightDrag({ x: 700, y: 450 }, { x: 500, y: 350 });

		await expect.poll(() => canvas.getViewBox()).not.toBe(before);
	});

	test("描画直後は変形コントロールが表示される", async ({ canvas }) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });

		const ids = await canvas.visibleControlIds();
		expect(ids).toContain("transform/resize:bottomRight");
		expect(ids).toContain("transform/rotation");
		expect(await canvas.isControlVisible("transform/resize:topLeft")).toBe(
			true,
		);
		expect(await canvas.hasAnyControl()).toBe(true);
	});

	test("選択解除でコントロールが消える", async ({ canvas }) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });
		await canvas.deselect();

		expect(await canvas.visibleControlIds()).toEqual([]);
		expect(await canvas.hasAnyControl()).toBe(false);
	});
});
