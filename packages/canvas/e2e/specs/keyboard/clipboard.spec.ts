import { test, expect } from "../../fixtures";

/**
 * キーボードによるクリップボード操作。
 * - Duplicate(Ctrl+D) はクリップボードを介さない
 * - Copy/Cut/Paste は内部クリップボードでラウンドトリップする
 *   （OS クリップボード読み取りが失敗しても internalClipboard にフォールバックする）
 */
test.describe("キーボード: クリップボード", () => {
	test("Ctrl+D で選択図形を複製する", async ({ canvas }) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });
		const before = (await canvas.captureObjects()).length;

		await canvas.duplicate();

		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(before + 1);
	});

	test("Ctrl+C → Ctrl+V でコピー＆ペーストするとオブジェクトが増える", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });
		const before = (await canvas.captureObjects()).length;

		await canvas.copy();
		await canvas.paste();

		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(before + 1);
	});

	test("Ctrl+X で消え、Ctrl+V で戻る（切り取り→貼り付け）", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });

		await canvas.cut();
		// 切り取りは即座に削除する
		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(0);

		await canvas.paste();
		// 貼り付けで復活する
		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(1);
	});

	test("Ctrl+V の後 Undo で複製が消え、Redo で戻る", async ({ canvas }) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });
		const before = (await canvas.captureObjects()).length;

		await canvas.copy();
		await canvas.paste();
		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(before + 1);

		// ペーストは履歴に積まれるので、undo で複製だけが消える（元図形は残る）。
		await canvas.undo();
		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(before);

		await canvas.redo();
		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(before + 1);
	});

	test("Ctrl+D の後 Undo で複製が消え、Redo で戻る", async ({ canvas }) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });
		const before = (await canvas.captureObjects()).length;

		await canvas.duplicate();
		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(before + 1);

		await canvas.undo();
		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(before);

		await canvas.redo();
		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(before + 1);
	});
});
