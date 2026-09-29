import { singleRectDoc } from "../support/canvasDocs";
import { expect, test } from "../support/fixtures";

test("draws what a tool added to the file while the page was open", async ({
	page,
	mcp,
	workspace,
	openInViewer,
}) => {
	const filePath = await workspace.writeDoc(
		"drawing.jis.json",
		singleRectDoc(),
	);
	await openInViewer(filePath);

	const added = await mcp.callTool("add_rect", {
		path: filePath,
		x: 240,
		y: 40,
		width: 100,
		height: 60,
		text: "from the AI",
	});
	expect(added.isError).toBe(false);
	expect(added.text).not.toContain("error:");

	// The tool answers as soon as the file is written; the page follows one watch
	// interval later, so the id it drew under comes from the file rather than the
	// reply
	const doc = await workspace.readDoc(filePath);
	expect(doc.root).toHaveLength(2);
	const addedId = String(doc.root[1].id);

	await expect(page.locator(`[data-id="${addedId}"]`)).toBeVisible();
});
