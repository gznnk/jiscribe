import { singleRectDoc } from "../support/canvasDocs";
import { expect, test } from "../support/fixtures";

/** The first bytes of every PNG, which is how the answer is checked to be one */
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

test("answers capture_canvas with a PNG of what the page drew", async ({
	mcp,
	workspace,
	openInViewer,
}) => {
	const filePath = await workspace.writeDoc(
		"drawing.jis.json",
		singleRectDoc(),
	);
	await openInViewer(filePath);

	const captured = await mcp.callTool("capture_canvas", {});
	expect(captured.isError).toBe(false);

	const imagePart = captured.parts.find((part) => part.type === "image");
	expect(
		imagePart,
		`capture_canvas answered with ${captured.text}`,
	).toBeDefined();
	expect(imagePart?.mimeType).toBe("image/png");

	const png = Buffer.from(String(imagePart?.data), "base64");
	expect(png.length).toBeGreaterThan(0);
	expect(png.subarray(0, PNG_SIGNATURE.length)).toEqual(PNG_SIGNATURE);
});
