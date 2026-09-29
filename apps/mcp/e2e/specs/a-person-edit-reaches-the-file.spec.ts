import { SINGLE_RECT, singleRectDoc } from "../support/canvasDocs";
import {
	expect,
	expectNoViewerError,
	selectObject,
	test,
} from "../support/fixtures";

/** One large nudge, which the canvas moves the selection by */
const NUDGE_STEP = 10;

test("writes an edit made in the page back to the file", async ({
	page,
	canvas,
	mcp,
	workspace,
	openInViewer,
}) => {
	const filePath = await workspace.writeDoc(
		"drawing.jis.json",
		singleRectDoc(),
	);
	await openInViewer(filePath);

	await selectObject(canvas, SINGLE_RECT.id);
	await canvas.nudge("right", { large: true });

	const movedX = SINGLE_RECT.x + NUDGE_STEP;
	// Polled rather than waited out: the write goes out after the save debounce,
	// and the file is what says it arrived
	await expect
		.poll(async () => (await workspace.readDoc(filePath)).root[0].x, {
			message: "the nudge reaches the file once the save debounce elapses",
		})
		.toBe(movedX);

	// What a tool reading the file now sees has to be the same move, since the file
	// is the one thing either side reads
	const described = await mcp.callTool("describe_canvas", { path: filePath });
	expect(described.isError).toBe(false);
	const describedDoc: unknown = JSON.parse(described.text);
	expect(describedDoc).toMatchObject({
		root: [{ id: SINGLE_RECT.id, x: movedX }],
	});

	await expectNoViewerError(page);
});
