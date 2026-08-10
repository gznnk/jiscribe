import type { CanvasDriver } from "@jiscribe/canvas-sdk/testing/e2e";
import { test, expect } from "@jiscribe/canvas-sdk/testing/e2e";

/**
 * Guards the rendering of math (KaTeX) inside Markdown.
 *
 * renderMarkdown renders `$...$` (inline) / `$$...$$` (block) with KaTeX and
 * produces `.katex` / `.katex-display` elements. This math pipeline was
 * uncovered by e2e, so these tests type math while editing and guard that it is
 * rendered as KaTeX elements rather than as raw text.
 */

/** Number of elements matching the selector inside a Markdown shape's TextOverlay. */
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

/** Draws a Markdown shape, replaces its body with `replacement`, and returns its id. */
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

test.describe("Markdown math (KaTeX) rendering", () => {
	test("renders inline math $...$ as KaTeX elements", async ({ canvas }) => {
		const id = await drawMarkdownWith(canvas, "Mass energy: $E=mc^2$");

		await expect
			.poll(() => renderedCount(canvas, id, ".katex"))
			.toBeGreaterThan(0);
		// A normal text paragraph coexists with it (inline mix).
		expect(await renderedCount(canvas, id, "p")).toBeGreaterThan(0);
	});

	test("renders block math $$...$$ as a KaTeX block", async ({ canvas }) => {
		const id = await drawMarkdownWith(canvas, "$$\n\\sqrt{2}\n$$");

		await expect
			.poll(() => renderedCount(canvas, id, ".katex-display"))
			.toBeGreaterThan(0);
	});
});
