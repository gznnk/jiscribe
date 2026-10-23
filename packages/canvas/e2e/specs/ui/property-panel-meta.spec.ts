import type * as CanvasModule from "@jiscribe/canvas";
import { extractCanvasSourceFromSvgText } from "@jiscribe/doc/svg-source";

import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * The Meta section of the properties sidebar: the name and description the
 * selected object carries in the document.
 *
 * Nothing is drawn from a note, so what a typed name landed on the object is
 * read back the only way the drawing can show it — by leaving the selection and
 * coming back, which redraws the rows off the object rather than off what the
 * field is holding.
 *
 * The section also carries the "open reference" button for an object whose note
 * names a `meta.reference`; the harness stands in for the host and logs what a
 * press hands over (`window.__openedReferences`).
 */

/** The rectangle the tests draw: 200 x 130, clear of the panel's own width. */
const RECT_FROM = { x: 120, y: 150 };
const RECT_TO = { x: 320, y: 280 };

/** A point inside the drawn rectangle, for selecting it back. */
const RECT_INSIDE = { x: 220, y: 215 };

/** The reference the injected rectangle names, handed to the host untouched. */
const REFERENCE = "notes/server.md";

/** A point inside the injected rectangle that carries a reference. */
const REFERENCED_INSIDE = { x: 220, y: 215 };

/** A point inside the injected rectangle that carries none. */
const UNREFERENCED_INSIDE = { x: 430, y: 195 };

/**
 * Two rectangles, one naming a reference in its note and one not. Injected
 * because nothing in the sidebar writes a reference. Opaque, so a press inside
 * lands on a painted face.
 */
const referenceDocText = JSON.stringify({
	version: 1,
	root: [
		{
			id: "referenced-rect",
			type: "rect",
			x: RECT_FROM.x,
			y: RECT_FROM.y,
			width: RECT_TO.x - RECT_FROM.x,
			height: RECT_TO.y - RECT_FROM.y,
			fill: "#cbd5e1",
			meta: { name: "Server", reference: REFERENCE },
		},
		{
			id: "unreferenced-rect",
			type: "rect",
			x: 380,
			y: 150,
			width: 100,
			height: 90,
			fill: "#cbd5e1",
		},
	],
});

/** The window globals mountPluginHarness installs that this spec reads. */
type HarnessWindow = {
	__canvasHandle?: CanvasModule.CanvasHandle | null;
	__setHarnessDoc?: (docText: string) => void;
	__openedReferences?: CanvasModule.OpenReferencePayload[];
};

async function loadDoc(canvas: CanvasDriver, docText: string) {
	await canvas.page.evaluate((text) => {
		const hook = (window as unknown as HarnessWindow).__setHarnessDoc;
		if (!hook) {
			throw new Error(
				"__setHarnessDoc is undefined (harness hook not installed)",
			);
		}
		hook(text);
	}, docText);
}

async function openedReferences(
	canvas: CanvasDriver,
): Promise<CanvasModule.OpenReferencePayload[]> {
	return canvas.page.evaluate(
		() => (window as unknown as HarnessWindow).__openedReferences ?? [],
	);
}

/**
 * What an SVG export holds of the document's note: the `meta` of the `.jis` source
 * it embeds — the same state-to-document conversion a save goes through — and
 * the `<title>` it opens with.
 */
async function exportedDocumentMeta(canvas: CanvasDriver): Promise<{
	meta: CanvasModule.CanvasDoc["meta"] | null;
	title: string | null;
}> {
	const svgText = await canvas.page.evaluate(() => {
		const handle = (window as unknown as HarnessWindow).__canvasHandle;
		if (!handle) {
			throw new Error(
				"__canvasHandle is undefined (harness hook not installed)",
			);
		}
		return handle.export.toSvgString();
	});
	if (svgText === null) {
		throw new Error("the canvas is not mounted");
	}
	const sourceText = extractCanvasSourceFromSvgText(svgText);
	if (sourceText === null) {
		throw new Error("the export embeds no source");
	}
	return {
		meta: (JSON.parse(sourceText) as CanvasModule.CanvasDoc).meta ?? null,
		title: /<title>([^<]*)<\/title>/.exec(svgText)?.[1] ?? null,
	};
}

