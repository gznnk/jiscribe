import { SECOND_RECT, SINGLE_RECT, twoRectDoc } from "../support/canvasDocs";
import {
	expect,
	expectNoViewerError,
	objectCenter,
	test,
} from "../support/fixtures";

/** Where the tool moves the second rectangle while the person works on the first */
const TOOL_POSITION = { x: 700, y: 400 } as const;

/**
 * Long enough for the tool's write to have reached the page: the host's file watch
 * runs every 300 ms. Waited out on time, since a write the page holds back changes
 * nothing on screen to wait on
 */
const PAST_FILE_WATCH_MS = 1_000;

// A regression for an incoming write cutting off what a person had in hand. Any
// write to the file — even one to an object nobody was touching — replaced the
// canvas's doc, which closes the text editor and drops the drag in progress: the
// typed text never reached the file, and the drag went nowhere.

test("keeps the text editor open through a tool's write, and saves both", async ({
	page,
	canvas,
	mcp,
	workspace,
	openInViewer,
}) => {
	const filePath = await workspace.writeDoc("drawing.jis.json", twoRectDoc());
	await openInViewer(filePath);

	await canvas.typeTextAt(await objectCenter(canvas, SINGLE_RECT.id), " typed");
	const moved = await mcp.callTool("set_position", {
		path: filePath,
		id: SECOND_RECT.id,
		...TOOL_POSITION,
	});
	expect(moved.text).not.toContain("error:");
	await page.waitForTimeout(PAST_FILE_WATCH_MS);

	expect(await canvas.textEditorText()).toBe("hello typed");
	await page.keyboard.type(" more");
	await canvas.commitText();

	await expect
		.poll(
			async () => {
				const [edited, toolMoved] = (await workspace.readDoc(filePath)).root;
				return { text: edited.text, toolX: toolMoved.x, toolY: toolMoved.y };
			},
			{ message: "the file holds the typed text and the tool's move both" },
		)
		.toEqual({
			text: "hello typed more",
			toolX: TOOL_POSITION.x,
			toolY: TOOL_POSITION.y,
		});
	await expectNoViewerError(page);
});

test("lets a drag in progress finish through a tool's write, and saves both", async ({
	page,
	canvas,
	mcp,
	workspace,
	openInViewer,
}) => {
	const filePath = await workspace.writeDoc("drawing.jis.json", twoRectDoc());
	await openInViewer(filePath);

	const from = await objectCenter(canvas, SINGLE_RECT.id);
	const halfway = { x: from.x + 60, y: from.y + 40 };
	const to = { x: from.x + 150, y: from.y + 100 };
	await canvas.dragInspecting(from, halfway, async () => {
		const moved = await mcp.callTool("set_position", {
			path: filePath,
			id: SECOND_RECT.id,
			...TOOL_POSITION,
		});
		expect(moved.text).not.toContain("error:");
		await page.waitForTimeout(PAST_FILE_WATCH_MS);
		const toScreen = canvas.toScreen(to);
		await page.mouse.move(toScreen.x, toScreen.y, { steps: 5 });
	});

	await expect
		.poll(
			async () => {
				const [dragged, toolMoved] = (await workspace.readDoc(filePath)).root;
				return {
					isDraggedAllTheWay: Number(dragged.x) > SINGLE_RECT.x + 120,
					toolX: toolMoved.x,
					toolY: toolMoved.y,
				};
			},
			{ message: "the file holds the whole drag and the tool's move both" },
		)
		.toEqual({
			isDraggedAllTheWay: true,
			toolX: TOOL_POSITION.x,
			toolY: TOOL_POSITION.y,
		});
	await expectNoViewerError(page);
});
