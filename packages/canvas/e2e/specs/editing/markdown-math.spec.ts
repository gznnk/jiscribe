import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Markdown 内の数式（KaTeX）描画を守る。
 *
 * renderMarkdown は `$...$`（インライン）/ `$$...$$`（ブロック）を KaTeX で描画し、
 * `.katex` / `.katex-display` 要素を生成する。この数式パイプラインは e2e 未カバーだったため、
 * 編集で数式を入力し、生テキストではなく KaTeX 要素として描画されることを守る。
 */

/** Markdown 図形の TextOverlay 内で、セレクタにマッチする要素数を返す */
async function renderedCount(
	canvas: CanvasDriver,
	id: string,
	selector: string,
): Promise<number> {
	return canvas.page.evaluate(
		({ targetId, sel }) => {
			const shape = document.querySelector(`[data-id="${targetId}"]`);
			let foreignObject: Element | null =
				shape?.querySelector("foreignObject") ?? null;
			if (!foreignObject) {
				let sibling = shape?.nextElementSibling ?? null;
				while (sibling && sibling.tagName.toLowerCase() !== "foreignobject") {
					sibling = sibling.nextElementSibling;
				}
				foreignObject = sibling;
			}
			const textDiv = foreignObject?.firstElementChild?.firstElementChild;
			return textDiv ? textDiv.querySelectorAll(sel).length : 0;
		},
		{ targetId: id, sel: selector },
	);
}

/** Markdown 図形を描き、本文を replacement に置き換えて id を返す */
async function drawMarkdownWith(
	canvas: CanvasDriver,
	replacement: string,
): Promise<string> {
	const id = await canvas.drawShape(
		"Markdown",
		{ x: 360, y: 180 },
		{ x: 720, y: 420 },
	);
	await canvas.deselect();

	const center = canvas.toScreen({ x: 540, y: 300 });
	await canvas.page.mouse.dblclick(center.x, center.y);
	await canvas.waitForTextEditor();
	await canvas.page.keyboard.press("Control+a");
	await canvas.page.keyboard.type(replacement);
	await canvas.commitText();
	return id;
}

test.describe("Markdown の数式（KaTeX）描画", () => {
	test("インライン数式 $...$ は KaTeX 要素として描画される", async ({
		canvas,
	}) => {
		const id = await drawMarkdownWith(canvas, "Mass energy: $E=mc^2$");

		await expect
			.poll(() => renderedCount(canvas, id, ".katex"))
			.toBeGreaterThan(0);
		// 通常テキストの段落も併存する（インライン混在）。
		expect(await renderedCount(canvas, id, "p")).toBeGreaterThan(0);
	});

	test("ブロック数式 $$...$$ は KaTeX ブロックとして描画される", async ({
		canvas,
	}) => {
		const id = await drawMarkdownWith(canvas, "$$\n\\sqrt{2}\n$$");

		await expect
			.poll(() => renderedCount(canvas, id, ".katex-display"))
			.toBeGreaterThan(0);
	});
});