test.describe("Properties sidebar meta section", () => {
	test("writes a typed name onto the selected object, and one undo takes it back", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", RECT_FROM, RECT_TO);
		await canvas.openPropertyPanel();
		const name = canvas.page.locator(selectors.propertyPanelField("metaName"));
		await expect(name).toHaveValue("");

		await name.fill("Server");
		// The blur is what commits, so the focus has to leave the field first.
		await canvas.page.locator(selectors.propertyPanelHeader).click();

		// Off the selection and back, so the row is drawn from the object's own
		// meta rather than from the text the field was left holding.
		await canvas.deselect();
		await expect(
			canvas.page.locator(selectors.propertyPanelSection("meta")),
			"the section goes with the selection",
		).toHaveCount(0);
		await canvas.selectAt(RECT_INSIDE);
		await expect(name).toHaveValue("Server");

		await canvas.undo();
		await expect(name).toHaveValue("");
	});

	test("stands only for a selection naming one object", async ({ canvas }) => {
		await canvas.drawShape("Rectangle", RECT_FROM, RECT_TO);
		await canvas.drawShape("Rectangle", { x: 380, y: 150 }, { x: 480, y: 240 });
		await canvas.openPropertyPanel();
		const section = canvas.page.locator(selectors.propertyPanelSection("meta"));
		await expect(section, "one object, one note").toBeVisible();

		await canvas.selectAll();
		await expect(
			section,
			"a note belongs to one object, so a multi-selection has none",
		).toHaveCount(0);

		await canvas.deselect();
		await expect(
			section,
			"and the canvas section is what stands with nothing selected",
		).toHaveCount(0);
	});

	test("hands the object's reference to the host from the open-reference button", async ({
		canvas,
	}) => {
		await loadDoc(canvas, referenceDocText);
		await expect(canvas.objectById("referenced-rect")).toHaveCount(1);
		await canvas.openPropertyPanel();
		const openReference = canvas.page
			.locator(selectors.propertyPanel)
			.getByRole("button", { name: "Open Reference" });

		await canvas.selectAt(UNREFERENCED_INSIDE);
		await expect(
			canvas.page.locator(selectors.propertyPanelSection("meta")),
		).toBeVisible();
		await expect(
			openReference,
			"an object naming no reference offers nothing to open",
		).toHaveCount(0);

		await canvas.selectAt(REFERENCED_INSIDE);
		await openReference.click();
		await expect
			.poll(() => openedReferences(canvas))
			.toEqual([{ objectId: "referenced-rect", reference: REFERENCE }]);
		await expect(
			canvas.page.locator(selectors.propertyPanelField("metaName")),
			"the press leaves the selection and the panel as they were",
		).toHaveValue("Server");
	});
});

test.describe("Properties sidebar canvas section, the document's note", () => {
	test("writes a typed name and description onto the document, and one undo per field takes them back", async ({
		canvas,
	}) => {
		await canvas.openPropertyPanel();
		const name = canvas.page.locator(
			selectors.propertyPanelField("canvasMetaName"),
		);
		const description = canvas.page.locator(
			selectors.propertyPanelField("canvasMetaDescription"),
		);
		await expect(name).toHaveValue("");
		expect(await exportedDocumentMeta(canvas)).toEqual({
			meta: null,
			title: null,
		});

		await name.fill("Order flow");
		await canvas.page.locator(selectors.propertyPanelHeader).click();
		await description.fill("From cart\nto shipment");
		await canvas.page.locator(selectors.propertyPanelHeader).click();

		await expect
			.poll(() => exportedDocumentMeta(canvas))
			.toEqual({
				meta: { name: "Order flow", description: "From cart\nto shipment" },
				title: "Order flow",
			});

		await canvas.undo();
		await expect(description).toHaveValue("");
		await canvas.undo();
		await expect(name).toHaveValue("");
		await expect
			.poll(() => exportedDocumentMeta(canvas))
			.toEqual({ meta: null, title: null });
	});
});
