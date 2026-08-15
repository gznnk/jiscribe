import { test, expect } from "@jiscribe/canvas-sdk/testing/e2e";
import type { CanvasDriver } from "@jiscribe/canvas-sdk/testing/e2e";

/**
 * Styling a stretch of the text being edited inside a record compartment, the
 * counterpart of the core suite's text-range-style specs for a slot that holds
 * rows rather than one body. The editor joins the rows with "\n" and its offsets
 * count in that joined text, so what is guarded here is that the styling lands on
 * the same characters anyway and is split back into the rows:
 * - the bold keystroke styles the selected characters of one row and survives the
 *   commit, leaving the other row alone
 * - a selection reaching over the row boundary styles each row's share of it, and
 *   the rows keep exactly the characters they had
 * - the object menu's color item lands on the selection too, not on the slot
 *
 * Coordinate note (shared with record.spec): created at 220x80, a title band
 * holding a one-line title is the top 28px (content y=[200,228]) and the row
 * compartment sits below it (y=[228,280]), which is two rows' worth.
 */

const CATEGORY = "uml";

const RECORD_FROM = { x: 300, y: 200 };
const RECORD_TO = { x: 520, y: 280 };
/** Inside the row compartment (below the title band). */
const ATTRIBUTES_SPOT = { x: 410, y: 255 };

/** The two attribute rows the tests start from, as the editor joins them. */
const ATTRIBUTES_TEXT = "id: string\nname: string";

/** Creates an object record and commits {@link ATTRIBUTES_TEXT} into its row compartment. */
async function createRecordWithRows(canvas: CanvasDriver): Promise<string> {
	const id = await canvas.drawShapeFromFlyout(
		CATEGORY,
		"object",
		RECORD_FROM,
		RECORD_TO,
	);
	await canvas.deselect();
	await canvas.replaceTextAt(ATTRIBUTES_SPOT, ATTRIBUTES_TEXT);
	await canvas.commitText();
	return id;
}

/**
 * Reopens the row compartment and selects `length` characters from `from`, in the
 * offsets of the joined rows. Walked with the caret rather than set outright, so
 * the selection is the browser's own; the walk is then checked against the offsets
 * the editor reports, since those are what the styling lands on.
 */
async function editAndSelectInAttributes(
	canvas: CanvasDriver,
	from: number,
	length: number,
): Promise<void> {
	await canvas.typeTextAt(ATTRIBUTES_SPOT, "");
	await expect.poll(() => canvas.textEditorText()).toBe(ATTRIBUTES_TEXT);
	await canvas.page.keyboard.press("ControlOrMeta+Home");
	for (let step = 0; step < from; step += 1) {
		await canvas.page.keyboard.press("ArrowRight");
	}
	for (let step = 0; step < length; step += 1) {
		await canvas.page.keyboard.press("Shift+ArrowRight");
	}
	await expect
		.poll(() => canvas.textEditorSelection(), {
			message: "the caret walk reaches the offsets the styling is meant for",
		})
		.toEqual({ start: from, end: from + length });
}

/**
 * The parts one committed text overlay draws its text in, picked by the whole text
 * it holds: an unstyled body draws as a bare text node (the content box is then
 * the only part), a body styled per range as one `<span>` per run.
 *
 * A record has one overlay per compartment while the driver's drawnTextRuns reads
 * the shape's first one (the title band), so the compartment is named by its text.
 */
async function drawnRunsOfOverlay(
	canvas: CanvasDriver,
	text: string,
): Promise<{ text: string; fontWeight: string }[]> {
	return canvas.page.evaluate((expected) => {
		// foreignObject > wrapper > content is the text overlay's DOM contract.
		for (const frame of document.querySelectorAll("foreignObject")) {
			const content = frame.firstElementChild?.firstElementChild;
			if (
				!(content instanceof HTMLElement) ||
				content.textContent !== expected
			) {
				continue;
			}
			const parts = [...content.children].filter(
				(element) => element.tagName !== "BR",
			);
			return (parts.length > 0 ? parts : [content]).map((part) => ({
				text: part.textContent ?? "",
				fontWeight: getComputedStyle(part).fontWeight,
			}));
		}
		return [];
	}, text);
}

test.describe("record: styling a stretch of a compartment's rows", () => {
	test("bolds the selected characters of one row and keeps them bold after the commit", async ({
		canvas,
	}) => {
		const id = await createRecordWithRows(canvas);
		// "id", the first row's name.
		await editAndSelectInAttributes(canvas, 0, 2);

		await canvas.page.keyboard.press("ControlOrMeta+b");

		// The editor draws the runs itself while it is open, so the styling shows
		// before the commit.
		await expect
			.poll(async () => await canvas.drawnTextRuns(id))
			.toEqual([
				expect.objectContaining({ text: "id", fontWeight: "700" }),
				expect.objectContaining({
					text: ": string\nname: string",
					fontWeight: "400",
				}),
			]);

		await canvas.commitText();
		// The second row is untouched, so it merges back into the unstyled run that
		// follows the bold one.
		expect(await drawnRunsOfOverlay(canvas, ATTRIBUTES_TEXT)).toEqual([
			{ text: "id", fontWeight: "700" },
			{ text: ": string\nname: string", fontWeight: "400" },
		]);
	});

	test("styles each row's share of a selection reaching over the row boundary", async ({
		canvas,
	}) => {
		await createRecordWithRows(canvas);
		// Offsets 8..13 cover "ng", the "\n" between the rows, and "na".
		await editAndSelectInAttributes(canvas, 8, 5);

		await canvas.page.keyboard.press("ControlOrMeta+b");
		await canvas.commitText();

		// The newline is dropped when the styled text is split back into the rows,
		// so it draws unstyled between the two bold stretches — and the rows still
		// hold exactly the characters they did.
		const runs = await drawnRunsOfOverlay(canvas, ATTRIBUTES_TEXT);
		expect(runs).toEqual([
			{ text: "id: stri", fontWeight: "400" },
			{ text: "ng", fontWeight: "700" },
			{ text: "\n", fontWeight: "400" },
			{ text: "na", fontWeight: "700" },
			{ text: "me: string", fontWeight: "400" },
		]);
	});

	test("colors the selected characters from the object menu, leaving the editor open", async ({
		canvas,
	}) => {
		const id = await createRecordWithRows(canvas);
		await editAndSelectInAttributes(canvas, 0, 2);

		await canvas.setColor("font-color", "#e11d48");

		const expectedColor = await canvas.normalizeColor("#e11d48");
		await expect
			.poll(async () => await canvas.drawnTextRuns(id))
			.toEqual([
				expect.objectContaining({ text: "id", color: expectedColor }),
				expect.objectContaining({ text: ": string\nname: string" }),
			]);
		expect((await canvas.drawnTextRuns(id))[1].color).not.toBe(expectedColor);
		// The session survived the menu interaction.
		expect(await canvas.textEditorText()).toBe(ATTRIBUTES_TEXT);
	});
});
