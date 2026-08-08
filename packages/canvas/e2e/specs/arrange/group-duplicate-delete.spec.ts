import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Integrity of duplicating and deleting a group.
 *
 * group.spec guards moving and ungrouping, but whether the members (descendants) follow
 * correctly when a group is duplicated or deleted as one unit was not verified.
 * Duplicate runs through buildSelectedIdsWithDescendants + cloneObjects, delete walks
 * the descendants through DeleteCommand's recursive collectIds; breaking either corrupts
 * the tree ("the box is duplicated but empty", "the parent is deleted and the children
 * are orphaned"). Guarded through observable invariants (member count, moving as a unit,
 * undo restore).
 */

/** Draws A (center 370,260) and B (center 630,260), then marquee-selects and groups them */
async function drawAndGroupPair(canvas: CanvasDriver) {
	const a = await canvas.drawShape(
		"Rectangle",
		{ x: 300, y: 200 },
		{ x: 440, y: 320 },
	);
	await canvas.deselect();
	const b = await canvas.drawShape(
		"Rectangle",
		{ x: 560, y: 200 },
		{ x: 700, y: 320 },
	);
	await canvas.deselect();

	await canvas.drag({ x: 260, y: 160 }, { x: 740, y: 360 }, 12);
	await canvas.group();

	return { a, b };
}

test.describe("group duplicate / delete", () => {
	test("duplicates the members along with the group and groups the copies together", async ({
		canvas,
	}) => {
		const { a, b } = await drawAndGroupPair(canvas);

		// The group is selected right after grouping; Ctrl+D duplicates it with its members.
		await canvas.duplicate();

		// Rectangles go 2 -> 4 (the copy includes the members)
		await expect
			.poll(async () => (await canvas.captureObjects()).length, {
				message: "the 2 members are duplicated for a total of 4",
			})
			.toBe(4);

		// The duplicated group is selected right after duplicating and is offset +20,+20
		// from the source (so the copy of A is centered at 390,280). Dragging the selected
		// group moves only the copied members by +100,+40; the original A and B stay put.
		await canvas.drag({ x: 390, y: 280 }, { x: 490, y: 320 });

		// The originals do not move
		expect(await canvas.objectById(a).getAttribute("transform")).toBe(
			"matrix(1, 0, 0, 1, 370, 260)",
		);
		expect(await canvas.objectById(b).getAttribute("transform")).toBe(
			"matrix(1, 0, 0, 1, 630, 260)",
		);

		// The two copies move together as a group (390,280->490,320 / 650,280->750,320)
		const cloneTransforms = (await canvas.captureObjects())
			.filter((obj) => obj.id !== a && obj.id !== b)
			.map((obj) => obj.transform)
			.sort();
		expect(cloneTransforms).toEqual([
			"matrix(1, 0, 0, 1, 490, 320)",
			"matrix(1, 0, 0, 1, 750, 320)",
		]);
	});

	test("duplicates the members on copy & paste of a group and groups the copies together", async ({
		canvas,
	}) => {
		const { a, b } = await drawAndGroupPair(canvas);

		// Clipboard copy & paste (handlePaste) is a different path from Ctrl+D
		// (DuplicateCommand). The group is selected right after grouping.
		await canvas.copy();
		await canvas.paste();

		await expect
			.poll(async () => (await canvas.captureObjects()).length, {
				message: "the 2 members are duplicated for a total of 4",
			})
			.toBe(4);

		// The pasted group is selected right after pasting and is offset +20,+20 from the
		// source (so the copy of A is centered at 390,280). Dragging it moves only the
		// pasted members and leaves the original A and B put, i.e. paste keeps the group
		// structure.
		await canvas.drag({ x: 390, y: 280 }, { x: 490, y: 320 });

		expect(await canvas.objectById(a).getAttribute("transform")).toBe(
			"matrix(1, 0, 0, 1, 370, 260)",
		);
		expect(await canvas.objectById(b).getAttribute("transform")).toBe(
			"matrix(1, 0, 0, 1, 630, 260)",
		);

		// The two pasted shapes move together as a group (390,280->490,320 /
		// 650,280->750,320).
		const cloneTransforms = (await canvas.captureObjects())
			.filter((obj) => obj.id !== a && obj.id !== b)
			.map((obj) => obj.transform)
			.sort();
		expect(cloneTransforms).toEqual([
			"matrix(1, 0, 0, 1, 490, 320)",
			"matrix(1, 0, 0, 1, 750, 320)",
		]);
	});

	test("deletes every member with the group and restores them with the group intact on undo", async ({
		canvas,
	}) => {
		const { a, b } = await drawAndGroupPair(canvas);

		// Deleting with the group selected removes the descendants (A and B) too
		await canvas.deleteSelection();
		await expect
			.poll(async () => (await canvas.captureObjects()).length, {
				message: "deleting the group removes every member",
			})
			.toBe(0);

		// One undo brings both back
		await canvas.undo();
		await expect
			.poll(async () => (await canvas.captureObjects()).length, {
				message: "undo restores the 2 members",
			})
			.toBe(2);

		// The group structure is restored too: clicking A selects the whole group, and
		// dragging moves B by the same amount (+100,+40).
		await canvas.deselect();
		await canvas.selectAt({ x: 370, y: 260 });
		await canvas.drag({ x: 370, y: 260 }, { x: 470, y: 300 });

		await expect
			.poll(() => canvas.objectById(a).getAttribute("transform"))
			.toBe("matrix(1, 0, 0, 1, 470, 300)");
		expect(await canvas.objectById(b).getAttribute("transform")).toBe(
			"matrix(1, 0, 0, 1, 730, 300)",
		);
	});
});
