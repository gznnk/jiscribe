import { chromium } from "@playwright/test";

import { singleRectDoc } from "../support/canvasDocs";
import { expect, test } from "../support/fixtures";

/** The first bytes of every PNG, which is how the answer is checked to be one */
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

/**
 * The Chromium the host is told to launch window-less. The same override the
 * Playwright config takes, so a machine whose browsers are not the build Playwright
 * would fetch for itself names them once
 */
const headlessChromiumPath =
	process.env.JISCRIBE_E2E_CHROMIUM_PATH ?? chromium.executablePath();

/**
 * Whether this run is root. Chromium refuses to start as root without
 * `--no-sandbox`, and the launcher passes none on purpose — a user's machine is not
 * root — so inside a root container there is no headless window to be had
 */
const isRootProcess =
	typeof process.getuid === "function" && process.getuid() === 0;

test.use({ mcpEnv: { JISCRIBE_MCP_BROWSER: headlessChromiumPath } });

// Nothing here touches the browser Playwright drives: the window under test is one
// the host launched itself, through the launcher a user's machine goes through.
// What it shows is that a canvas nobody can see still answers the 16 tools that
// need one, and that such a window really does close when asked.
test("opens a window nobody can see and answers from it", async ({
	mcp,
	workspace,
}) => {
	test.skip(
		isRootProcess,
		"Chromium will not start as root, and the launcher passes no --no-sandbox",
	);
	const filePath = await workspace.writeDoc(
		"drawing.jis.json",
		singleRectDoc(),
	);

	const opened = await mcp.callTool("open_canvas", {
		path: filePath,
		headless: true,
	});
	expect(opened.text).not.toContain("error:");
	expect(opened.text).toContain("headless viewer");

	const captured = await mcp.callTool("capture_canvas", {});
	const imagePart = captured.parts.find((part) => part.type === "image");
	expect(
		imagePart,
		`capture_canvas answered with ${captured.text}`,
	).toBeDefined();
	const png = Buffer.from(String(imagePart?.data), "base64");
	expect(png.subarray(0, PNG_SIGNATURE.length)).toEqual(PNG_SIGNATURE);

	// A headless window honours closeViewer, so unlike the page Playwright drives it
	// really does go, and the host folds up with it
	const closed = await mcp.callTool("close_canvas", {});
	expect(closed.text).toContain("stopped the local server");
});
