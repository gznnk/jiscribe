import { SECOND_RECT, SINGLE_RECT, twoRectDoc } from "../support/canvasDocs";
import { countMarkerPixels, MARKER_FILL } from "../support/capturedPng";
import { expect, test } from "../support/fixtures";

// capture_canvas given ids, a rect or the selection answers with that part of the
// drawing, and says which world rect the picture covers. The region is checked
// through the page itself: one rect is painted red, and a picture of the other
// one must hold none of that red.

/** The margin the canvas keeps around ids on a document declaring no view.padding */
const EXPORT_MARGIN = 16;

/** The world rect and pixel size the answer names, as `covering world rect (x, y) w x h px at W x H px` */
const parseCoverage = (
	text: string,
): {
	x: number;
	y: number;
	width: number;
	height: number;
	pixelWidth: number;
	pixelHeight: number;
} => {
	const match = text.match(
		/covering world rect \((-?[\d.]+), (-?[\d.]+)\) ([\d.]+) x ([\d.]+) px at ([\d.]+) x ([\d.]+) px/,
	);
	if (match === null) {
		throw new Error(`capture_canvas named no coverage: ${text}`);
	}
	const [, x, y, width, height, pixelWidth, pixelHeight] = match.map(Number);
	return { x, y, width, height, pixelWidth, pixelHeight };
};

test("captures only the extent of the ids it is given", async ({
	page,
	mcp,
	workspace,
	openInViewer,
}) => {
	const filePath = await workspace.writeDoc("drawing.jis.json", twoRectDoc());
	await openInViewer(filePath);
	const styled = await mcp.callTool("set_style", {
		path: filePath,
		ids: [SECOND_RECT.id],
		fill: MARKER_FILL,
	});
	expect(styled.text).not.toContain("error:");

	const ofFirst = await mcp.callTool("capture_canvas", {
		ids: [SINGLE_RECT.id],
	});
	expect(ofFirst.isError).toBe(false);
	expect(ofFirst.text).toContain(`captured "${SINGLE_RECT.id}"`);
	expect(ofFirst.text).toContain("cropped, not filtered");
	const coverage = parseCoverage(ofFirst.text);
	expect(coverage.x).toBeCloseTo(SINGLE_RECT.x - EXPORT_MARGIN, 0);
	expect(coverage.y).toBeCloseTo(SINGLE_RECT.y - EXPORT_MARGIN, 0);
	expect(coverage.width).toBeCloseTo(SINGLE_RECT.width + 2 * EXPORT_MARGIN, 0);
	expect(coverage.height).toBeCloseTo(
		SINGLE_RECT.height + 2 * EXPORT_MARGIN,
		0,
	);
	// Drawn at 1:1, so the picture is as many pixels as the rect is world px
	expect(coverage.pixelWidth).toBeCloseTo(coverage.width, 0);
	expect(coverage.pixelHeight).toBeCloseTo(coverage.height, 0);
	expect(await countMarkerPixels(page, ofFirst)).toBe(0);

	const ofSecond = await mcp.callTool("capture_canvas", {
		ids: [SECOND_RECT.id],
	});
	expect(await countMarkerPixels(page, ofSecond)).toBeGreaterThan(0);
});

test("captures a world rect exactly as given", async ({
	page,
	mcp,
	workspace,
	openInViewer,
}) => {
	const filePath = await workspace.writeDoc("drawing.jis.json", twoRectDoc());
	await openInViewer(filePath);
	await mcp.callTool("set_style", {
		path: filePath,
		ids: [SECOND_RECT.id],
		fill: MARKER_FILL,
	});

	const rect = { x: 460, y: 20, width: 160, height: 120 };
	const captured = await mcp.callTool("capture_canvas", { rect });
	expect(captured.isError).toBe(false);
	expect(parseCoverage(captured.text)).toEqual({
		...rect,
		pixelWidth: rect.width,
		pixelHeight: rect.height,
	});
	expect(await countMarkerPixels(page, captured)).toBeGreaterThan(0);
});

test("captures what the user has selected", async ({
	page,
	mcp,
	workspace,
	openInViewer,
}) => {
	const filePath = await workspace.writeDoc("drawing.jis.json", twoRectDoc());
	await openInViewer(filePath);
	await mcp.callTool("set_style", {
		path: filePath,
		ids: [SECOND_RECT.id],
		fill: MARKER_FILL,
	});

	const unselected = await mcp.callTool("capture_canvas", {
		target: "selection",
	});
	expect(unselected.text).toContain("error:");
	expect(unselected.text).toContain("nothing is selected");

	const selected = await mcp.callTool("select_objects", {
		ids: [SINGLE_RECT.id],
	});
	expect(selected.text).not.toContain("error:");
	const captured = await mcp.callTool("capture_canvas", {
		target: "selection",
	});
	expect(captured.text).toContain("captured the 1 selected object(s)");
	expect(await countMarkerPixels(page, captured)).toBe(0);
});

test("refuses a region there is nothing to capture in, naming the reason", async ({
	mcp,
	workspace,
	openInViewer,
}) => {
	const filePath = await workspace.writeDoc("drawing.jis.json", twoRectDoc());
	await openInViewer(filePath);

	const missing = await mcp.callTool("capture_canvas", { ids: ["no-such-id"] });
	expect(missing.text).toContain("error:");
	expect(missing.text).toContain('nothing to capture at "no-such-id"');

	const flat = await mcp.callTool("capture_canvas", {
		rect: { x: 0, y: 0, width: 100, height: 0 },
	});
	expect(flat.text).toContain("error:");
	expect(flat.text).toContain("no extent");

	const both = await mcp.callTool("capture_canvas", {
		ids: [SINGLE_RECT.id],
		rect: { x: 0, y: 0, width: 100, height: 100 },
	});
	expect(both.text).toContain("error:");
	expect(both.text).toContain("at most one of target, ids and rect");
});

test("fit_view frames the ids it is given", async ({
	mcp,
	workspace,
	openInViewer,
}) => {
	const filePath = await workspace.writeDoc("drawing.jis.json", twoRectDoc());
	await openInViewer(filePath);

	const fitted = await mcp.callTool("fit_view", { ids: [SECOND_RECT.id] });
	expect(fitted.text).not.toContain("error:");
	expect(fitted.text).toContain(`fitted the view around "${SECOND_RECT.id}"`);

	const view = await mcp.callTool("get_view", {});
	// The view was fitted around the second rect, so its left edge is past the first one
	const match = view.text.match(/starts at \((-?[\d.]+), (-?[\d.]+)\)/);
	expect(match, view.text).not.toBeNull();
	expect(Number(match?.[1])).toBeGreaterThan(SINGLE_RECT.x + SINGLE_RECT.width);
});
