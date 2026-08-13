import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Styling a stretch of a shape's text rather than the whole slot: the editor
 * reports what it has selected, the bold / italic / underline keystrokes apply to
 * that stretch, and the text is drawn as the runs it is now styled in.
 *
 * The keystrokes are handled by the textarea itself (it holds the focus, and they
 * are the browser's own defaults on a rich-text field), so they are exercised
 * through the real editor rather than through the ObjectMenu, which is hidden
 * while editing.
 */
test.describe("styling a stretch of a shape's text", () => {
	const SHAPE_CENTER = { x: 520, y: 270 };

	/** Draws a rect and puts `text` in it, leaving the editor open. */
	async function drawAndEdit(
		canvas: CanvasDriver,
		text: string,
	): Promise<string> {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 180 },
			{ x: 640, y: 360 },
		);
		await canvas.typeTextAt(SHAPE_CENTER, text);
		return id;
	}

	/** Selects the first `length` characters of the open editor. */
	async function selectFromStart(canvas: CanvasDriver, length: number) {
		await canvas.page.keyboard.press("Home");
		for (let i = 0; i < length; i++) {
			await canvas.page.keyboard.press("Shift+ArrowRight");
		}
	}

	/**
	 * The drawn text, one entry per element it is split into: an unstyled body is
	 * one entry, a styled one is its runs.
	 */
	async function drawnRuns(
		canvas: CanvasDriver,
		id: string,
	): Promise<{ text: string; fontWeight: string; fontStyle: string }[]> {
		return canvas.page.evaluate((targetId) => {
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
			const content = foreignObject?.firstElementChild
				?.firstElementChild as HTMLElement | null;
			if (!content) {
				return [];
			}
			const parts =
				content.children.length > 0 ? Array.from(content.children) : [content];
			return parts.map((part) => {
				const style = getComputedStyle(part);
				return {
					text: part.textContent ?? "",
					fontWeight: style.fontWeight,
					fontStyle: style.fontStyle,
				};
			});
		}, id);
	}

	test("bolds only the selected characters and keeps them bold after the commit", async ({
		canvas,
	}) => {
		const id = await drawAndEdit(canvas, "Payment failed");
		await selectFromStart(canvas, 7);

		await canvas.page.keyboard.press("ControlOrMeta+b");

		// The overlay keeps drawing while a styled body is edited (the textarea
		// cannot draw two styles), so the runs are visible right away.
		await expect
			.poll(async () => await drawnRuns(canvas, id))
			.toEqual([
				expect.objectContaining({ text: "Payment", fontWeight: "700" }),
				expect.objectContaining({ text: " failed", fontWeight: "400" }),
			]);

		await canvas.commitText();
		expect(await drawnRuns(canvas, id)).toEqual([
			expect.objectContaining({ text: "Payment", fontWeight: "700" }),
			expect.objectContaining({ text: " failed", fontWeight: "400" }),
		]);
	});

	test("turns the styling back off on a second press, leaving one plain text", async ({
		canvas,
	}) => {
		const id = await drawAndEdit(canvas, "Payment failed");
		await selectFromStart(canvas, 7);

		await canvas.page.keyboard.press("ControlOrMeta+i");
		await expect
			.poll(async () => (await drawnRuns(canvas, id))[0]?.fontStyle)
			.toBe("italic");

		await canvas.page.keyboard.press("ControlOrMeta+i");
		await expect
			.poll(async () => (await drawnRuns(canvas, id))[0]?.fontStyle)
			.toBe("normal");
	});

	test("keeps the styling on the characters an edit leaves in place", async ({
		canvas,
	}) => {
		const id = await drawAndEdit(canvas, "Payment failed");
		await selectFromStart(canvas, 7);
		await canvas.page.keyboard.press("ControlOrMeta+b");
		await expect.poll(async () => (await drawnRuns(canvas, id)).length).toBe(2);

		// Typing at the end of the text must not disturb the styled part.
		await canvas.page.keyboard.press("End");
		await canvas.page.keyboard.type(" twice");
		await canvas.commitText();

		expect(await drawnRuns(canvas, id)).toEqual([
			expect.objectContaining({ text: "Payment", fontWeight: "700" }),
			expect.objectContaining({ text: " failed twice", fontWeight: "400" }),
		]);
	});
});
