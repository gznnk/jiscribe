import type { CanvasDriver } from "@jiscribe/canvas-sdk/testing/e2e";
import { test, expect } from "@jiscribe/canvas-sdk/testing/e2e";

/**
 * Guards that a markdown image never reaches the DOM, so opening a document
 * cannot make the host fetch a URL of the author's choosing (gznnk/jiscribe#28).
 *
 * The unit test in packages/markdown pins the sanitizer's output; this spec
 * follows the real pipeline (renderMarkdown -> MarkdownOverlay innerHTML) inside a
 * browser and watches the network, so a host that re-added the tag, or bypassed
 * the sanitizer, would fail here.
 */

/** A host no resolver answers for, so a leaked fetch shows up as a request, not a load. */
const IMAGE_HOST = "leak.invalid";
const IMAGE_MARKDOWN = `![tracker](https://${IMAGE_HOST}/pixel.png)`;

/** Returns the tag names of every element in the markdown body of the given shape. */
async function renderedTagNames(
	canvas: CanvasDriver,
	id: string,
): Promise<string[]> {
	return canvas.page.evaluate((targetId) => {
		const shape = document.querySelector(`[data-id="${targetId}"]`);
		let sibling = shape?.nextElementSibling ?? null;
		while (sibling && sibling.tagName.toLowerCase() !== "foreignobject") {
			sibling = sibling.nextElementSibling;
		}
		return [...(sibling?.querySelectorAll("*") ?? [])].map((el) =>
			el.tagName.toLowerCase(),
		);
	}, id);
}

test.describe("Markdown images", () => {
	test("drops a remote image and never requests its URL", async ({
		canvas,
	}) => {
		const requestedUrls: string[] = [];
		canvas.page.on("request", (request) => {
			if (request.url().includes(IMAGE_HOST)) {
				requestedUrls.push(request.url());
			}
		});

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
		await canvas.page.keyboard.type(`Before\n\n${IMAGE_MARKDOWN}\n\nAfter`);
		await canvas.commitText();

		// The surrounding text renders, so the body was re-rendered from the new
		// source, and the image is gone from it.
		await expect.poll(() => renderedTagNames(canvas, id)).toContain("p");
		expect(await renderedTagNames(canvas, id)).not.toContain("img");
		expect(requestedUrls).toEqual([]);
	});
});
