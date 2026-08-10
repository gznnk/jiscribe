import type { CanvasDriver } from "@jiscribe/canvas-sdk/testing/e2e";
import { test, expect } from "@jiscribe/canvas-sdk/testing/e2e";

/**
 * Guards that a markdown shape (type: "markdown") renders its body "as HTML,
 * not as plain text".
 *
 * The canvas suite's specs/shapes/draw.spec only checks that textContent contains
 * "Title", so it would not notice if the Markdown conversion broke and merely poured
 * in the raw text. Here the result of the renderMarkdown -> (DOMPurify sanitize) -> HTML
 * inside foreignObject pipeline is verified through the presence of real
 * elements such as headings, emphasis and lists.
 */

/**
 * Returns the textContent of every element matching the selector inside the
 * TextOverlay (the text div inside foreignObject) of the given shape id.
 */
async function renderedText(
	canvas: CanvasDriver,
	id: string,
	selector: string,
): Promise<string[]> {
	return canvas.page.evaluate(
		({ targetId, sel }) => {
			const shape = document.querySelector(`[data-id="${targetId}"]`);
			let sibling = shape?.nextElementSibling ?? null;
			while (sibling && sibling.tagName.toLowerCase() !== "foreignobject") {
				sibling = sibling.nextElementSibling;
			}
			const wrapper = sibling?.firstElementChild;
			const textDiv = wrapper?.firstElementChild ?? null;
			if (!textDiv) {
				return [];
			}
			return [...textDiv.querySelectorAll(sel)].map(
				(el) => el.textContent ?? "",
			);
		},
		{ targetId: id, sel: selector },
	);
}

test.describe("Markdown rendering", () => {
	test("renders headings and emphasis as HTML elements for the default Markdown body", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Markdown",
			{ x: 400, y: 200 },
			{ x: 700, y: 400 },
		);

		// "# Title" -> <h1>Title</h1>, "**markdown**" -> <strong>markdown</strong>
		await expect.poll(() => renderedText(canvas, id, "h1")).toEqual(["Title"]);
		expect(await renderedText(canvas, id, "strong")).toEqual(["markdown"]);
	});

	test("updates the Markdown rendering when the body is edited (headings and lists)", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Markdown",
			{ x: 400, y: 200 },
			{ x: 700, y: 400 },
		);
		await canvas.deselect();

		// Select all of the existing raw Markdown and replace it.
		const center = canvas.toScreen({ x: 550, y: 300 });
		await canvas.page.mouse.dblclick(center.x, center.y);
		await canvas.waitForTextEditor();
		await canvas.page.keyboard.press("Control+a");
		await canvas.page.keyboard.type("## Updated\n\n- first\n- second");
		await canvas.commitText();

		await expect
			.poll(() => renderedText(canvas, id, "h2"))
			.toEqual(["Updated"]);
		expect(await renderedText(canvas, id, "li")).toEqual(["first", "second"]);
		// The old heading is gone (it was replaced).
		expect(await renderedText(canvas, id, "h1")).toEqual([]);
	});

	test("renders links with target=_blank / rel=noopener noreferrer", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Markdown",
			{ x: 400, y: 200 },
			{ x: 700, y: 400 },
		);
		await canvas.deselect();

		const center = canvas.toScreen({ x: 550, y: 300 });
		await canvas.page.mouse.dblclick(center.x, center.y);
		await canvas.waitForTextEditor();
		await canvas.page.keyboard.press("Control+a");
		await canvas.page.keyboard.type("[Example](https://example.com)");
		await canvas.commitText();

		// The anchor is rendered and the safety attributes for opening a new tab
		// survive DOMPurify.
		const anchor = await canvas.page.evaluate((targetId) => {
			const shape = document.querySelector(`[data-id="${targetId}"]`);
			let sibling = shape?.nextElementSibling ?? null;
			while (sibling && sibling.tagName.toLowerCase() !== "foreignobject") {
				sibling = sibling.nextElementSibling;
			}
			const link = sibling?.querySelector("a");
			return link
				? {
						text: link.textContent,
						href: link.getAttribute("href"),
						target: link.getAttribute("target"),
						rel: link.getAttribute("rel"),
					}
				: null;
		}, id);

		expect(anchor).not.toBeNull();
		expect(anchor?.text).toBe("Example");
		expect(anchor?.href).toBe("https://example.com");
		expect(anchor?.target).toBe("_blank");
		expect(anchor?.rel).toBe("noopener noreferrer");
	});

	test("turns a code fence with a language into a code element with a language- class", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Markdown",
			{ x: 400, y: 200 },
			{ x: 700, y: 400 },
		);
		await canvas.deselect();

		const center = canvas.toScreen({ x: 550, y: 300 });
		await canvas.page.mouse.dblclick(center.x, center.y);
		await canvas.waitForTextEditor();
		await canvas.page.keyboard.press("Control+a");
		await canvas.page.keyboard.type("```js\nconst x = 1;\n```");
		await canvas.commitText();

		const code = await canvas.page.evaluate((targetId) => {
			const shape = document.querySelector(`[data-id="${targetId}"]`);
			let sibling = shape?.nextElementSibling ?? null;
			while (sibling && sibling.tagName.toLowerCase() !== "foreignobject") {
				sibling = sibling.nextElementSibling;
			}
			const codeEl = sibling?.querySelector("pre code");
			return codeEl
				? {
						className: codeEl.className,
						text: codeEl.textContent,
					}
				: null;
		}, id);

		expect(code).not.toBeNull();
		expect(code?.className).toContain("language-js");
		expect(code?.text).toContain("const x = 1;");
	});

	test("turns a code fence without a language into a bare code element with no class", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Markdown",
			{ x: 400, y: 200 },
			{ x: 700, y: 400 },
		);
		await canvas.deselect();

		const center = canvas.toScreen({ x: 550, y: 300 });
		await canvas.page.mouse.dblclick(center.x, center.y);
		await canvas.waitForTextEditor();
		await canvas.page.keyboard.press("Control+a");
		await canvas.page.keyboard.type("```\nplain text\n```");
		await canvas.commitText();

		const code = await canvas.page.evaluate((targetId) => {
			const shape = document.querySelector(`[data-id="${targetId}"]`);
			let sibling = shape?.nextElementSibling ?? null;
			while (sibling && sibling.tagName.toLowerCase() !== "foreignobject") {
				sibling = sibling.nextElementSibling;
			}
			const codeEl = sibling?.querySelector("pre code");
			return codeEl
				? {
						className: codeEl.className,
						text: codeEl.textContent,
					}
				: null;
		}, id);

		expect(code).not.toBeNull();
		expect(code?.className).toBe("");
		expect(code?.text).toContain("plain text");
	});
});
