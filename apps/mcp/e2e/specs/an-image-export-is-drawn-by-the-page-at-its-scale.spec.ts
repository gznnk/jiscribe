import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { singleRectDoc } from "../support/canvasDocs";
import { expect, test } from "../support/fixtures";

// export_image has the page draw the PNG and the server write it. Its size is
// read off the file's own header, so what is checked is the image on disk, not
// what the answer says of it.

/** The first bytes of every PNG */
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

/**
 * Reads a PNG file's pixel size off its IHDR chunk, which always comes first
 *
 * @param filePath The PNG to read (absolute path)
 */
const readPngSize = async (
	filePath: string,
): Promise<{ width: number; height: number }> => {
	const png = await readFile(filePath);
	expect(png.subarray(0, PNG_SIGNATURE.length)).toEqual(PNG_SIGNATURE);
	return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
};

test("writes the PNG the page drew, its pixels growing with the scale", async ({
	mcp,
	workspace,
	openInViewer,
}) => {
	const filePath = await workspace.writeDoc(
		"drawing.jis.json",
		singleRectDoc(),
	);
	await openInViewer(filePath);
	const singlePath = join(workspace.dirPath, "single.png");
	const triplePath = join(workspace.dirPath, "triple.png");

	const atOne = await mcp.callTool("export_image", {
		output: singlePath,
		scale: 1,
	});
	const atThree = await mcp.callTool("export_image", {
		output: triplePath,
		scale: 3,
	});

	expect(atOne.text).toMatch(/^wrote .*single\.png: \d+ x \d+ px \(scale 1\)/);
	expect(atThree.text).toMatch(
		/^wrote .*triple\.png: \d+ x \d+ px \(scale 3\)/,
	);
	// No image rides back to the AI
	expect(atThree.parts.every((part) => part.type === "text")).toBe(true);
	const singleSize = await readPngSize(singlePath);
	const tripleSize = await readPngSize(triplePath);
	expect(atThree.text).toContain(
		`${tripleSize.width} x ${tripleSize.height} px`,
	);
	// Each edge is rounded up to a whole pixel at its own scale
	expect(Math.abs(tripleSize.width - singleSize.width * 3)).toBeLessThanOrEqual(
		3,
	);
	expect(
		Math.abs(tripleSize.height - singleSize.height * 3),
	).toBeLessThanOrEqual(3);
});
