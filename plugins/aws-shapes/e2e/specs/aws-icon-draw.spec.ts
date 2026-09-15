import { test, expect } from "@jiscribe/canvas-sdk/testing/e2e";
import type { CanvasDriver } from "@jiscribe/canvas-sdk/testing/e2e";

/** The icon category put on the toolbar (awsStencilCategory.id). */
const CATEGORY = "aws";

/** S3's preset id: `awsIcon` with the icon name in PascalCase after it. */
const S3_PRESET = "awsIconServiceAmazonSimpleStorageService";

/**
 * The box's own size. `boundingBox()` takes the label's hit area in as well and
 * so cannot tell whether the box is square. The first rect is the box-filling
 * hit area (AwsIconHitArea).
 */
const readBoxSize = async (
	canvas: CanvasDriver,
	id: string,
): Promise<{ width: number; height: number } | null> =>
	canvas.page.evaluate((targetId) => {
		const rect = document.querySelector(`[data-id="${targetId}"] rect`);
		if (rect === null) {
			return null;
		}
		return {
			width: Number(rect.getAttribute("width")),
			height: Number(rect.getAttribute("height")),
		};
	}, id);

test.describe("drawing an awsIcon", () => {
	test("placing one from the palette gives a <g> labelled with the short name", async ({
		canvas,
	}) => {
		// awsIcon is supportsBounds: false, so a click alone places it.
		const id = await canvas.placeShapeFromFlyout(CATEGORY, S3_PRESET);
		const created = (await canvas.captureObjects()).find(
			(obj) => obj.id === id,
		);
		expect(created?.tag).toBe("g");

		// The label is the short name the stencil's defaultOverrides puts in, not a
		// type default (in the type every awsIcon would go by the same name).
		await expect
			.poll(async () => (await canvas.drawnTextRuns(id)).map((run) => run.text))
			.toContain("S3");
	});

	test("the placed icon draws its picture", async ({ canvas }) => {
		const id = await canvas.placeShapeFromFlyout(CATEGORY, S3_PRESET);

		// The asset is drawn with paths. Nothing but the hit area's rect means the
		// picture never came up.
		const shape = canvas.objectById(id);
		await expect(shape.locator("path").first()).toBeAttached();
	});

	test("dragging a corner leaves the box square", async ({ canvas }) => {
		const id = await canvas.placeShapeFromFlyout(CATEGORY, S3_PRESET);
		const before = await readBoxSize(canvas, id);
		const hitArea = await canvas.page
			.locator(`[data-id="${id}"] rect`)
			.first()
			.boundingBox();
		if (before === null || hitArea === null) {
			throw new Error("the icon is not laid out");
		}

		// Pull further sideways than down. The drawing fits the shorter side
		// uniformly, so an unlocked ratio would leave nothing but unusable margin
		// beside it (hence lockAspectRatio by default).
		await canvas.dragTransformHandle(
			"bottomRight",
			canvas.toContent({
				x: hitArea.x + hitArea.width * 3,
				y: hitArea.y + hitArea.height * 1.2,
			}),
		);

		const after = await readBoxSize(canvas, id);
		expect(after?.width).toBeGreaterThan(before.width);
		expect(Math.round(after?.width ?? 0)).toBe(Math.round(after?.height ?? 0));
	});
});
