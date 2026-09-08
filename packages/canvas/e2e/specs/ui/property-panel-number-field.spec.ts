import { test, expect } from "../../fixtures";
import { selectors } from "../../support/selectors";

/**
 * The number fields of the properties sidebar (PropertyNumberField).
 *
 * - The spin buttons and the arrow keys step by 1, and by 10 with Shift. Each
 *   step commits, but consecutive steps of the same field merge into one history
 *   entry, so a burst of them comes back in a single undo.
 * - Typing previews live and records only on Enter or blur, so Escape has both a
 *   value to put back and nothing to take out of the history.
 * - A selection whose objects disagree about a style leaves the field empty
 *   behind its placeholder, and typing into it ends the disagreement.
 *
 * The frame rows (x / y / width / height / rotation) never read as mixed: a
 * multi-selection states the multiSelectGroup's own frame, which is one frame
 * (getSelectedFrameValues), so the mixed case is checked on a style field.
 */

/** The rectangle the tests draw: 200 x 130, clear of the panel's own width. */
const RECT_FROM = { x: 120, y: 150 };
const RECT_TO = { x: 320, y: 280 };
const RECT_WIDTH = "200";
const RECT_HEIGHT = "130";

/**
 * Rotation the render matrix carries, in degrees 0-360. From createSvgTransform
 * a = scaleX*cos(t) and b = scaleX*sin(t), so atan2(b, a) recovers the angle of
 * an unflipped shape.
 */
const matrixAngleDeg = (transform: string | null): number => {
	const match = transform?.match(/^matrix\((.+)\)$/);
	if (!match) {
		throw new Error(`the transform is not in matrix form: ${transform}`);
	}
	const [a, b] = match[1].split(",").map((part) => Number(part.trim()));
	const degrees = (Math.atan2(b, a) * 180) / Math.PI;
	return ((degrees % 360) + 360) % 360;
};

test.describe("Properties sidebar number fields", () => {
	test("steps from the spin buttons, and one undo takes the whole burst back", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape("Rectangle", RECT_FROM, RECT_TO);
		await canvas.openPropertyPanel();
		const rect = canvas.objectById(id);
		const width = canvas.page.locator(selectors.propertyPanelField("width"));
		await expect(width).toHaveValue(RECT_WIDTH);

		const increase = canvas.page.locator(
			selectors.propertyPanelFieldSpin("width", "Increase"),
		);
		await increase.click();
		await increase.click();
		await expect(width).toHaveValue("202");
		await expect.poll(() => rect.getAttribute("width")).toBe("202");

		// Shift takes the large step, the same 10 the arrow keys take with it.
		await canvas.page
			.locator(selectors.propertyPanelFieldSpin("width", "Decrease"))
			.click({ modifiers: ["Shift"] });
		await expect(width).toHaveValue("192");
		await expect.poll(() => rect.getAttribute("width")).toBe("192");

		// The three steps coalesce into one entry, so the burst is one press to undo.
		await canvas.undo();
		await expect
			.poll(() => rect.getAttribute("width"), {
				message: "one undo takes the whole run of steps back",
			})
			.toBe(RECT_WIDTH);
		await expect(width).toHaveValue(RECT_WIDTH);
	});

	test("steps from the arrow keys, by 1 and by 10 with Shift", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape("Rectangle", RECT_FROM, RECT_TO);
		await canvas.openPropertyPanel();
		const rect = canvas.objectById(id);
		const height = canvas.page.locator(selectors.propertyPanelField("height"));
		await expect(height).toHaveValue(RECT_HEIGHT);

		await height.focus();
		await height.press("ArrowUp");
		await expect(height).toHaveValue("131");
		await expect.poll(() => rect.getAttribute("height")).toBe("131");

		await height.press("Shift+ArrowDown");
		await expect(height).toHaveValue("121");
		await expect.poll(() => rect.getAttribute("height")).toBe("121");
	});

	test("commits a typed width on Enter, and one undo takes it back", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape("Rectangle", RECT_FROM, RECT_TO);
		await canvas.openPropertyPanel();
		const rect = canvas.objectById(id);
		const width = canvas.page.locator(selectors.propertyPanelField("width"));

		// Typing previews the width, so the frame holds it before Enter; the
		// commit is what makes it an entry rather than a change of its own.
		await width.fill("300");
		await width.press("Enter");
		await expect.poll(() => rect.getAttribute("width")).toBe("300");

		await canvas.undo();
		await expect.poll(() => rect.getAttribute("width")).toBe(RECT_WIDTH);
		await expect(rect, "the drawing itself is still there").toHaveCount(1);
		await expect(width).toHaveValue(RECT_WIDTH);
	});

	test("previews a typed width live, and Escape puts it back without recording it", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape("Rectangle", RECT_FROM, RECT_TO);
		await canvas.openPropertyPanel();
		const rect = canvas.objectById(id);
		const width = canvas.page.locator(selectors.propertyPanelField("width"));

		await width.fill("300");
		await expect
			.poll(() => rect.getAttribute("width"), {
				message: "the shape is drawn at the typed width before it is committed",
			})
			.toBe("300");

		await width.press("Escape");
		await expect(width).toHaveValue(RECT_WIDTH);
		await expect.poll(() => rect.getAttribute("width")).toBe(RECT_WIDTH);

		// Nothing was recorded, so the only entry left is the drawing itself: the
		// press takes the rectangle away rather than the abandoned width.
		await canvas.undo();
		await expect(
			canvas.objectById(id),
			"the abandoned edit never reached the history",
		).toHaveCount(0);
	});

	test("says a style is mixed for a selection whose shapes disagree, and writes to all of them", async ({
		canvas,
	}) => {
		const first = await canvas.drawShape("Rectangle", RECT_FROM, RECT_TO);
		const second = await canvas.drawShape(
			"Rectangle",
			{ x: 380, y: 150 },
			{ x: 500, y: 280 },
		);
		await canvas.openPropertyPanel();
		const radius = canvas.page.locator(selectors.propertyPanelField("rx"));

		// Only the first is rounded, so the two disagree about their corners.
		await canvas.selectAt({ x: 200, y: 200 });
		await radius.fill("12");
		await radius.press("Enter");
		await expect
			.poll(() => canvas.objectById(first).getAttribute("rx"))
			.toBe("12");

		await canvas.selectAll();
		await expect(
			radius,
			"no one shape's number is shown as the selection's",
		).toHaveValue("");
		await expect(radius).toHaveAttribute("placeholder", "—");

		await radius.fill("20");
		await radius.press("Enter");
		await expect
			.poll(() => canvas.objectById(first).getAttribute("rx"))
			.toBe("20");
		await expect
			.poll(() => canvas.objectById(second).getAttribute("rx"))
			.toBe("20");
		// One value again, so the field states it rather than the placeholder.
		await expect(radius).toHaveValue("20");
		await expect(radius).not.toHaveAttribute("placeholder", "—");
	});

	test("turns the shape to the angle typed into the rotation field", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape("Rectangle", RECT_FROM, RECT_TO);
		await canvas.openPropertyPanel();
		const rect = canvas.objectById(id);
		expect(matrixAngleDeg(await rect.getAttribute("transform"))).toBeCloseTo(
			0,
			5,
		);

		const rotation = canvas.page.locator(
			selectors.propertyPanelField("rotation"),
		);
		await rotation.fill("45");
		await rotation.press("Enter");

		await expect
			.poll(async () => matrixAngleDeg(await rect.getAttribute("transform")), {
				message: "the angle the field states reaches the render matrix",
			})
			.toBeCloseTo(45, 5);
	});
});
