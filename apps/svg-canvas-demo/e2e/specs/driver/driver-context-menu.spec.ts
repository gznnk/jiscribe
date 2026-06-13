import { test, expect } from "../../fixtures";

/**
 * CanvasDriver のコンテキストメニュー操作の動作確認。
 */
test.describe("ドライバ動作確認: コンテキストメニュー", () => {
	test("図形を右クリックするとコンテキストメニューが開く", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });

		await canvas.openContextMenu({ x: 500, y: 260 });

		expect(await canvas.contextMenuVisible()).toBe(true);
	});

	test("command 項目（複製）でオブジェクトが増え、メニューが閉じる", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });
		const before = (await canvas.captureObjects()).length;

		await canvas.openContextMenu({ x: 500, y: 260 });
		await canvas.clickContextMenuCommand("duplicate");

		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(before + 1);
		await expect.poll(() => canvas.contextMenuVisible()).toBe(false);
	});

	// callback 項目（paste）はジェスチャーではなく React の onClick で動くが、
	// PASTE が走ると handlePaste が contextMenuPosition を null にするためメニューは閉じる。
	// copy→paste でオブジェクトが増え、かつメニューが閉じることを確認する。
	test("callback 項目（paste）でオブジェクトが増え、メニューが閉じる", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });

		// まず copy でクリップボードに載せる（command 経路、メニューは閉じる）
		await canvas.openContextMenu({ x: 500, y: 260 });
		await canvas.clickContextMenuCommand("copy");
		const afterCopy = (await canvas.captureObjects()).length;

		// 次に paste（callback 経路）
		await canvas.openContextMenu({ x: 500, y: 260 });
		await canvas.clickContextMenuItem("paste");

		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(afterCopy + 1);
		await expect.poll(() => canvas.contextMenuVisible()).toBe(false);
	});

	test("メニュー外をクリックすると閉じる", async ({ canvas }) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });

		await canvas.openContextMenu({ x: 500, y: 260 });
		expect(await canvas.contextMenuVisible()).toBe(true);

		await canvas.deselect();

		await expect.poll(() => canvas.contextMenuVisible()).toBe(false);
	});
});
