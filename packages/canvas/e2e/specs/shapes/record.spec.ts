import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * record (a box with compartments) is the first type to hold several text slots
 * in one shape. Guarded behavior:
 * - it can be created from the uml flyout and renders as a composite <g> with a
 *   data-part per compartment
 * - double-clicking the title band edits the name slot and double-clicking a row
 *   compartment edits the attributes slot (slot resolution through data-part)
 * - while one slot is being edited, the other slot's text stays visible
 * - adding rows does not auto-resize the box (its height stays as dragged)
 * - only the title band grows, following the title's displayed line count (both
 *   explicit breaks and wrapping). It follows the draft while editing too and
 *   returns to the committed value when Escape cancels. It grows only as far as
 *   the bottom of the box, past which the editor turns to scrolling
 * - editing a row compartment, which does not follow the band, stays inside the
 *   compartment and the overflow is reached by scrolling
 * - the compartments follow from which slots exist. The entity stencil has the
 *   two name + attributes, the class stencil adds operations for three. With
 *   three, the middle one takes what its rows need and the bottom one the rest
 *
 * Coordinate note: created at 220x80, an empty title band is the top 28px
 * (content y=[200,228]) and the row compartment sits below it (y=[228,280]).
 */

const CATEGORY = "uml";

const RECORD_FROM = { x: 300, y: 200 };
const RECORD_TO = { x: 520, y: 280 };
/** Inside the title band (within 28px of the top edge). */
const NAME_SPOT = { x: 410, y: 212 };
/** Inside the row compartment (below the title band). */
const ATTRIBUTES_SPOT = { x: 410, y: 255 };

/** Creates an entity from the uml flyout by diagonal drag and returns the new object's {id, tag}. */
async function createRecord(
	canvas: CanvasDriver,
	from: { x: number; y: number },
	to: { x: number; y: number },
): Promise<{ id: string; tag: string }> {
	const id = await canvas.drawShapeFromFlyout(CATEGORY, "entity", from, to);
	const created = (await canvas.captureObjects()).find((obj) => obj.id === id);
	return { id, tag: created?.tag ?? "" };
}

/** Local y and height of a compartment rect (data-part); how the band's growth is read. */
async function partRect(
	canvas: CanvasDriver,
	id: string,
	part: "name" | "attributes" | "operations",
): Promise<{ y: number; height: number }> {
	const rect = await canvas.page.evaluate(
		({ objectId, partName }) => {
			const el = document.querySelector(
				`[data-kind="object"][data-id="${objectId}"] [data-part="${partName}"]`,
			);
			if (!el) {
				return null;
			}
			return {
				y: Number(el.getAttribute("y")),
				height: Number(el.getAttribute("height")),
			};
		},
		{ objectId: id, partName: part },
	);
	if (!rect) {
		throw new Error(`no rect found for the ${part} compartment`);
	}
	return rect;
}

/** The height attribute of the outline rect (found by fill:none); how the box height is read. */
async function outlineHeight(
	canvas: CanvasDriver,
	id: string,
): Promise<number | null> {
	return canvas.page.evaluate((objectId) => {
		const group = document.querySelector(`[data-id="${objectId}"]`);
		if (!group) {
			return null;
		}
		const outline = [...group.querySelectorAll("rect")].find(
			(rect) => getComputedStyle(rect).fill === "none",
		);
		const height = outline?.getAttribute("height");
		return height === null || height === undefined ? null : Number(height);
	}, id);
}

