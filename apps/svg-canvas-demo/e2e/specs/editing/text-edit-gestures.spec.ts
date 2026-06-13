import { test, expect } from "../../fixtures";
import { selectors } from "../../support/selectors";

/**
 * manual-test-gesture-attributes.md「1. テキスト編集」の e2e 化。
 * data-gesture（none / native-wheel）によるテキスト編集まわりの回帰を検証する。
 * 確定（1-9）・Escape キャンセル（1-10）は editing/text-edit.spec.ts でカバー済み。
 */
test.describe("テキスト編集のジェスチャー挙動", () => {
	const RECT_FROM = { x: 400, y: 200 };
	const RECT_TO = { x: 600, y: 320 };
	const CENTER = { x: 500, y: 260 };

	// 1-1: 再編集時にキャレットが末尾に置かれフォーカスされる
	test("1-1 編集開始時に textarea がフォーカスされキャレットが末尾になる", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", RECT_FROM, RECT_TO);
		await canvas.deselect();
		await canvas.typeTextAt(CENTER, "Hi");
		await canvas.commitText();

		// 再度開くとフォーカスがあり、キャレットは末尾（長さ 2）
		await canvas.page.mouse.dblclick(CENTER.x, CENTER.y);
		await expect(canvas.page.locator(selectors.textEditor)).toBeVisible();

		expect(await canvas.isTextEditorFocused()).toBe(true);
		expect(await canvas.textEditorSelection()).toEqual({ start: 2, end: 2 });
		await canvas.cancelText();
	});

	// 1-2: 縦アライメント設定が編集中も維持される
	test("1-2 設定した縦アライメントが編集中も維持される", async ({ canvas }) => {
		await canvas.drawShape("Rectangle", RECT_FROM, RECT_TO);
		await canvas.setVerticalAlign("top");
		await canvas.deselect();

		await canvas.typeTextAt(CENTER, "aligned");

		expect(await canvas.textEditorVerticalAlign()).toBe("top");
		await canvas.cancelText();
	});

	// 1-3: テキストをドラッグ選択しても図形が動かない
	test("1-3 textarea 内のドラッグは図形を動かさずテキストを選択する", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape("Rectangle", RECT_FROM, RECT_TO);
		await canvas.deselect();
		await canvas.typeTextAt(CENTER, "HelloWorld");

		const transformBefore = await canvas
			.objectById(id)
			.getAttribute("transform");

		const box = await canvas.textArea().boundingBox();
		if (!box) {
			throw new Error("textarea の位置が取得できない");
		}
		const y = box.y + box.height / 2;
		await canvas.drag({ x: box.x + 6, y }, { x: box.x + box.width - 6, y }, 10);

		// 図形は動いていない
		expect(await canvas.objectById(id).getAttribute("transform")).toBe(
			transformBefore,
		);
		// テキストが選択されている（範囲が空でない）
		const selection = await canvas.textEditorSelection();
		expect(selection).not.toBeNull();
		expect(selection?.start).not.toBe(selection?.end);
		await canvas.cancelText();
	});

	// 1-4: テキスト外の余白クリックでフォーカスが外れない
	test("1-4 編集枠の余白クリックでフォーカスが維持される", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", RECT_FROM, RECT_TO);
		await canvas.setVerticalAlign("top");
		await canvas.deselect();
		await canvas.typeTextAt(CENTER, "x");

		// 上寄せなのでテキストの下（枠内の余白）をクリックする
		await canvas.page.mouse.click(CENTER.x, 305);

		expect(await canvas.page.locator(selectors.textEditor).isVisible()).toBe(
			true,
		);
		expect(await canvas.isTextEditorFocused()).toBe(true);
		await canvas.cancelText();
	});

	// 1-5: あふれた textarea 上のホイールは textarea をスクロールし、キャンバスは動かさない
	test("1-5 あふれた textarea のホイールは textarea をスクロールしキャンバスは動かない", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", RECT_FROM, RECT_TO);
		await canvas.deselect();
		const longText = Array.from({ length: 30 }, (_, i) => `line ${i}`).join(
			"\n",
		);
		await canvas.typeTextAt(CENTER, longText);

		// タイプ直後はキャレット末尾でスクロールは最下部
		const scrollBefore = await canvas.textEditorScrollTop();
		const viewBoxBefore = await canvas.getViewBox();

		await canvas.wheel(CENTER, { deltaY: -400 });

		await expect
			.poll(() => canvas.textEditorScrollTop(), {
				message: "ホイールで textarea がスクロールすること",
			})
			.toBeLessThan(scrollBefore);
		expect(await canvas.getViewBox()).toBe(viewBoxBefore);
		expect(await canvas.page.locator(selectors.textEditor).isVisible()).toBe(
			true,
		);
		await canvas.cancelText();
	});

	// 1-6: あふれない編集中のホイールはキャンバスをスクロールし、編集は継続する
	test("1-6 あふれない編集中のホイールはキャンバスをスクロールし編集は継続する", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", RECT_FROM, RECT_TO);
		await canvas.deselect();
		await canvas.typeTextAt(CENTER, "short");

		const viewBoxBefore = await canvas.getViewBox();
		await canvas.wheel(CENTER, { deltaY: 300 });

		await expect
			.poll(() => canvas.getViewBox(), {
				message: "あふれていないときはキャンバスがスクロールすること",
			})
			.not.toBe(viewBoxBefore);
		expect(await canvas.page.locator(selectors.textEditor).isVisible()).toBe(
			true,
		);
		await canvas.cancelText();
	});

	// 1-7: 編集中の Ctrl+ホイールはキャンバスをズームし、編集は継続する
	test("1-7 編集中の Ctrl+ホイールはキャンバスをズームし編集は継続する", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", RECT_FROM, RECT_TO);
		await canvas.deselect();
		await canvas.typeTextAt(CENTER, "zoom");

		const viewBoxBefore = await canvas.getViewBox();
		await canvas.wheel(CENTER, { deltaY: -200, ctrl: true });

		await expect.poll(() => canvas.getViewBox()).not.toBe(viewBoxBefore);
		expect(await canvas.page.locator(selectors.textEditor).isVisible()).toBe(
			true,
		);
		await canvas.cancelText();
	});

	// 1-8: textarea 上の右クリックは自前メニューを開かない（ネイティブに委譲）
	test("1-8 編集中の右クリックは自前コンテキストメニューを開かない", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", RECT_FROM, RECT_TO);
		await canvas.deselect();
		await canvas.typeTextAt(CENTER, "menu");

		await canvas.page.mouse.click(CENTER.x, CENTER.y, { button: "right" });

		expect(await canvas.contextMenuVisible()).toBe(false);
		expect(await canvas.page.locator(selectors.textEditor).isVisible()).toBe(
			true,
		);
		await canvas.cancelText();
	});
});
