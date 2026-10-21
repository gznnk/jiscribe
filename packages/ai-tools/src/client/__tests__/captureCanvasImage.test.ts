import type {
	CanvasPngCapture,
	CanvasPngExportOptions,
} from "@jiscribe/canvas";
import type { Rect } from "@jiscribe/geometry";
import { describe, expect, it } from "vitest";

import { captureCanvasImage } from "../captureCanvasImage";
import type { CapturePng } from "../types";
import { createFakeHandleControl } from "./fakeHandleControl";

/** PNG bytes standing in for a capture (they need not be real data) */
const fakePngBytes = Uint8Array.from(
	{ length: 20_000 },
	(_, index) => index % 256,
);

const capturedRegion: Rect = { x: -16, y: 40, width: 800, height: 400 };

/** A capture of the fake bytes covering capturedRegion at 1400 x 700 px */
const createFakeCapture = (): CanvasPngCapture => ({
	blob: new Blob([fakePngBytes]),
	region: capturedRegion,
	pixelWidth: 1400,
	pixelHeight: 700,
});

/** A capturePng that notes down the options it was called with */
const createRecordingCapturePng = (): {
	capturePng: CapturePng;
	passedOptions: (CanvasPngExportOptions | undefined)[];
} => {
	const passedOptions: (CanvasPngExportOptions | undefined)[] = [];
	return {
		capturePng: async (options) => {
			passedOptions.push(options);
			return createFakeCapture();
		},
		passedOptions,
	};
};

const BASE_OPTIONS = { includeSource: false, scale: 1, maxPixelSize: 1400 };

