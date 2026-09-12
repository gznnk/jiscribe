import { test, expect, selectors } from "@jiscribe/canvas-sdk/testing/e2e";
import type { CanvasDriver } from "@jiscribe/canvas-sdk/testing/e2e";

/**
 * Guards the core behavior of the container ("frame") shape:
 * - frame / boundary / zone can be created from the container flyout and render as a composite <g>
 * - the body passes clicks through, so only the header band selects it (pass-through)
 * - the boundary preset gets a dashed border
 * - the plugin's own properties-sidebar rows state the header color and the header height
 *
 * Moving children together is the existing group's job, so it is not checked here.
 */

const CATEGORY = "container";

/** A preset swatch of the color picker, so the click lands one committed value. */
const HEADER_BLUE = "#3b82f6";

/** Creates presetId from the container flyout by diagonal drag and returns the new object's {id, tag}. */
async function createFromFlyout(
	canvas: CanvasDriver,
	presetId: string,
	from: { x: number; y: number },
	to: { x: number; y: number },
): Promise<{ id: string; tag: string }> {
	const before = await canvas.captureObjects();
	const beforeIds = new Set(before.map((obj) => obj.id));

	await canvas.page.click(selectors.categoryButton(CATEGORY));
	const item = canvas.page.locator(selectors.shapeItem(presetId));
	await expect(item).toBeVisible();
	await item.click();
	await expect
		.poll(() => canvas.isDrawingMode(), {
			message: `clicking ${presetId} enters draw mode`,
		})
		.toBe(true);

	await canvas.drag(from, to);
	await expect
		.poll(async () => (await canvas.captureObjects()).length, {
			message: `exactly one ${presetId} is created`,
		})
		.toBe(before.length + 1);

	const created = (await canvas.captureObjects()).find(
		(obj) => !beforeIds.has(obj.id),
	);
	if (!created?.id) {
		throw new Error(`the shape created for ${presetId} has no data-id`);
	}
	return { id: created.id, tag: created.tag };
}

