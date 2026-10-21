// Turns the current canvas into a PNG and returns it as base64, for the AI's
// capture_canvas tool. It neither reads nor writes the document, the same as
// the other canvas operations (applyHandleOp), but capturing alone is async, so
// it is kept on a route of its own rather than mixed into either that or
// applyCanvasOp.

import type {
	CanvasExportRegion,
	CanvasPngCapture,
	CanvasPngExportOptions,
} from "@jiscribe/canvas";

import type { AiCanvasOpOutcome, AiHandleOp } from "../canvasOps";
import { formatNumber, formatRect, quoteIds } from "../resultText";
import { resolveAiRegion } from "./resolveAiRegion";
import type { AiHandleControl, CapturePng } from "./types";

/**
 * The longest edge (px) of the image handed to the AI. It travels over IPC as
 * base64 and then rides into the model's input, so it is held down to what is
 * still readable (the API scales the long edge to some 1568px of its own)
 */
const MAX_CAPTURE_PIXEL_SIZE = 1400;

/**
 * The capture options. Size is held down by drawing at 1:1 with a cap on the
 * longest edge, and the .jis embedded for re-editing is left out (the AI
 * can read the document with describe_canvas, so carrying it twice buys
 * nothing)
 */
const CAPTURE_OPTIONS: CanvasPngExportOptions = {
	includeSource: false,
	scale: 1,
	maxPixelSize: MAX_CAPTURE_PIXEL_SIZE,
};

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

const NO_CANVAS_TEXT =
	"no canvas is on screen right now, so there is nothing to capture";

/** The export region to capture, and how the result names it; or why there is nothing to capture */
type CapturePlan =
	| { ok: true; region: CanvasExportRegion; subject: string; isWhole: boolean }
	| { ok: false; text: string };

const planCapture = (
	op: Extract<AiHandleOp, { kind: "captureCanvas" }>,
	handleControl: AiHandleControl,
): CapturePlan => {
	const resolution = resolveAiRegion(op);
	if (!resolution.ok) {
		return resolution;
	}
	const { region } = resolution;
	switch (region.kind) {
		case "none":
		case "all":
			return {
				ok: true,
				region: "content",
				subject: "the whole drawing",
				isWhole: true,
			};
		case "selection": {
			const selectedIds = handleControl.getSelectedIds();
			if (selectedIds.length === 0) {
				return {
					ok: false,
					text: "nothing is selected, so there is nothing to capture; select_objects first, or name ids / a rect",
				};
			}
			return {
				ok: true,
				region: { ids: selectedIds },
				subject: `the ${selectedIds.length} selected object(s)`,
				isWhole: false,
			};
		}
		case "ids":
			// The canvas falls back to the live view when no id draws anything, so
			// that has to be caught here
			if (handleControl.measureVisualBounds(region.ids) === null) {
				return {
					ok: false,
					text: `nothing to capture at ${quoteIds(region.ids)}: none of those ids is on the canvas, or none of them draws anything`,
				};
			}
			return {
				ok: true,
				region: { ids: region.ids },
				subject: quoteIds(region.ids),
				isWhole: false,
			};
		case "rect":
			if (region.rect.width === 0 || region.rect.height === 0) {
				return {
					ok: false,
					text: `${formatRect(region.rect)} has no extent on one axis, and an image needs extent on both`,
				};
			}
			return {
				ok: true,
				region: region.rect,
				subject: formatRect(region.rect),
				isWhole: false,
			};
	}
};

/** Says what the image covers in world terms, which is what lets a spot in it be turned back into a world point */
const describeCapture = (
	{ region, pixelWidth, pixelHeight }: CanvasPngCapture,
	subject: string,
	isWhole: boolean,
): string => {
	const pixelSize = `${formatNumber(pixelWidth)} x ${formatNumber(pixelHeight)} px`;
	return [
		`captured ${subject}, covering world rect ${formatRect(region)} at ${pixelSize}.`,
		isWhole
			? null
			: "The picture is cropped, not filtered: anything else drawn inside that rect is in it too.",
		`A position (imageX, imageY) in the image is world (${formatNumber(region.x)} + imageX / ${formatNumber(pixelWidth)} * ${formatNumber(region.width)}, ${formatNumber(region.y)} + imageY / ${formatNumber(pixelHeight)} * ${formatNumber(region.height)}); hand that to hit_test to name what is there.`,
		"Still never read exact coordinates or sizes off the picture — describe_canvas has the numbers.",
	]
		.filter((sentence) => sentence !== null)
		.join(" ");
};

/**
 * Captures the canvas and builds the PNG (base64) the tool result carries.
 *
 * @param op - The capture_canvas operation; its region arguments pick what is
 *   captured, and none of them takes the whole drawing
 * @param capturePng - The image-making function received from the host
 *   application; it returns null while the canvas is not mounted
 * @param handleControl - The way in to the canvas on screen, read for the
 *   selection and to check that named ids draw something before capturing
 * @returns The tool result; imagePngBase64 is filled in when ok=true, and the
 *   text names the world rect the image covers and its pixel size
 */
export const captureCanvasImage = async (
	op: Extract<AiHandleOp, { kind: "captureCanvas" }>,
	capturePng: CapturePng,
	handleControl: AiHandleControl,
): Promise<AiCanvasOpOutcome> => {
	try {
		// Checked before the region is read: with no canvas the selection reads as
		// empty and ids as drawing nothing, which would answer with the wrong reason
		if (!handleControl.isAvailable()) {
			return { ok: false, text: NO_CANVAS_TEXT };
		}
		const plan = planCapture(op, handleControl);
		if (!plan.ok) {
			return plan;
		}
		const capture = await capturePng({
			...CAPTURE_OPTIONS,
			region: plan.region,
		});
		if (capture === null) {
			return { ok: false, text: "the canvas is not ready to be captured yet" };
		}
		return {
			ok: true,
			text: describeCapture(capture, plan.subject, plan.isWhole),
			imagePngBase64: toBase64(
				new Uint8Array(await capture.blob.arrayBuffer()),
			),
		};
	} catch (error) {
		return {
			ok: false,
			text: `failed to capture the canvas: ${error instanceof Error ? error.message : String(error)}`,
		};
	}
};