describe("captureCanvasImage", () => {
	it("answers with no canvas before reading the region, so an empty selection is not blamed", async () => {
		const { capturePng, passedOptions } = createRecordingCapturePng();
		const result = await captureCanvasImage(
			{ kind: "captureCanvas", target: "selection" },
			capturePng,
			createFakeHandleControl({ isAvailable: () => false }),
		);

		expect(result.ok).toBe(false);
		expect(result.text).toContain("no canvas is on screen");
		expect(passedOptions).toEqual([]);
	});

	it("returns the PNG as base64 (encoding it in chunks does not break it)", async () => {
		const result = await captureCanvasImage(
			{ kind: "captureCanvas" },
			async () => createFakeCapture(),
			createFakeHandleControl(),
		);

		expect(result.ok).toBe(true);
		expect(result.imagePngBase64).toBeDefined();
		expect(Buffer.from(result.imagePngBase64 ?? "", "base64")).toEqual(
			Buffer.from(fakePngBytes),
		);
	});

	it("captures the whole drawing at 1:1 scale, a cap on the longest edge and no embedded source when nothing is given", async () => {
		const { capturePng, passedOptions } = createRecordingCapturePng();
		const result = await captureCanvasImage(
			{ kind: "captureCanvas" },
			capturePng,
			createFakeHandleControl(),
		);

		expect(passedOptions).toEqual([{ ...BASE_OPTIONS, region: "content" }]);
		expect(result.text).toContain("captured the whole drawing");
		expect(result.text).not.toContain("cropped");
	});

	it('takes target "all" as the whole drawing too', async () => {
		const { capturePng, passedOptions } = createRecordingCapturePng();
		await captureCanvasImage(
			{ kind: "captureCanvas", target: "all" },
			capturePng,
			createFakeHandleControl(),
		);

		expect(passedOptions).toEqual([{ ...BASE_OPTIONS, region: "content" }]);
	});

	it("reports the world rect the image covers, its pixel size and how to map back to world", async () => {
		const result = await captureCanvasImage(
			{ kind: "captureCanvas" },
			async () => createFakeCapture(),
			createFakeHandleControl(),
		);

		expect(result.text).toContain(
			"covering world rect (-16, 40) 800 x 400 px at 1400 x 700 px",
		);
		expect(result.text).toContain("-16 + imageX / 1400 * 800");
		expect(result.text).toContain("40 + imageY / 700 * 400");
		expect(result.text).toContain("hit_test");
		expect(result.text).toContain("describe_canvas");
	});

	it("captures named ids, after checking they draw something", async () => {
		const { capturePng, passedOptions } = createRecordingCapturePng();
		const measuredIds: unknown[] = [];
		const result = await captureCanvasImage(
			{ kind: "captureCanvas", ids: ["a", "b"] },
			capturePng,
			createFakeHandleControl({
				measureVisualBounds: (ids) => {
					measuredIds.push(ids);
					return { x: 0, y: 0, width: 100, height: 50 };
				},
			}),
		);

		expect(measuredIds).toEqual([["a", "b"]]);
		expect(passedOptions).toEqual([
			{ ...BASE_OPTIONS, region: { ids: ["a", "b"] } },
		]);
		expect(result.ok).toBe(true);
		expect(result.text).toContain('captured "a", "b"');
		expect(result.text).toContain("cropped");
	});

	it("refuses ids that draw nothing without capturing, since the canvas would fall back to the live view", async () => {
		const { capturePng, passedOptions } = createRecordingCapturePng();
		const result = await captureCanvasImage(
			{ kind: "captureCanvas", ids: ["missing"] },
			capturePng,
			createFakeHandleControl({ measureVisualBounds: () => null }),
		);

		expect(result.ok).toBe(false);
		expect(result.text).toContain('"missing"');
		expect(result.imagePngBase64).toBeUndefined();
		expect(passedOptions).toEqual([]);
	});

	it("captures the selection as the ids selected", async () => {
		const { capturePng, passedOptions } = createRecordingCapturePng();
		const result = await captureCanvasImage(
			{ kind: "captureCanvas", target: "selection" },
			capturePng,
			createFakeHandleControl({ getSelectedIds: () => ["s1", "s2"] }),
		);

		expect(passedOptions).toEqual([
			{ ...BASE_OPTIONS, region: { ids: ["s1", "s2"] } },
		]);
		expect(result.ok).toBe(true);
		expect(result.text).toContain("the 2 selected object(s)");
	});

	it("refuses an empty selection without capturing", async () => {
		const { capturePng, passedOptions } = createRecordingCapturePng();
		const result = await captureCanvasImage(
			{ kind: "captureCanvas", target: "selection" },
			capturePng,
			createFakeHandleControl({ getSelectedIds: () => [] }),
		);

		expect(result.ok).toBe(false);
		expect(result.text).toContain("nothing is selected");
		expect(result.text).toContain("select_objects");
		expect(passedOptions).toEqual([]);
	});

	it("captures a world rect exactly as given", async () => {
		const { capturePng, passedOptions } = createRecordingCapturePng();
		const rect = { x: 100, y: 200, width: 300, height: 150 };
		const result = await captureCanvasImage(
			{ kind: "captureCanvas", rect },
			capturePng,
			createFakeHandleControl(),
		);

		expect(passedOptions).toEqual([{ ...BASE_OPTIONS, region: rect }]);
		expect(result.ok).toBe(true);
		expect(result.text).toContain("captured (100, 200) 300 x 150 px");
	});

	it("refuses a rect with no extent on one axis without capturing", async () => {
		const { capturePng, passedOptions } = createRecordingCapturePng();
		const result = await captureCanvasImage(
			{ kind: "captureCanvas", rect: { x: 0, y: 0, width: 300, height: 0 } },
			capturePng,
			createFakeHandleControl(),
		);

		expect(result.ok).toBe(false);
		expect(result.text).toContain("needs extent on both");
		expect(passedOptions).toEqual([]);
	});

	it("refuses two region fields given together without capturing", async () => {
		const { capturePng, passedOptions } = createRecordingCapturePng();
		const result = await captureCanvasImage(
			{
				kind: "captureCanvas",
				ids: ["a"],
				rect: { x: 0, y: 0, width: 10, height: 10 },
			},
			capturePng,
			createFakeHandleControl(),
		);

		expect(result.ok).toBe(false);
		expect(result.text).toContain("at most one of target, ids and rect");
		expect(passedOptions).toEqual([]);
	});

	it("returns ok:false while the canvas is not mounted (null)", async () => {
		const result = await captureCanvasImage(
			{ kind: "captureCanvas" },
			async () => null,
			createFakeHandleControl(),
		);

		expect(result.ok).toBe(false);
		expect(result.imagePngBase64).toBeUndefined();
	});

	it("turns an export that throws into ok:false, rather than losing the turn", async () => {
		const result = await captureCanvasImage(
			{ kind: "captureCanvas" },
			async () => {
				throw new Error("2D context unavailable");
			},
			createFakeHandleControl(),
		);

		expect(result.ok).toBe(false);
		expect(result.text).toContain("2D context unavailable");
	});
});
