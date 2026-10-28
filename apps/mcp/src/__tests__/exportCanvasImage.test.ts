// The viewer's half of export_image: what it asks the canvas's export API for,
// what it refuses before drawing, and what it hands back. The canvas is a fake
// that records the options it was called with.

import type { AiHandleControl } from "@jiscribe/ai-tools/client";
import type {
	CanvasExportHandle,
	CanvasExportOptions,
	CanvasPngExportOptions,
} from "@jiscribe/canvas";
import { describe, expect, it } from "vitest";

import {
	exportCanvasImage,
	MAX_EXPORTED_BASE64_LENGTH,
} from "../viewer/exportCanvasImage";

const SVG_TEXT = '<svg xmlns="http://www.w3.org/2000/svg">é</svg>';

/** An export API answering with fixed bytes, noting down the options of each call */
const createRecordingExportHandle = (
	pngBytes: Uint8Array<ArrayBuffer> = Uint8Array.from([0x89, 0x50, 0x4e, 0x47]),
	pngRegion = { x: -16, y: -16, width: 232, height: 132 },
): {
	exportHandle: CanvasExportHandle;
	pngOptions: (CanvasPngExportOptions | undefined)[];
	svgOptions: (CanvasExportOptions | undefined)[];
} => {
	const pngOptions: (CanvasPngExportOptions | undefined)[] = [];
	const svgOptions: (CanvasExportOptions | undefined)[] = [];
	return {
		exportHandle: {
			capturePng: async (options) => {
				pngOptions.push(options);
				const scale = options?.scale ?? 1;
				return {
					blob: new Blob([pngBytes]),
					region: pngRegion,
					pixelWidth: pngRegion.width * scale,
					pixelHeight: pngRegion.height * scale,
				};
			},
			toSvgString: async (options) => {
				svgOptions.push(options);
				return SVG_TEXT;
			},
		},
		pngOptions,
		svgOptions,
	};
};

/**
 * The parts of the canvas's way in an export reads; the rest would throw if it
 * were reached
 *
 * @param drawnIds The ids that draw something; any other id draws nothing
 */
const createHandleControl = (drawnIds: readonly string[]): AiHandleControl =>
	({
		isAvailable: () => true,
		measureVisualBounds: (ids: readonly string[]) =>
			ids.some((id) => drawnIds.includes(id))
				? { x: 0, y: 0, width: 200, height: 100 }
				: null,
	}) as Partial<AiHandleControl> as AiHandleControl;

describe("exportCanvasImage", () => {
	it("draws the whole drawing as a PNG at the scale asked, capped at 8192 px, without the source", async () => {
		const { exportHandle, pngOptions } = createRecordingExportHandle();

		const outcome = await exportCanvasImage(
			{ kind: "exportImage", format: "png", scale: 3 },
			exportHandle,
			createHandleControl(["r1"]),
			["r1"],
		);

		expect(pngOptions).toEqual([
			{
				region: "content",
				scale: 3,
				maxPixelSize: 8192,
				includeSource: false,
			},
		]);
		expect(outcome).toEqual({
			ok: true,
			text: "696 x 396 px (scale 3) of the whole drawing, covering world rect (-16, -16) 232 x 132 px",
			exportedImageBase64: "iVBORw==",
		});
	});

	it("says so when the cap scaled the PNG down", async () => {
		const { exportHandle } = createRecordingExportHandle(undefined, {
			x: 0,
			y: 0,
			width: 5000,
			height: 100,
		});

		const outcome = await exportCanvasImage(
			{ kind: "exportImage", format: "png", scale: 2 },
			exportHandle,
			createHandleControl(["r1"]),
			["r1"],
		);

		expect(outcome.text).toContain(
			"scaled down from scale 2 to fit the 8192 px cap on the long edge",
		);
	});

	it("takes the extent of ids, isolated when asked", async () => {
		const { exportHandle, svgOptions } = createRecordingExportHandle();

		const outcome = await exportCanvasImage(
			{ kind: "exportImage", format: "svg", ids: ["r1"], isolate: true },
			exportHandle,
			createHandleControl(["r1"]),
			["r1", "r2"],
		);

		expect(svgOptions).toEqual([
			{ region: { ids: ["r1"], isolate: true }, includeSource: false },
		]);
		expect(outcome.ok).toBe(true);
		expect(
			Buffer.from(outcome.exportedImageBase64 ?? "", "base64").toString("utf8"),
		).toBe(SVG_TEXT);
	});

	it("refuses an empty drawing rather than exporting the viewport", async () => {
		const { exportHandle, pngOptions } = createRecordingExportHandle();

		const outcome = await exportCanvasImage(
			{ kind: "exportImage", format: "png", scale: 2 },
			exportHandle,
			createHandleControl([]),
			[],
		);

		expect(outcome).toEqual({
			ok: false,
			text: "nothing is drawn yet, so there is nothing to export",
		});
		expect(pngOptions).toEqual([]);
	});

	it("refuses ids that draw nothing before drawing", async () => {
		const { exportHandle, svgOptions } = createRecordingExportHandle();

		const outcome = await exportCanvasImage(
			{ kind: "exportImage", format: "svg", ids: ["missing"] },
			exportHandle,
			createHandleControl(["r1"]),
			["r1"],
		);

		expect(outcome.ok).toBe(false);
		expect(outcome.text).toContain('nothing to export at "missing"');
		expect(svgOptions).toEqual([]);
	});

	it("refuses an image too large for the answer frame, rather than sending it", async () => {
		const { exportHandle } = createRecordingExportHandle(
			new Uint8Array((MAX_EXPORTED_BASE64_LENGTH / 4) * 3 + 3),
		);

		const outcome = await exportCanvasImage(
			{ kind: "exportImage", format: "png", scale: 8 },
			exportHandle,
			createHandleControl(["r1"]),
			["r1"],
		);

		expect(outcome.ok).toBe(false);
		expect(outcome.text).toContain("lower scale, or name fewer ids");
		expect(outcome).not.toHaveProperty("exportedImageBase64");
	});

	it("answers with no canvas when none is mounted", async () => {
		const outcome = await exportCanvasImage(
			{ kind: "exportImage", format: "png", scale: 2 },
			null,
			createHandleControl(["r1"]),
			["r1"],
		);

		expect(outcome).toEqual({
			ok: false,
			text: "no canvas is on screen right now, so there is nothing to export",
		});
	});
});
