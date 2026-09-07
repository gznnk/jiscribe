import { test, expect } from "@jiscribe/canvas-sdk/testing/e2e";
import type { CanvasDriver } from "@jiscribe/canvas-sdk/testing/e2e";

/** The frame category put on the toolbar (awsGroupStencilCategory.id). */
const CATEGORY = "aws-group";

const VPC_PRESET = "awsGroupVpc";
const AVAILABILITY_ZONE_PRESET = "awsGroupAvailabilityZone";

/**
 * How the border is drawn. The border is the only rect with a coloured line (the
 * body and the header hit area are stroke: none, the border's hit area a
 * transparent one). The colour arrives as emotion CSS, so it is read off the
 * computed style rather than an attribute.
 */
const readOutlineStyle = async (
	canvas: CanvasDriver,
	id: string,
): Promise<{ stroke: string; strokeDasharray: string } | null> =>
	canvas.page.evaluate((targetId) => {
		const group = document.querySelector(`[data-id="${targetId}"]`);
		if (group === null) {
			return null;
		}
		const outline = [...group.querySelectorAll("rect")].find((rect) => {
			const { stroke } = getComputedStyle(rect);
			return stroke !== "none" && stroke !== "rgba(0, 0, 0, 0)";
		});
		if (outline === undefined) {
			return null;
		}
		const style = getComputedStyle(outline);
		return { stroke: style.stroke, strokeDasharray: style.strokeDasharray };
	}, id);

/** The top-left corner badge. The drawing goes in a `<g>`, and a kind without one has none. */
const cornerBadge = (canvas: CanvasDriver, id: string) =>
	canvas.page.locator(`[data-id="${id}"] g`);

test.describe("drawing an awsGroup", () => {
	test("a VPC is drawn with the kind's solid purple line and its badge", async ({
		canvas,
	}) => {
		const id = await canvas.drawShapeFromFlyout(
			CATEGORY,
			VPC_PRESET,
			{ x: 300, y: 220 },
			{ x: 640, y: 440 },
		);

		// The colour follows the kind rather than a type default (one default
		// cannot express nineteen kinds).
		const outline = await readOutlineStyle(canvas, id);
		expect(outline?.stroke).toBe(await canvas.normalizeColor("#8C4FFF"));

		expect(await cornerBadge(canvas, id).count()).toBeGreaterThan(0);
	});

	test("an availability zone is dashed and carries no badge", async ({
		canvas,
	}) => {
		const id = await canvas.drawShapeFromFlyout(
			CATEGORY,
			AVAILABILITY_ZONE_PRESET,
			{ x: 300, y: 220 },
			{ x: 640, y: 440 },
		);

		const outline = await readOutlineStyle(canvas, id);
		expect(outline?.strokeDasharray).toBeTruthy();
		expect(outline?.strokeDasharray).not.toBe("none");

		// AWS draws this frame without a badge too: the line's colour and style
		// are the whole difference.
		await expect(cornerBadge(canvas, id)).toHaveCount(0);
	});
});
