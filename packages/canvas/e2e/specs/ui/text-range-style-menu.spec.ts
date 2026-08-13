import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * Styling a stretch of the text being edited from the ObjectMenu. The menu used
 * to be hidden while an editor was open; it now stays, narrowed to the text items,
 * because the color and the size of a run live nowhere else — the keystrokes only
 * cover bold / italic / underline (see text-range-style.spec.ts).
 *
 * What has to hold for that to work: the menu press neither commits the edit nor
 * takes the focus off the textarea, so the selection it styles is still there
 * afterwards.
 */
test.describe("styling a stretch of text from the ObjectMenu", () => {
	const SHAPE_CENTER = { x: 520, y: 270 };

	/** Draws a rect, puts `text` in it, and selects its first `length` characters. */
	async function editAndSelect(
		canvas: CanvasDriver,
		text: string,
		length: number,
	): Promise<string> {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 180 },
			{ x: 640, y: 360 },
		);
		await canvas.typeTextAt(SHAPE_CENTER, text);
		await canvas.page.keyboard.press("Home");
		for (let i = 0; i < length; i++) {
			await canvas.page.keyboard.press("Shift+ArrowRight");
		}
		return id;
	}

	/** The drawn text, one entry per element it is split into (an unstyled body is one). */
	async function drawnRuns(
		canvas: CanvasDriver,
		id: string,
	): Promise<{ text: string; color: string; fontSize: string }[]> {
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
					color: style.color,
					fontSize: style.fontSize,
				};
			});
		}, id);
	}

	test("shows the menu while a shape's text is edited, narrowed to the text items", async ({
		canvas,
	}) => {
		await editAndSelect(canvas, "Payment failed", 7);

		await expect(canvas.page.locator(selectors.objectMenu)).toBeVisible();
		// The text items are there; the object-level ones are not, since reshaping
		// or restacking the shape is not what the menu is open for.
		await expect(
			canvas.page.locator(selectors.objectMenuToggle("font-size")),
		).toBeVisible();
		await expect(
			canvas.page.locator(selectors.objectMenuToggle("stack-order")),
		).toHaveCount(0);
	});

	test("colors only the selected characters, leaving the editor open", async ({
		canvas,
	}) => {
		const id = await editAndSelect(canvas, "Payment failed", 7);

		await canvas.setColor("font-color", "#e11d48");

		const expectedColor = await canvas.normalizeColor("#e11d48");
		await expect
			.poll(async () => await drawnRuns(canvas, id))
			.toEqual([
				expect.objectContaining({ text: "Payment", color: expectedColor }),
				expect.objectContaining({ text: " failed" }),
			]);
		expect((await drawnRuns(canvas, id))[1].color).not.toBe(expectedColor);
		// The session survived the menu interaction.
		await expect(canvas.page.locator(selectors.textEditor)).toBeVisible();
	});

	test("resizes only the selected characters", async ({ canvas }) => {
		const id = await editAndSelect(canvas, "Payment failed", 7);

		await canvas.openObjectMenu("font-size");
		await canvas.setNumberInput("fontSize", 40);

		await expect
			.poll(async () => (await drawnRuns(canvas, id))[0]?.fontSize)
			.toBe("40px");
		expect((await drawnRuns(canvas, id))[1].fontSize).not.toBe("40px");
	});

	test("reads the selection back, so the Bold toggle turns it off again", async ({
		canvas,
	}) => {
		const id = await editAndSelect(canvas, "Payment failed", 7);

		await canvas.setTextFormat("fontWeight", "bold");
		await expect.poll(async () => (await drawnRuns(canvas, id)).length).toBe(2);

		// The button now offers the cleared value, which it can only know from the
		// selection's own styling rather than the slot's.
		await canvas.setTextFormat("fontWeight", "normal");
		await expect
			.poll(async () =>
				canvas.page.evaluate(() =>
					document
						.querySelector(
							'[data-id="object-menu"][data-part^="set:fontWeight:"]',
						)
						?.getAttribute("data-part"),
				),
			)
			.toBe("set:fontWeight:bold");
	});
});
