// Draws the canvas on screen to the image export_image writes to a file. The
// picture is for a person, not the AI, so unlike capture_canvas it is drawn at
// the scale asked for and comes back as bytes for the host to write.

import type { AiHandleControl } from "@jiscribe/ai-tools/client";
import type {
	CanvasExportHandle,
	CanvasExportRegion,
	CanvasPngCapture,
} from "@jiscribe/canvas";

import type { ViewerOpOutcome } from "./useCanvasHostSocket";
import {
	MAX_EXPORT_PIXEL_SIZE,
	type ExportImageOp,
} from "../shared/canvasHostProtocol";
import { MAX_WRITE_BODY_BYTES } from "../shared/fileApiRoute";

/** What the rest of the answer frame (its keys, requestId, text) is allowed beside the bytes */
const FRAME_ALLOWANCE_BYTES = 64 * 1024;

/**
 * The longest base64 the answer may carry: the host's socket drops a frame past
 * MAX_WRITE_BODY_BYTES, and with it the answer, which would leave the AI to sit
 * out the timeout
 */
export const MAX_EXPORTED_BASE64_LENGTH =
	MAX_WRITE_BODY_BYTES - FRAME_ALLOWANCE_BYTES;

/** How many bytes go to btoa at a time; small enough not to touch the argument limit on a spread */
const BASE64_CHUNK_SIZE = 0x2000;

const toBase64 = (bytes: Uint8Array): string => {
	const chunks: string[] = [];
	for (let offset = 0; offset < bytes.length; offset += BASE64_CHUNK_SIZE) {
		chunks.push(
			String.fromCharCode(
				...bytes.subarray(offset, offset + BASE64_CHUNK_SIZE),
			),
		);
	}
	return btoa(chunks.join(""));
};

/** The same rounding the ai-tools results use, so the numbers read alike */
const formatNumber = (value: number): string =>
	String(Math.round(value * 10) / 10);

const quoteIds = (ids: readonly string[]): string =>
	ids.map((id) => `"${id}"`).join(", ");

const NOT_READY_TEXT = "the canvas is not ready to be exported yet";

/** The region to export and how the result names it; or why there is nothing to export */
type ExportPlan =
	| { ok: true; region: CanvasExportRegion; subject: string }
	| { ok: false; text: string };

const planExport = (
	op: ExportImageOp,
	handleControl: AiHandleControl,
	drawnRootIds: readonly string[],
): ExportPlan => {
	if (op.ids === undefined) {
		// An empty "content" export falls back to the viewport, which is not a
		// drawing anyone asked for
		if (handleControl.measureVisualBounds(drawnRootIds) === null) {
			return {
				ok: false,
				text: "nothing is drawn yet, so there is nothing to export",
			};
		}
		return { ok: true, region: "content", subject: "the whole drawing" };
	}
	// The canvas rejects ids that draw nothing; caught here first so the answer
	// says so rather than passing on the canvas's own error
	if (handleControl.measureVisualBounds(op.ids) === null) {
		return {
			ok: false,
			text: `nothing to export at ${quoteIds(op.ids)}: none of those ids is on the canvas, or none of them draws anything`,
		};
	}
	return {
		ok: true,
		region:
			op.isolate === true ? { ids: op.ids, isolate: true } : { ids: op.ids },
		subject: quoteIds(op.ids),
	};
};

/**
 * Encodes the bytes for the answer, or refuses when they would not fit in it.
 *
 * @param bytes The file as it is to be written
 * @param text What the answer says on success
 * @param narrowingHint How to get under the limit, as the refusal ends
 */
const toExportOutcome = (
	bytes: Uint8Array,
	text: string,
	narrowingHint: string,
): ViewerOpOutcome => {
	const base64Length = Math.ceil(bytes.length / 3) * 4;
	if (base64Length > MAX_EXPORTED_BASE64_LENGTH) {
		const megabytes = (size: number) => formatNumber(size / (1024 * 1024));
		return {
			ok: false,
			text: `the image comes to ${megabytes(bytes.length)} MB, more than the ${megabytes((MAX_EXPORTED_BASE64_LENGTH / 4) * 3)} MB the viewer can hand back; ${narrowingHint}`,
		};
	}
	return { ok: true, text, exportedImageBase64: toBase64(bytes) };
};

/** Says how large the PNG came out and what part of the world it covers */
const describePngExport = (
	{ region, pixelWidth, pixelHeight }: CanvasPngCapture,
	subject: string,
	scale: number,
): string => {
	const sentences = [
		`${formatNumber(pixelWidth)} x ${formatNumber(pixelHeight)} px (scale ${formatNumber(scale)}) of ${subject}, covering world rect (${formatNumber(region.x)}, ${formatNumber(region.y)}) ${formatNumber(region.width)} x ${formatNumber(region.height)} px`,
	];
	if (Math.max(region.width, region.height) * scale > MAX_EXPORT_PIXEL_SIZE) {
		sentences.push(
			`scaled down from scale ${formatNumber(scale)} to fit the ${MAX_EXPORT_PIXEL_SIZE} px cap on the long edge`,
		);
	}
	return sentences.join("; ");
};

/**
 * Draws the canvas on screen to export_image's PNG or SVG, without the `.jis`
 * source embedded.
 *
 * @param op What to export: the format, the scale for a PNG, and the ids (none
 *   takes the whole drawing) with or without isolate
 * @param exportHandle The canvas's export API; null while no canvas is mounted
 * @param handleControl The way in to the canvas on screen, read to check that
 *   there is something to draw before drawing it
 * @param drawnRootIds The top-level ids of the document on screen, which decide
 *   whether the whole drawing draws anything
 * @returns On success the bytes as base64 and, for a PNG, a text naming its
 *   pixel size and the world rect it covers; otherwise the reason
 */
export const exportCanvasImage = async (
	op: ExportImageOp,
	exportHandle: CanvasExportHandle | null,
	handleControl: AiHandleControl,
	drawnRootIds: readonly string[],
): Promise<ViewerOpOutcome> => {
	if (exportHandle === null || !handleControl.isAvailable()) {
		return {
			ok: false,
			text: "no canvas is on screen right now, so there is nothing to export",
		};
	}
	const plan = planExport(op, handleControl, drawnRootIds);
	if (!plan.ok) {
		return plan;
	}
	if (op.format === "svg") {
		const svgText = await exportHandle.toSvgString({
			region: plan.region,
			includeSource: false,
		});
		if (svgText === null) {
			return { ok: false, text: NOT_READY_TEXT };
		}
		return toExportOutcome(
			new TextEncoder().encode(svgText),
			`exported ${plan.subject} as SVG`,
			"name fewer ids",
		);
	}
	const capture = await exportHandle.capturePng({
		region: plan.region,
		scale: op.scale,
		maxPixelSize: MAX_EXPORT_PIXEL_SIZE,
		includeSource: false,
	});
	if (capture === null) {
		return { ok: false, text: NOT_READY_TEXT };
	}
	return toExportOutcome(
		new Uint8Array(await capture.blob.arrayBuffer()),
		describePngExport(capture, plan.subject, op.scale),
		"lower scale, or name fewer ids",
	);
};
