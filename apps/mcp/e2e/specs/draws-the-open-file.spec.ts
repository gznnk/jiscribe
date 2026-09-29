import { expect, test } from "../support/fixtures";

test("draws what the file holds and names it in the toolbar", async ({
	page,
	workspace,
	openInViewer,
}) => {
	const filePath = await workspace.writeDoc("hello.jis.json", {
		version: 1,
		root: [
			{
				type: "rect",
				id: "r1",
				x: 40,
				y: 40,
				width: 120,
				height: 80,
				text: "hello",
			},
		],
	});

	await openInViewer(filePath);

	await expect(page.locator('[data-id="r1"]')).toBeVisible();
	await expect(page.locator(".viewer-file-name")).toHaveText("hello.jis.json");
});
