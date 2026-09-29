import { SINGLE_RECT } from "../support/canvasDocs";
import {
	expect,
	expectNoViewerError,
	selectObject,
	test,
} from "../support/fixtures";

/** One large nudge, which the canvas moves the selection by */
const NUDGE_STEP = 10;

/** A shape from a plugin the viewer does not ship, as a newer build wrote it */
const UNKNOWN_OBJECT = {
	id: "gadget-1",
	type: "gadget",
	x: 300,
	y: 40,
	width: 60,
	height: 40,
	gearCount: 3,
};

/** A connector from the rectangle to the unknown shape, which the page cannot draw */
const CONNECTOR_TO_UNKNOWN = {
	id: "connector-1",
	type: "connector",
	points: [],
	source: { owner: { id: SINGLE_RECT.id }, anchor: { kind: "center" } },
	target: { owner: { id: UNKNOWN_OBJECT.id }, anchor: { kind: "center" } },
};

test("keeps a shape of a type the page does not know when a person's edit is saved", async ({
	page,
	canvas,
	workspace,
	openInViewer,
}) => {
	const filePath = await workspace.writeDoc("drawing.jis.json", {
		version: 1,
		root: [
			{ type: "rect", ...SINGLE_RECT, text: "hello" },
			UNKNOWN_OBJECT,
			CONNECTOR_TO_UNKNOWN,
		],
	});
	await openInViewer(filePath);

	await selectObject(canvas, SINGLE_RECT.id);
	await canvas.nudge("right", { large: true });

	await expect
		.poll(async () => (await workspace.readDoc(filePath)).root[0].x, {
			message: "the nudge reaches the file once the save debounce elapses",
		})
		.toBe(SINGLE_RECT.x + NUDGE_STEP);

	// The save that carried the nudge wrote the page's document whole, so what it
	// does not draw has to have gone out with it, where it was and as it was
	const saved = await workspace.readDoc(filePath);
	expect(saved.root.slice(1)).toEqual([UNKNOWN_OBJECT, CONNECTOR_TO_UNKNOWN]);

	await expectNoViewerError(page);
});
