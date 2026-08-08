import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * Guards that copy-paste and duplicate carry over the border properties: corner
 * radius (rx), stroke width (strokeWidth) and dash type (strokeDashType).
 *
 * The existing preserves specs look at fill / text / font / transform, but
 * whether the border-style section's properties survive clipboard serialization
 * was uncovered. A rect draws rx / stroke-width / stroke-dasharray as SVG
 * attributes, so the clone is checked through those attributes. Copy-paste goes
 * through handlePaste and duplicate through DuplicateCommand, so both paths are
 * guarded.
 */

type BorderAttrs = {
	rx: string | null;
	strokeWidth: string | null;
	dash: string | null;
};

/** Reads a rect's border attributes in one go. */
async function borderAttrs(
	canvas: CanvasDriver,
	id: string,
): Promise<BorderAttrs> {
	const el = canvas.objectById(id);
	return {
		rx: await el.getAttribute("rx"),
		strokeWidth: await el.getAttribute("stroke-width"),
		dash: await el.getAttribute("stroke-dasharray"),
	};
}

/**
 * Draws a rect, sets its corner radius, stroke width and dash, and returns the
 * id together with the resulting attributes. Leaves the shape deselected.
 */
async function drawBorderedRect(
	canvas: CanvasDriver,
): Promise<{ id: string; attrs: BorderAttrs }> {
	const id = await canvas.drawShape(
		"Rectangle",
		{ x: 380, y: 200 },
		{ x: 620, y: 360 },
	);

	// Corner radius, stroke width and dash all live in the same border-style dropdown.
	await canvas.openObjectMenu("border-style");
	await canvas.setNumberInput("rx", 16);
	await canvas.setNumberInput("strokeWidth", 6);
	await canvas.page.click(selectors.objectMenuSet("strokeDashType", "dashed"));

	await expect.poll(async () => (await borderAttrs(canvas, id)).rx).toBe("16");
	const attrs = await borderAttrs(canvas, id);
	expect(attrs.strokeWidth).toBe("6");
	expect(attrs.dash).not.toBeNull();

	// Focus left in a number input would swallow Ctrl+C/V/D, so deselect to hand
	// focus back to the canvas.
	await canvas.deselect();
	return { id, attrs };
}

/** Returns the id of the shape that was just added. */
async function newObjectId(
	canvas: CanvasDriver,
	beforeIds: Set<string | null>,
): Promise<string> {
	const created = (await canvas.captureObjects()).find(
		(obj) => !beforeIds.has(obj.id),
	);
	if (!created?.id) {
		throw new Error("no data-id on the newly added shape");
	}
	return created.id;
}

test.describe("copy-paste / duplicate preserve border properties", () => {
	test("carries over corner radius, stroke width and dash on copy-paste", async ({
		canvas,
	}) => {
		const { attrs } = await drawBorderedRect(canvas);

		const before = await canvas.captureObjects();
		const beforeIds = new Set(before.map((obj) => obj.id));

		await canvas.selectAt({ x: 500, y: 280 });
		await canvas.copy();
		await canvas.paste();
		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(before.length + 1);

		const clone = await borderAttrs(
			canvas,
			await newObjectId(canvas, beforeIds),
		);
		expect(clone.rx).toBe("16");
		expect(clone.strokeWidth).toBe("6");
		expect(clone.dash).toBe(attrs.dash);
	});

	test("carries over corner radius, stroke width and dash on duplicate (Ctrl+D)", async ({
		canvas,
	}) => {
		const { attrs } = await drawBorderedRect(canvas);

		const before = await canvas.captureObjects();
		const beforeIds = new Set(before.map((obj) => obj.id));

		await canvas.selectAt({ x: 500, y: 280 });
		await canvas.duplicate();
		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(before.length + 1);

		const clone = await borderAttrs(
			canvas,
			await newObjectId(canvas, beforeIds),
		);
		expect(clone.rx).toBe("16");
		expect(clone.strokeWidth).toBe("6");
		expect(clone.dash).toBe(attrs.dash);
	});
});