test.describe("record (a box with compartments)", () => {
	test("creates it from the uml flyout with a data-part on every compartment", async ({
		canvas,
	}) => {
		const record = await createRecord(canvas, RECORD_FROM, RECORD_TO);
		// One object = one data-kind=object element; the compartments carry only data-part.
		expect(record.tag).toBe("g");

		const parts = await canvas.page.evaluate((id) => {
			const group = document.querySelector(`[data-id="${id}"]`);
			if (!group) {
				return [];
			}
			return [...group.querySelectorAll("[data-part]")].map((el) =>
				el.getAttribute("data-part"),
			);
		}, record.id);
		expect(parts).toEqual(["name", "attributes"]);
	});

	test("builds the class stencil with 3 compartments where the middle one takes only its rows", async ({
		canvas,
	}) => {
		// 220x120 box. The empty title band takes 28 and the empty middle 25 (one
		// row plus padding), leaving 67 for the bottom compartment.
		const id = await canvas.drawShapeFromFlyout(
			CATEGORY,
			"class",
			{ x: 300, y: 200 },
			{ x: 520, y: 320 },
		);
		await canvas.deselect();

		const parts = await canvas.page.evaluate((objectId) => {
			const group = document.querySelector(`[data-id="${objectId}"]`);
			if (!group) {
				return [];
			}
			return [...group.querySelectorAll("[data-part]")].map((el) =>
				el.getAttribute("data-part"),
			);
		}, id);
		expect(parts).toEqual(["name", "attributes", "operations"]);

		expect((await partRect(canvas, id, "attributes")).height).toBe(25);
		expect((await partRect(canvas, id, "operations")).height).toBe(
			120 - 28 - 25,
		);

		// Two rows in the middle grow it to two rows' worth (21 * 2 + 4) and shrink
		// the bottom by the same amount. The box height does not move.
		await canvas.typeTextAt({ x: 410, y: 240 }, "id: string\nname: string");
		await canvas.commitText();
		await expect
			.poll(async () => (await partRect(canvas, id, "attributes")).height, {
				message: "the middle compartment grows to two rows' worth",
			})
			.toBe(46);
		expect((await partRect(canvas, id, "operations")).height).toBe(
			120 - 28 - 46,
		);
		expect(await outlineHeight(canvas, id)).toBe(120);
	});

	test("switches the edited slot between the title band and the row compartment", async ({
		canvas,
	}) => {
		await createRecord(canvas, RECORD_FROM, RECORD_TO);
		await canvas.deselect();

		// Double-clicking the title band opens the name slot, starting empty.
		await canvas.typeTextAt(NAME_SPOT, "User");
		await expect(canvas.textArea()).toHaveValue("User");
		await canvas.commitText();
		await expect(canvas.page.locator("body")).toContainText("User");

		// Double-clicking the row compartment opens the attributes slot, without the name's content.
		await canvas.typeTextAt(ATTRIBUTES_SPOT, "id: string");
		await expect(canvas.textArea()).toHaveValue("id: string");
		// The text of the slot that is not being edited (name) stays visible.
		await expect(canvas.page.locator("body")).toContainText("User");
		await canvas.commitText();

		// Reopening the row compartment brings the committed rows back, joined by "\n".
		await canvas.typeTextAt(ATTRIBUTES_SPOT, "");
		await expect(canvas.textArea()).toHaveValue("id: string");
		await canvas.cancelText();
	});

	test("keeps the text editor over the row compartment on a rotated record", async ({
		canvas,
	}) => {
		// This is the first type whose slot regions are offset from the shape
		// center, so a mismatch between the editor's composed transform and the
		// SVG's shows up only under rotation (catching transform-origin regressions).
		const record = await createRecord(canvas, RECORD_FROM, RECORD_TO);
		// Creation leaves the record selected, and a click on the sole selection steps
		// into a text slot (hiding the transform handles); step out first.
		await canvas.deselect();
		await canvas.selectAt({ x: 410, y: 240 });

		// Swing the rotation handle to the bottom right for a large tilt; the exact angle does not matter.
		await canvas.dragTransformHandle("rotation", { x: 540, y: 300 });
		// The connection anchors (controls) share this data-id, so narrow to the object itself.
		const group = canvas.page.locator(
			`[data-kind="object"][data-id="${record.id}"]`,
		);
		await expect
			.poll(
				async () => {
					const transform = (await group.getAttribute("transform")) ?? "";
					const b = transform.match(/matrix\(([^)]+)\)/)?.[1]?.split(",")[1];
					return Math.abs(Number(b));
				},
				{ message: "the b component (sin of the angle) leaves 0 on rotation" },
			)
			.toBeGreaterThan(0.3);
		await canvas.deselect();

		// Double-click the rotated row compartment directly to open the attributes editor.
		const attributes = group.locator('[data-part="attributes"]');
		await attributes.dblclick();
		await expect(canvas.textArea()).toBeVisible();

		// The editor frame shares the compartment's local rect and transform, so their screen boxes match.
		const editorBox = await canvas.page
			.locator('[data-testid="text-editor"]')
			.boundingBox();
		const attributesBox = await attributes.boundingBox();
		if (!editorBox || !attributesBox) {
			throw new Error(
				"no bounding box for the editor frame or the row compartment",
			);
		}
		expect(Math.abs(editorBox.x - attributesBox.x)).toBeLessThan(1.5);
		expect(Math.abs(editorBox.y - attributesBox.y)).toBeLessThan(1.5);
		expect(Math.abs(editorBox.width - attributesBox.width)).toBeLessThan(1.5);
		expect(Math.abs(editorBox.height - attributesBox.height)).toBeLessThan(1.5);
		await canvas.cancelText();
	});

	test("keeps the box height when rows are added", async ({ canvas }) => {
		const record = await createRecord(canvas, RECORD_FROM, RECORD_TO);
		await canvas.deselect();

		expect(await outlineHeight(canvas, record.id)).toBe(80);

		// More rows than the compartment fits (header + padding (32) + 21 * 3 = 95 > 80).
		await canvas.typeTextAt(
			ATTRIBUTES_SPOT,
			"id: string\nname: string\nemail: string",
		);
		await canvas.commitText();

		// Rows that do not fit are simply clipped by the compartment; the height is not auto-corrected.
		expect(await outlineHeight(canvas, record.id)).toBe(80);

		// The commit itself went through: reopening returns the 3 rows joined by "\n".
		await canvas.typeTextAt(ATTRIBUTES_SPOT, "");
		await expect(canvas.textArea()).toHaveValue(
			"id: string\nname: string\nemail: string",
		);
		await canvas.cancelText();
	});

	test("keeps editing a row compartment inside the compartment and scrolls", async ({
		canvas,
	}) => {
		const record = await createRecord(canvas, RECORD_FROM, RECORD_TO);
		await canvas.deselect();

		const attributesBefore = await partRect(canvas, record.id, "attributes");

		// Hold more rows than the 52px compartment fits, still in edit mode.
		await canvas.typeTextAt(ATTRIBUTES_SPOT, "a\nb\nc\nd\ne\nf");
		await expect(canvas.textArea()).toHaveValue("a\nb\nc\nd\ne\nf");

		// attributes takes what the band leaves, so it does not follow the draft. A
		// growing editor would spill below the compartment, so it has to stay at the
		// compartment height and scroll instead.
		const overflow = await canvas
			.textArea()
			.evaluate((el) => el.scrollHeight - el.clientHeight);
		expect(overflow).toBeGreaterThan(0);

		const editorBox = await canvas.page
			.locator('[data-testid="text-editor"]')
			.boundingBox();
		const attributesBox = await canvas.page
			.locator(
				`[data-kind="object"][data-id="${record.id}"] [data-part="attributes"]`,
			)
			.boundingBox();
		if (!editorBox || !attributesBox) {
			throw new Error(
				"no bounding box for the editor frame or the row compartment",
			);
		}
		expect(Math.abs(editorBox.height - attributesBox.height)).toBeLessThan(1.5);

		// The compartment itself does not move during editing; only the title band grows.
		const attributesDuringEdit = await partRect(
			canvas,
			record.id,
			"attributes",
		);
		expect(attributesDuringEdit).toEqual(attributesBefore);
		await canvas.cancelText();
	});

	test("grows the title band when the title spans several lines", async ({
		canvas,
	}) => {
		const record = await createRecord(canvas, RECORD_FROM, RECORD_TO);
		await canvas.deselect();

		expect((await partRect(canvas, record.id, "name")).height).toBe(28);

		// A two-line title with an explicit break grows it by one row (14 * 1.5 = 21).
		await canvas.typeTextAt(NAME_SPOT, "User\nAccount");
		await canvas.commitText();
		await expect
			.poll(async () => (await partRect(canvas, record.id, "name")).height, {
				message: "a two-line title grows the band by one row",
			})
			.toBe(49);

		// The row compartment starts right below the grown band, with no gap and no overlap.
		const name = await partRect(canvas, record.id, "name");
		const attributes = await partRect(canvas, record.id, "attributes");
		expect(attributes.y).toBeCloseTo(name.y + name.height, 3);

		// Only the band grows; the box height is not auto-resized.
		expect(await outlineHeight(canvas, record.id)).toBe(80);
	});

	test("grows the band while the title is being edited, before it is committed", async ({
		canvas,
	}) => {
		const record = await createRecord(canvas, RECORD_FROM, RECORD_TO);
		await canvas.deselect();

		expect((await partRect(canvas, record.id, "name")).height).toBe(28);

		// Type a line break with the editor still open. The band height is derived
		// from the editing draft rather than the committed state, so it has to have
		// grown by now.
		await canvas.typeTextAt(NAME_SPOT, "User\nAccount");
		await expect(canvas.textArea()).toHaveValue("User\nAccount");
		await expect
			.poll(async () => (await partRect(canvas, record.id, "name")).height, {
				message: "the band grows by one row before the commit",
			})
			.toBe(49);

		// The row compartment follows right below the grown band during editing too.
		const editingName = await partRect(canvas, record.id, "name");
		const editingAttributes = await partRect(canvas, record.id, "attributes");
		expect(editingAttributes.y).toBeCloseTo(
			editingName.y + editingName.height,
			3,
		);

		// Committing uses the same derivation as editing, so the height does not jump.
		await canvas.commitText();
		expect((await partRect(canvas, record.id, "name")).height).toBe(49);
	});

	test("restores the band height when the title edit is cancelled with Escape", async ({
		canvas,
	}) => {
		const record = await createRecord(canvas, RECORD_FROM, RECORD_TO);
		await canvas.deselect();

		await canvas.typeTextAt(NAME_SPOT, "User\nAccount");
		await expect
			.poll(async () => (await partRect(canvas, record.id, "name")).height)
			.toBe(49);

		await canvas.cancelText();

		// The draft is dropped, so the band returns to the committed value, one row for an empty title.
		await expect
			.poll(async () => (await partRect(canvas, record.id, "name")).height, {
				message: "cancelling returns the band to its original height",
			})
			.toBe(28);
	});

	test("stops at the shape's bottom edge and scrolls when the title does not fit the box", async ({
		canvas,
	}) => {
		const record = await createRecord(canvas, RECORD_FROM, RECORD_TO);
		await canvas.deselect();

		// 5 rows = 21 * 5 + 7 = 112px, past the box height of 80px.
		await canvas.typeTextAt(NAME_SPOT, "A\nB\nC\nD\nE");
		await expect(canvas.textArea()).toHaveValue("A\nB\nC\nD\nE");

		// The band stops at the box's bottom edge (the clamp in calcRecordSlotRegions).
		await expect
			.poll(async () => (await partRect(canvas, record.id, "name")).height, {
				message: "the band tops out at the box height",
			})
			.toBe(80);

		// The editor stops at that same edge instead of growing past the shape.
		const bandBox = await canvas.page
			.locator(
				`[data-kind="object"][data-id="${record.id}"] [data-part="name"]`,
			)
			.boundingBox();
		const editorBox = await canvas.page
			.locator('[data-testid="text-editor"]')
			.boundingBox();
		if (!bandBox || !editorBox) {
			throw new Error("no bounding box for the band or the editor frame");
		}
		expect(editorBox.y + editorBox.height).toBeLessThanOrEqual(
			bandBox.y + bandBox.height + 1.5,
		);

		// What is left over is reached by scrolling, which also decides wheel delegation.
		const overflow = await canvas
			.textArea()
			.evaluate((el) => el.scrollHeight - el.clientHeight);
		expect(overflow).toBeGreaterThan(0);
		await canvas.cancelText();
	});

	test("wraps a title too wide for the box and grows the band", async ({
		canvas,
	}) => {
		const record = await createRecord(canvas, RECORD_FROM, RECORD_TO);
		await canvas.deselect();

		// Too long for a single line in a 220px box (208px usable for text).
		await canvas.typeTextAt(NAME_SPOT, "Authentication Provider Configuration");
		await canvas.commitText();

		// The band height is always rows * 21 + 7, so 49 or more means it wrapped onto at least two lines.
		await expect
			.poll(async () => (await partRect(canvas, record.id, "name")).height, {
				message: "a wrapped title grows the band to two rows or more",
			})
			.toBeGreaterThanOrEqual(49);
	});
});
