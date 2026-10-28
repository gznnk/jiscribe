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

import {
	MAX_CAPTURE_PIXEL_SIZE,
	type AiCanvasOpOutcome,
	type AiHandleOp,
} from "../canvasOps";
import { formatNumber, formatRect, quoteIds } from "../resultText";
import { resolveAiRegion } from "./resolveAiRegion";
import { toBase64 } from "./toBase64";
import type { AiHandleControl, CapturePng } from "./types";

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

const NO_CANVAS_TEXT =
	"no canvas is on screen right now, so there is nothing to capture";

/**
 * How the picture relates to the rest of the drawing: all of it, a crop that
 * shows whatever else lies in the area, or the named objects alone
 */
type CaptureFraming = "whole" | "cropped" | "isolated";

/** The export region to capture, and how the result names it; or why there is nothing to capture */
type CapturePlan =
	| {
			ok: true;
			region: CanvasExportRegion;
			subject: string;
			framing: CaptureFraming;
	  }
	| { ok: false; text: string };

const ISOLATE_WITHOUT_NAMED_OBJECTS_TEXT =
	'isolate works with ids or target "selection" only, since it draws just the objects those name; a rect, target "all" or no region names none, so drop isolate or give ids instead';

/** The `{ ids }` export region, isolated only when asked to be */
const toIdsCapture = (
	ids: readonly string[],
	subject: string,
	isolate: boolean,
): CapturePlan => ({
	ok: true,
	region: isolate ? { ids, isolate: true } : { ids },
	subject,
	framing: isolate ? "isolated" : "cropped",
});

const planCapture = (
	op: Extract<AiHandleOp, { kind: "captureCanvas" }>,
	handleControl: AiHandleControl,
): CapturePlan => {
	const resolution = resolveAiRegion(op);
	if (!resolution.ok) {
		return resolution;
	}
	const { region } = resolution;
	const isolate = op.isolate === true;
	if (isolate && region.kind !== "ids" && region.kind !== "selection") {
		return { ok: false, text: ISOLATE_WITHOUT_NAMED_OBJECTS_TEXT };
	}
	switch (region.kind) {
		case "none":
		case "all":
			return {
				ok: true,
				region: "content",
				subject: "the whole drawing",
				framing: "whole",
			};
		case "selection": {
			const selectedIds = handleControl.getSelectedIds();
			if (selectedIds.length === 0) {
				return {
					ok: false,
					text: "nothing is selected, so there is nothing to capture; select_objects first, or name ids / a rect",
				};
			}
			if (handleControl.measureVisualBounds(selectedIds) === null) {
				return {
					ok: false,
					text: "nothing to capture: none of the selected objects draws anything; select something else, or name ids / a rect",
				};
			}
			return toIdsCapture(
				selectedIds,
				`the ${selectedIds.length} selected object(s)`,
				isolate,
			);
		}
		case "ids":
			// The canvas rejects ids that draw nothing; caught here first so the
			// answer says so rather than passing on the canvas's own error
			if (handleControl.measureVisualBounds(region.ids) === null) {
				return {
					ok: false,
					text: `nothing to capture at ${quoteIds(region.ids)}: none of those ids is on the canvas, or none of them draws anything`,
				};
			}
			return toIdsCapture(region.ids, quoteIds(region.ids), isolate);
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
				framing: "cropped",
			};
	}
};

/** What the result says about everything else in the drawing, given how the picture was framed */
const FRAMING_SENTENCES: Readonly<Record<CaptureFraming, string | null>> = {
	whole: null,
	cropped:
		"The picture is cropped, not filtered: anything else drawn inside that rect is in it too.",
	isolated:
		"The picture is isolated: only those objects are drawn, with their descendants and the connectors whose attached ends are all on them, and anything else inside that rect is left out.",
};

/** Says what the image covers in world terms, which is what lets a spot in it be turned back into a world point */
const describeCapture = (
	{ region, pixelWidth, pixelHeight }: CanvasPngCapture,
	subject: string,
	framing: CaptureFraming,
): string => {
	const pixelSize = `${formatNumber(pixelWidth)} x ${formatNumber(pixelHeight)} px`;
	return [
		`captured ${subject}, covering world rect ${formatRect(region)} at ${pixelSize}.`,
		FRAMING_SENTENCES[framing],
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
 *   captured, and none of them takes the whole drawing. isolate is refused
 *   unless the region names objects (ids or the selection)
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
			text: describeCapture(capture, plan.subject, plan.framing),
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
