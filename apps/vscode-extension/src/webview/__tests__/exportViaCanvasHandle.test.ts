import type { CanvasExportHandle } from "@jiscribe/canvas";
import { afterEach, describe, expect, it, vi } from "vitest";

import { exportImageAsBase64 } from "../exportViaCanvasHandle";

// FileReader does not exist under vitest's "node" environment, so the encoder is
// replaced with a Node-side one (vi.mock is hoisted above the import). What is
// under test here is which branch of the export runs and what it reports, not
// the base64 itself.
vi.mock("../blobToBase64", () => ({
	blobToBase64: async (blob: Blob) =>
		Buffer.from(await blob.arrayBuffer()).toString("base64"),
}));

/** Export handle whose two methods are both supplied by the caller. */
const makeExportHandle = (
	handle: Partial<CanvasExportHandle>,
): CanvasExportHandle => ({
	toSvgString: async () => null,
	capturePng: async () => null,
	...handle,
});

/** A PNG capture carrying `blob`; the region is unused by the export path. */
const makeCapture = (blob: Blob) => ({
	blob,
	region: { x: 0, y: 0, width: 10, height: 10 },
	pixelWidth: 10,
	pixelHeight: 10,
});

const base64 = (text: string) => Buffer.from(text).toString("base64");

afterEach(() => {
	vi.restoreAllMocks();
});

describe("exportImageAsBase64", () => {
	it("answers null when no canvas is mounted", async () => {
		expect(await exportImageAsBase64(undefined, "png")).toBeNull();
		expect(await exportImageAsBase64(undefined, "svg")).toBeNull();
	});

	it("base64-encodes the SVG string", async () => {
		const handle = makeExportHandle({
			toSvgString: async () => "<svg>あ</svg>",
		});
		expect(await exportImageAsBase64(handle, "svg")).toBe(
			base64("<svg>あ</svg>"),
		);
	});

	it("base64-encodes the captured PNG bytes", async () => {
		const handle = makeExportHandle({
			capturePng: async () => makeCapture(new Blob(["PNG"])),
		});
		expect(await exportImageAsBase64(handle, "png")).toBe(base64("PNG"));
	});

	it("answers null when the canvas renders nothing", async () => {
		const handle = makeExportHandle({
			toSvgString: async () => null,
			capturePng: async () => null,
		});
		expect(await exportImageAsBase64(handle, "svg")).toBeNull();
		expect(await exportImageAsBase64(handle, "png")).toBeNull();
	});

	it("logs and answers null instead of rejecting", async () => {
		const logged = vi.spyOn(console, "error").mockImplementation(() => {});
		const handle = makeExportHandle({
			toSvgString: async () => {
				throw new Error("svg boom");
			},
			capturePng: async () => {
				throw new Error("png boom");
			},
		});

		expect(await exportImageAsBase64(handle, "svg")).toBeNull();
		expect(await exportImageAsBase64(handle, "png")).toBeNull();
		expect(logged.mock.calls.map((call) => call[0])).toEqual([
			"[Jiscribe] SVG export failed:",
			"[Jiscribe] PNG export failed:",
		]);
	});

	it("does not call the other format's renderer", async () => {
		const toSvgString = vi.fn(async () => "<svg/>");
		const capturePng = vi.fn(async () => makeCapture(new Blob(["PNG"])));
		const handle = makeExportHandle({ toSvgString, capturePng });

		await exportImageAsBase64(handle, "svg");
		expect(capturePng).not.toHaveBeenCalled();

		await exportImageAsBase64(handle, "png");
		expect(toSvgString).toHaveBeenCalledTimes(1);
	});
});
