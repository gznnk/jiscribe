import { expect, test } from "../support/fixtures";

// diagnose_canvas measures a markdown card's body on the page that draws it,
// since only the browser lays the Markdown out as HTML. The vitest suite stands
// in for the page with a bare socket, so the page's own answer — the numbers it
// puts on the handleOpResult frame — is only carried end to end here.

/** A card with a heading and two paragraphs, at the size given */
const markdownCard = (
	id: string,
	x: number,
	size: { width: number; height: number },
): Record<string, unknown> => ({
	id,
	type: "markdown",
	x,
	y: 0,
	...size,
	text: "# 大きな見出し\n\n段落ひとつ目\n\n段落ふたつ目",
});

test("reports a markdown card too small for its rendered body, and not one that holds it", async ({
	mcp,
	workspace,
	openInViewer,
}) => {
	const filePath = await workspace.writeDoc("markdown.jis.json", {
		version: 1,
		root: [
			markdownCard("cramped", 0, { width: 200, height: 60 }),
			markdownCard("roomy", 300, { width: 300, height: 300 }),
		],
	});
	await openInViewer(filePath);

	const diagnosed = await mcp.callTool("diagnose_canvas", { path: filePath });

	expect(diagnosed.text).toMatch(
		/- error cramped: text overflows markdown 200x60: the rendered body needs [\d.]+px of height but the region is 60px tall \(measured as drawn on the open canvas\)/,
	);
	expect(diagnosed.text).not.toContain("roomy");
	expect(diagnosed.text).not.toContain("not checked");
});