test.describe("container palette / behavior", () => {
	test("creates frame / boundary / zone from the flyout as composite <g> elements", async ({
		canvas,
	}) => {
		const frame = await createFromFlyout(
			canvas,
			"frame",
			{ x: 300, y: 220 },
			{ x: 520, y: 380 },
		);
		expect(frame.tag).toBe("g");

		const boundary = await createFromFlyout(
			canvas,
			"boundary",
			{ x: 560, y: 220 },
			{ x: 780, y: 380 },
		);
		expect(boundary.tag).toBe("g");

		const zone = await createFromFlyout(
			canvas,
			"zone",
			{ x: 300, y: 420 },
			{ x: 520, y: 560 },
		);
		expect(zone.tag).toBe("g");
	});

	test("passes clicks through the body and selects only on the header band", async ({
		canvas,
	}) => {
		// Container of height 220. The header band is the top 28px (content coordinates y=[220,248]).
		await createFromFlyout(
			canvas,
			"frame",
			{ x: 300, y: 220 },
			{ x: 560, y: 440 },
		);
		// Auto-selected right after creation, so controls are showing.
		await expect(canvas.page.locator(selectors.control).first()).toBeVisible();

		// A click on the body (inside, below the header) falls through to the canvas and clears the selection.
		await canvas.clickAt({ x: 430, y: 350 });
		await expect(canvas.page.locator(selectors.control)).toHaveCount(0);

		// A click on the header band selects the container.
		await canvas.clickAt({ x: 430, y: 232 });
		await expect(canvas.page.locator(selectors.control).first()).toBeVisible();
	});

	test("renders the boundary preset with a dashed border", async ({
		canvas,
	}) => {
		const boundary = await createFromFlyout(
			canvas,
			"boundary",
			{ x: 300, y: 220 },
			{ x: 560, y: 400 },
		);
		// The outline rect (the fill:none frame) carries a stroke-dasharray.
		const dash = await canvas.page.evaluate((id) => {
			const group = document.querySelector(`[data-id="${id}"]`);
			if (!group) {
				return null;
			}
			return [...group.querySelectorAll("rect")]
				.map((rect) => getComputedStyle(rect).strokeDasharray)
				.find((value) => value && value !== "none");
		}, boundary.id);
		expect(dash).toBeTruthy();
		expect(dash).not.toBe("none");
	});

	test("draws the header divider at the same width as the border (strokeWidth follows)", async ({
		canvas,
	}) => {
		const frame = await createFromFlyout(
			canvas,
			"frame",
			{ x: 300, y: 220 },
			{ x: 560, y: 420 },
		);
		// The border and the divider must share a stroke-width. Colors are applied
		// through emotion CSS, so attribute selectors cannot reach them and the
		// border rect is identified by its computed fill:none instead.
		const widths = await canvas.page.evaluate((id) => {
			const group = document.querySelector(`[data-id="${id}"]`);
			if (!group) {
				return null;
			}
			const outline = [...group.querySelectorAll("rect")].find(
				(rect) => getComputedStyle(rect).fill === "none",
			);
			const divider = group.querySelector("line");
			return {
				outline: outline ? getComputedStyle(outline).strokeWidth : null,
				divider: divider ? getComputedStyle(divider).strokeWidth : null,
			};
		}, frame.id);
		expect(widths?.divider).toBeTruthy();
		expect(widths?.divider).toBe(widths?.outline);
	});

	test("changes the header height by dragging the handle at the header's bottom edge", async ({
		canvas,
	}) => {
		// Container of height 220. The header's bottom edge sits at content y=248 (28px by default).
		const frame = await createFromFlyout(
			canvas,
			"frame",
			{ x: 300, y: 220 },
			{ x: 560, y: 440 },
		);
		// Selected right after creation, with the header height handle at the middle of that edge.
		await expect(
			canvas.page.locator(
				'[data-kind="control"][data-part="selection:container:headerHeight"]',
			),
		).toBeVisible();

		// Drag the handle 72px down: headerHeight 28 -> 100.
		await canvas.drag({ x: 430, y: 248 }, { x: 430, y: 320 });
		// The header band rect's height attribute takes the new header height (body and border stay 220).
		await expect
			.poll(async () =>
				canvas.page.evaluate((id) => {
					const group = document.querySelector(`[data-id="${id}"]`);
					if (!group) {
						return [];
					}
					return [...group.querySelectorAll("rect")].map((rect) =>
						rect.getAttribute("height"),
					);
				}, frame.id),
			)
			.toContain("100");
	});

	test("changes the header color from the sidebar's own row and undoes it", async ({
		canvas,
	}) => {
		const frame = await createFromFlyout(
			canvas,
			"frame",
			{ x: 300, y: 220 },
			{ x: 560, y: 420 },
		);
		// Fills of every rect the container draws (header, body, border), so the
		// header's own can be told apart by what appears and disappears.
		const rectFills = () =>
			canvas.page.evaluate((id) => {
				const group = document.querySelector(`[data-id="${id}"]`);
				if (!group) {
					return [];
				}
				return [...group.querySelectorAll("rect")].map(
					(rect) => getComputedStyle(rect).fill,
				);
			}, frame.id);

		// The plugin's `header-fill` row: a custom item of the Fill section, whose
		// trigger is named by the plugin's own dictionary.
		await canvas.openPropertyPanel();
		await canvas.page.click(
			`${selectors.propertyPanel} [aria-label="Header Color"]`,
		);
		await canvas.page.click(
			selectors.propertyPanelSet("headerFill", HEADER_BLUE),
		);

		const blue = await canvas.normalizeColor(HEADER_BLUE);
		await expect.poll(rectFills).toContain(blue);

		await canvas.undo();
		await expect.poll(rectFills).not.toContain(blue);

		// The plugin lists its sidebar by hand, so the two opacity rows are checked
		// here rather than trusted to the default panel.
		await expect(
			canvas.page.locator(selectors.propertyPanelField("fillOpacity")),
		).toBeVisible();
		await expect(
			canvas.page.locator(selectors.propertyPanelField("strokeOpacity")),
		).toBeVisible();
	});

	test("states the header height from the sidebar's own row and undoes it", async ({
		canvas,
	}) => {
		const frame = await createFromFlyout(
			canvas,
			"frame",
			{ x: 300, y: 220 },
			{ x: 560, y: 420 },
		);
		// The header band is the second rect the container draws (the body comes
		// first); its height is the number the row states.
		const headerHeight = () =>
			canvas.page.evaluate((id) => {
				const rect = document.querySelectorAll(`[data-id="${id}"] rect`)[1];
				return rect ? Number(rect.getAttribute("height")) : null;
			}, frame.id);
		const before = await headerHeight();

		// The plugin's `header-height` row: a custom item of the Layout section,
		// written as the headerHeight extra style property.
		await canvas.openPropertyPanel();
		const field = canvas.page.locator(
			selectors.propertyPanelField("headerHeight"),
		);
		await expect(field).toHaveValue(String(before));
		await field.fill("48");
		await field.press("Enter");
		await expect.poll(headerHeight).toBe(48);

		await canvas.undo();
		await expect.poll(headerHeight).toBe(before);
	});

	test("changes the header color independently (headerFill)", async ({
		canvas,
	}) => {
		const frame = await createFromFlyout(
			canvas,
			"frame",
			{ x: 300, y: 220 },
			{ x: 560, y: 420 },
		);
		// Selected right after creation, so the ObjectMenu is up. Set the header color to blue.
		await canvas.setColor("header-color", "#3b82f6");
		const blue = await canvas.normalizeColor("#3b82f6");
		// The header rect's fill takes the given color, while body and border keep theirs.
		await expect
			.poll(async () =>
				canvas.page.evaluate((id) => {
					const group = document.querySelector(`[data-id="${id}"]`);
					if (!group) {
						return [];
					}
					return [...group.querySelectorAll("rect")].map(
						(rect) => getComputedStyle(rect).fill,
					);
				}, frame.id),
			)
			.toContain(blue);
	});
});
