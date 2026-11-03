import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * A connector label with no `fill` knocks the line out in the page's color: the
 * document's opaque `background`, or the theme's canvas color when the document
 * sets none or sets one that lets the theme color show through.
 *
 * - Without a background the box is the harness theme's canvas color
 * - Setting the background from the properties sidebar paints the box in it, and
 *   undo or picking Auto takes the box back to the theme color
 * - A see-through background (`transparent`, alpha below 1) or one the browser
 *   does not parse as a color leaves the theme color in place
 * - A label with a `fill` of its own keeps it
 * - The inline label editor draws its box in the same color as the label
 */

/** The harness mounts darkCanvasTheme, whose canvasBg is #1e1e1e. */
const THEME_CANVAS_BG = "rgb(30, 30, 30)";

/** A document background far from the theme color, as the sidebar writes it. */
const DOC_BACKGROUND_HEX = "#dc2626";
const DOC_BACKGROUND = "rgb(220, 38, 38)";

/** The fill of the label that sets its own; distinct from both colors above. */
const OWN_LABEL_FILL = "rgb(59, 130, 246)";

const DEFAULT_LABEL_CONNECTOR_ID = "default-label";
const OWN_FILL_LABEL_CONNECTOR_ID = "own-fill-label";

/** Two connectors, one label leaving `fill` unset and one setting it. */
const buildDocText = (background?: string): string =>
	JSON.stringify({
		version: 1,
		...(background !== undefined ? { background } : {}),
		root: [
			{
				id: "upper-source",
				type: "rect",
				x: 100,
				y: 100,
				width: 80,
				height: 60,
			},
			{
				id: "upper-target",
				type: "rect",
				x: 500,
				y: 100,
				width: 80,
				height: 60,
			},
			{
				id: "lower-source",
				type: "rect",
				x: 100,
				y: 350,
				width: 80,
				height: 60,
			},
			{
				id: "lower-target",
				type: "rect",
				x: 500,
				y: 350,
				width: 80,
				height: 60,
			},
			{
				id: DEFAULT_LABEL_CONNECTOR_ID,
				type: "connector",
				points: [],
				routing: "straight",
				source: { owner: { id: "upper-source" }, anchor: { kind: "center" } },
				target: { owner: { id: "upper-target" }, anchor: { kind: "center" } },
				label: { text: "Yes" },
			},
			{
				id: OWN_FILL_LABEL_CONNECTOR_ID,
				type: "connector",
				points: [],
				routing: "straight",
				source: { owner: { id: "lower-source" }, anchor: { kind: "center" } },
				target: { owner: { id: "lower-target" }, anchor: { kind: "center" } },
				label: { text: "No", fill: "#3b82f6" },
			},
		],
	});

const loadDoc = async (canvas: CanvasDriver, docText: string) => {
	await canvas.page.evaluate((text) => {
		const hook = (
			window as unknown as { __setHarnessDoc?: (docText: string) => void }
		).__setHarnessDoc;
		if (!hook) {
			throw new Error(
				"__setHarnessDoc is undefined (harness hook not installed)",
			);
		}
		hook(text);
	}, docText);
	await expect(labelBoxOf(canvas, DEFAULT_LABEL_CONNECTOR_ID)).toHaveCount(1);
};

/** The label box (the LabelBox div inside the label's foreignObject). */
const labelBoxOf = (canvas: CanvasDriver, connectorId: string) =>
	canvas.page
		.locator(
			`foreignObject[data-kind=connector][data-action=label][data-id="${connectorId}"]`,
		)
		.locator("div")
		.first();

/**
 * Sets the document background through the properties sidebar's Canvas section.
 * The picker stays open after a pick, so the trigger is pressed only while it is
 * closed (pressing it again would close it).
 */
const pickDocBackground = async (canvas: CanvasDriver, value: string) => {
	const swatch = canvas.page.locator(
		selectors.propertyPanelSet("background", value),
	);
	if (!(await swatch.isVisible())) {
		await canvas.page
			.locator(`${selectors.propertyPanel} [aria-label="Background"]`)
			.click();
	}
	await swatch.click();
};

test.describe("connector label background follows the document background", () => {
	test("paints an unset label fill in the document background, and undo or Auto restores the theme color", async ({
		canvas,
	}) => {
		await loadDoc(canvas, buildDocText());
		const defaultLabelBox = labelBoxOf(canvas, DEFAULT_LABEL_CONNECTOR_ID);
		const ownFillLabelBox = labelBoxOf(canvas, OWN_FILL_LABEL_CONNECTOR_ID);
		await expect(defaultLabelBox).toHaveCSS(
			"background-color",
			THEME_CANVAS_BG,
		);
		await expect(ownFillLabelBox).toHaveCSS("background-color", OWN_LABEL_FILL);

		await canvas.openPropertyPanel();
		await pickDocBackground(canvas, DOC_BACKGROUND_HEX);
		await expect(defaultLabelBox).toHaveCSS("background-color", DOC_BACKGROUND);
		await expect(
			ownFillLabelBox,
			"a label with a fill of its own keeps it",
		).toHaveCSS("background-color", OWN_LABEL_FILL);

		await canvas.page.keyboard.press("Control+z");
		await expect(
			defaultLabelBox,
			"undo drops the background and with it the override",
		).toHaveCSS("background-color", THEME_CANVAS_BG);

		await pickDocBackground(canvas, DOC_BACKGROUND_HEX);
		await expect(defaultLabelBox).toHaveCSS("background-color", DOC_BACKGROUND);
		await pickDocBackground(canvas, "auto");
		await expect(
			defaultLabelBox,
			"Auto drops the background and with it the override",
		).toHaveCSS("background-color", THEME_CANVAS_BG);
	});

	for (const background of [
		"transparent",
		"rgba(220, 38, 38, 0.5)",
		"#dc262680",
		"auto",
	]) {
		test(`keeps the theme color under the background ${background}`, async ({
			canvas,
		}) => {
			await loadDoc(canvas, buildDocText(background));
			await expect(labelBoxOf(canvas, DEFAULT_LABEL_CONNECTOR_ID)).toHaveCSS(
				"background-color",
				THEME_CANVAS_BG,
			);
		});
	}

	test("draws the inline label editor in the document background", async ({
		canvas,
	}) => {
		await loadDoc(canvas, buildDocText(DOC_BACKGROUND_HEX));
		const labelBox = labelBoxOf(canvas, DEFAULT_LABEL_CONNECTOR_ID);
		await expect(labelBox).toHaveCSS("background-color", DOC_BACKGROUND);

		await labelBox.dblclick();
		await expect(canvas.textEditorSurface()).toHaveValue("Yes");
		await expect(canvas.page.locator(selectors.textEditor)).toHaveCSS(
			"background-color",
			DOC_BACKGROUND,
		);
	});
});
