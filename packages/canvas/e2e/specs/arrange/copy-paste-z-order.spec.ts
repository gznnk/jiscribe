import { test, expect } from "../../fixtures";
import type { ObjectSnapshot } from "../../support/CanvasDriver";

/**
 * Copy & paste of several shapes preserves the stacking order (z-order).
 *
 * z-order.spec guards the arrange commands (bringToFront etc.), but whether the
 * relative stacking order among the copies survives copy-pasting several overlapping
 * shapes at once had no coverage. cloneObjects returns the new ids in the same order as
 * rootIds (back -> front z-order), and handlePaste pushes them onto the end of rootIds
 * (frontmost). A shuffled order would swap the copies' overlap, so the DOM order
 * (= stacking order) A' < B' < C' is what is guarded.
 */

/** Extracts the center (e,f) out of transform="matrix(a,b,c,d,e,f)" */
function centerOf(transform: string | null): { x: number; y: number } {
	const nums = transform?.match(/-?\d+(?:\.\d+)?/g)?.map(Number);
	if (!nums || nums.length < 6) {
		throw new Error(`cannot parse transform: ${transform}`);
	}
	return { x: nums[4], y: nums[5] };
}

/** Finds in `after` the id of the copy whose center matches `expected` within 1px */
function findCopyId(
	after: ObjectSnapshot[],
	beforeIds: Set<string>,
	expected: { x: number; y: number },
): string {
	const copy = after.find((o) => {
		if (o.id === null || beforeIds.has(o.id)) {
			return false;
		}
		const c = centerOf(o.transform);
		return Math.abs(c.x - expected.x) <= 1 && Math.abs(c.y - expected.y) <= 1;
	});
	if (!copy?.id) {
		throw new Error(
			`no copied shape found at center (${expected.x},${expected.y})`,
		);
	}
	return copy.id;
}

test.describe("copy & paste preserves stacking order", () => {
	test("keeps the same stacking order among the copies when 3 overlapping shapes are copy-pasted together", async ({
		canvas,
	}) => {
		// Draw 3 overlapping rectangles back to front (A->B->C). Draw order = z-order.
		const a = await canvas.drawShape(
			"Rectangle",
			{ x: 300, y: 200 },
			{ x: 400, y: 300 },
		); // center (350,250)
		await canvas.deselect();
		const b = await canvas.drawShape(
			"Rectangle",
			{ x: 340, y: 220 },
			{ x: 440, y: 320 },
		); // center (390,270)
		await canvas.deselect();
		const c = await canvas.drawShape(
			"Rectangle",
			{ x: 380, y: 240 },
			{ x: 480, y: 340 },
		); // center (430,290)
		await canvas.deselect();

		// The original stacking order (A < B < C).
		expect(await canvas.objectIndex(a)).toBeLessThan(
			await canvas.objectIndex(b),
		);
		expect(await canvas.objectIndex(b)).toBeLessThan(
			await canvas.objectIndex(c),
		);

		const beforeIds = new Set(
			(await canvas.captureObjects())
				.map((o) => o.id)
				.filter((id): id is string => id !== null),
		);

		// Select all, copy & paste -> 6 shapes.
		await canvas.selectAll();
		await canvas.copy();
		await canvas.paste();
		await expect
			.poll(async () => (await canvas.captureObjects()).length, {
				message: "copy-paste adds 3 shapes for a total of 6",
			})
			.toBe(6);

		// Each copy is offset +20,+20 from its source; identify the copies by center.
		const after = await canvas.captureObjects();
		const copyA = findCopyId(after, beforeIds, { x: 370, y: 270 });
		const copyB = findCopyId(after, beforeIds, { x: 410, y: 290 });
		const copyC = findCopyId(after, beforeIds, { x: 450, y: 310 });

		// The copies keep the original stacking order (A' < B' < C').
		expect(await canvas.objectIndex(copyA)).toBeLessThan(
			await canvas.objectIndex(copyB),
		);
		expect(await canvas.objectIndex(copyB)).toBeLessThan(
			await canvas.objectIndex(copyC),
		);
		// The copies sit in front of the originals (even the backmost copy A' is above
		// the frontmost original C).
		expect(await canvas.objectIndex(copyA)).toBeGreaterThan(
			await canvas.objectIndex(c),
		);
	});
});
