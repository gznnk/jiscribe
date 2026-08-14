import { test, expect } from "../../fixtures";
import { selectors } from "../../support/selectors";

test.describe("styling through the ObjectMenu", () => {
	test("sets the background and stroke color from the CSS color input", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);

		await canvas.setColor("bg-color", "#6366f1");
		await canvas.setColor("stroke-color", "#4f46e5");

		// Colors come from emotion CSS rather than SVG attributes, so check the computed style
		expect(await canvas.computedColor(id, "fill")).toBe(
			await canvas.normalizeColor("#6366f1"),
		);
		expect(await canvas.computedColor(id, "stroke")).toBe(
			await canvas.normalizeColor("#4f46e5"),
		);
	});

	test("sets transparent as well", async ({ canvas }) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);

		await canvas.setColor("stroke-color", "transparent");

		// transparent resolves to rgba(0, 0, 0, 0) in the computed style
		expect(await canvas.computedColor(id, "stroke")).toBe(
			await canvas.normalizeColor("transparent"),
		);
	});

	test("makes a polyline dashed", async ({ canvas }) => {
		const id = await canvas.drawShape(
			"Polyline",
			{ x: 400, y: 400 },
			{ x: 700, y: 450 },
		);

		await canvas.setStrokeDashType("line-style", "dashed");

		// The style lands on the visual element, not the hit-test element
		await expect(await canvas.visualPolylineFor(id)).toHaveAttribute(
			"stroke-dasharray",
			/.+/,
		);
	});

	test("keeps the submenu open when its background is clicked", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });

		await canvas.openObjectMenu("bg-color");
		const colorInput = canvas.page.locator(selectors.cssColorInput);
		await expect(colorInput).toBeVisible();

		// Click the blank part of the panel (background, not a button): the top-left
		// corner falls inside the padding of ColorPickerContainer.
		const panel = canvas.page.locator(
			'[data-id="object-menu"][data-part="panel"]',
		);
		await panel.click({ position: { x: 6, y: 6 } });

		// The submenu stays open and the shape stays selected
		await expect(colorInput).toBeVisible();
		await expect(canvas.page.locator(selectors.control).first()).toBeVisible();
	});

	test("narrows the ObjectMenu to its text items while text is being edited", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });

		const objectMenu = canvas.page.locator(selectors.objectMenu);
		const backgroundColor = canvas.page.locator(
			selectors.objectMenuToggle("bg-color"),
		);
		const fontSize = canvas.page.locator(
			selectors.objectMenuToggle("font-size"),
		);
		await expect(objectMenu).toBeVisible();
		await expect(backgroundColor).toBeVisible();

		// The menu stays through the edit — it is how a stretch of the text being
		// edited is styled — but only its text items, since the rest acts on the
		// shape rather than on the text.
		await canvas.typeTextAt({ x: 500, y: 260 }, "Editing");
		await expect(objectMenu).toBeVisible();
		await expect(fontSize).toBeVisible();
		await expect(backgroundColor).toHaveCount(0);

		await canvas.cancelText();
		await expect(backgroundColor).toBeVisible();
	});

	test("keeps the color setting after text editing", async ({ canvas }) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);
		await canvas.setColor("bg-color", "#dbeafe");

		await canvas.deselect();
		await canvas.typeTextAt({ x: 500, y: 260 }, "Styled");
		await canvas.commitText();

		expect(await canvas.computedColor(id, "fill")).toBe(
			await canvas.normalizeColor("#dbeafe"),
		);
		await expect(canvas.page.locator("body")).toContainText("Styled");
	});
});
