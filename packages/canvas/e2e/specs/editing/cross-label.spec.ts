import { test, expect } from "../../fixtures";
import { selectors } from "../../support/selectors";

/** Box the cross fills; the label hangs below its bottom edge (y = 300). */
const MARKER_FROM = { x: 400, y: 200 };
const MARKER_TO = { x: 480, y: 300 };
const MARKER_CENTER = { x: 440, y: 250 };

/**
 * The flowchart markers used to hold no text at all. They now hang their label
 * below the box like the pictogram shapes do, so this guards the same three
 * things actor-label does — placement outside the box, a draft-driven region,
 * and a committed label — for a shape whose drawing is a bare silhouette.
 */
test.describe("cross label", () => {
	test("edits the label below the marker and grows the box with the text", async ({
		canvas,
	}) => {
		await canvas.drawShapeFromFlyout(
			"flowchart",
			"cross",
			MARKER_FROM,
			MARKER_TO,
		);
		await canvas.deselect();

		await canvas.typeTextAt(MARKER_CENTER, "join");

		const editor = canvas.page.locator(selectors.textEditor);
		const oneLine = await editor.boundingBox();
		expect(oneLine).not.toBeNull();
		expect(oneLine!.y).toBeGreaterThan(
			canvas.toScreen({ x: MARKER_CENTER.x, y: MARKER_TO.y }).y,
		);

		// The region is derived from the uncommitted draft, so a second line must
		// make the editor taller while it is still open.
		await canvas.page.keyboard.type("\nof both paths");
		await expect
			.poll(async () => (await editor.boundingBox())?.height ?? 0)
			.toBeGreaterThan(oneLine!.height);

		await canvas.commitText();
		await expect(canvas.page.locator("body")).toContainText("join");
	});
});
