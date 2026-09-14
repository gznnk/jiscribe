import type * as CanvasModule from "@jiscribe/canvas";
import type { JSHandle, Page } from "@playwright/test";

import { expect, test } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * The `image` shape's two halves, which only a real browser has: the host
 * resolver returning a Blob, and the export inlining the bytes. The harness
 * resolves `ok.png` and rejects everything else (see e2e/harness/main.tsx), so
 * both a file that arrives and one that does not are on the one canvas.
 *
 * The shape has no toolbar entry, so the pair is injected through the harness's
 * doc hook.
 */

/** The global mountPluginHarness publishes the default page's handle on. */
type HarnessWindow = {
	__canvasHandle?: CanvasModule.CanvasHandle | null;
	__setHarnessDoc?: (docText: string) => void;
};

const docText = JSON.stringify({
	version: 1,
	root: [
		{
			id: "good-image",
			type: "image",
			x: 150,
			y: 200,
			width: 200,
			height: 120,
			src: "ok.png",
		},
		{
			id: "missing-image",
			type: "image",
			x: 420,
			y: 200,
			width: 200,
			height: 120,
			src: "nope.png",
		},
	],
});

/** The shape's outer `<g>`, which carries the resolution as `data-image-status`. */
const imageStatusOf = (canvas: CanvasDriver, id: string) =>
	canvas.page.locator(`g[data-image-status]:has(> [data-id="${id}"])`);

const loadDoc = async (canvas: CanvasDriver): Promise<void> => {
	await canvas.page.evaluate((text) => {
		const hook = (window as unknown as HarnessWindow).__setHarnessDoc;
		if (!hook) {
			throw new Error(
				"__setHarnessDoc is undefined (harness hook not installed)",
			);
		}
		hook(text);
	}, docText);
	await expect(canvas.objectById("good-image")).toHaveCount(1);
	await expect(canvas.objectById("missing-image")).toHaveCount(1);
};

const readCanvasHandle = (
	page: Page,
): Promise<JSHandle<CanvasModule.CanvasHandle>> =>
	page.evaluateHandle(() => {
		const handle = (window as unknown as HarnessWindow).__canvasHandle;
		if (!handle) {
			throw new Error(
				"__canvasHandle is undefined (harness hook not installed)",
			);
		}
		return handle;
	});

test.describe("image shape", () => {
	test("draws the resolved file and a placeholder for the one that fails", async ({
		canvas,
	}) => {
		await loadDoc(canvas);

		await expect(imageStatusOf(canvas, "good-image")).toHaveAttribute(
			"data-image-status",
			"ready",
		);
		await expect(imageStatusOf(canvas, "missing-image")).toHaveAttribute(
			"data-image-status",
			"error",
		);
		// The resolved one draws from a blob URL while it is on screen; the failed
		// one draws no <image> at all, only its placeholder.
		await expect(
			canvas.page.locator('image[data-image-src="ok.png"]'),
		).toHaveCount(1);
		await expect(
			canvas.page.locator('image[data-image-src="nope.png"]'),
		).toHaveCount(0);
	});

	test("exports the bytes themselves, never the blob URL", async ({
		canvas,
	}) => {
		await loadDoc(canvas);
		await expect(imageStatusOf(canvas, "good-image")).toHaveAttribute(
			"data-image-status",
			"ready",
		);
		const handle = await readCanvasHandle(canvas.page);

		const exported = await handle.evaluate((h) => h.export.toSvgString());

		expect(
			exported,
			"a mounted canvas exports rather than yielding null",
		).not.toBeNull();
		expect(exported!).toContain("data:image/png;base64,");
		expect(exported!).not.toContain("blob:");
		// The live DOM's marker has no place in the file it produced.
		expect(exported!).not.toContain("data-image-src");
	});
});
