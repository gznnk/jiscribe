// Applies the operations that arrived from an AI tool and need a mounted canvas
// (selection, the camera, measuring, turning into SVG, reading the interaction
// status) to the canvas on screen. They do not change the document, so nothing
// is pushed onto the undo history and this is a route apart from applyCanvasOp
// (capturing is held by captureCanvasImage for the same reason, with the
// further difference that it is async).
//
// Result text is written in a form the AI can copy straight into its next
// instruction. For the measurements the numbers themselves are the deliverable,
// so this is answerable for how they are rounded, for their units, and for
// telling zero results apart from nothing to measure.

import type {
	Camera,
	CanvasInteractionStatus,
	ObjectOverlap,
	TextSlotMeasurement,
} from "@jiscribe/canvas";
import type { Point, Rect } from "@jiscribe/geometry";

import type { AiCanvasOpOutcome, AiHandleOp, AiRect } from "../canvasOps";
import { MAX_SVG_CHARS } from "../canvasOps";
import type { AiHandleControl } from "./types";
import {
	describeRectEdges,
	formatNumber,
	formatPoint,
	formatRect,
	quoteIds,
} from "../resultText";

const NO_CANVAS_TEXT =
	"no canvas is on screen right now, so there is nothing to select, move the view on, measure, or read the view of";

/** A coordinate conversion goes unanswered only while the `<svg>` is not mounted; that is a different thing from having no way in */
const NOT_MOUNTED_TEXT =
	"the canvas has not finished mounting its drawing surface, so there is no coordinate system to convert through yet; try again in a moment";

/** Adds the resulting camera as numbers, so that the AI can build its next instruction */
const describeCamera = ({ minX, minY, zoom }: Camera): string =>
	`the view now starts at (${minX}, ${minY}) at ${Math.round(zoom * 100)}% zoom`;

/** Lists only the axes that overflow; the empty string when it fits on both */
const describeMissingRoom = ({
	textSize,
	regionSize,
}: TextSlotMeasurement): string =>
	[
		textSize.width > regionSize.width
			? `${formatNumber(textSize.width - regionSize.width)} px of width`
			: null,
		textSize.height > regionSize.height
			? `${formatNumber(textSize.height - regionSize.height)} px of height`
			: null,
	]
		.filter((missing) => missing !== null)
		.join(" and ");

/** The size of the slot measured; the same numbers whether or not it fits */
const describeTextSlotSize = ({
	lineCount,
	textSize,
	regionSize,
	bounds,
}: TextSlotMeasurement): string =>
	`${lineCount} line(s) taking ${formatNumber(textSize.width)} x ${formatNumber(textSize.height)} px in a text region of ${formatNumber(regionSize.width)} x ${formatNumber(regionSize.height)} px, drawn at ${formatPoint(bounds)}`;

const describeTextSlot = (
	id: string,
	measurement: TextSlotMeasurement,
): string => {
	const head = `text slot "${measurement.slotId}" of "${id}": ${describeTextSlotSize(measurement)}`;
	if (!measurement.isOverflowing) {
		return `${head}; it fits`;
	}
	const missing = describeMissingRoom(measurement);
	const missingNote = missing === "" ? "" : ` It is short ${missing}.`;
	return `${head}; the shape is clipping it.${missingNote} Fix it by growing the object with resize_object, by lowering fontSize with set_style, or by shortening the text with set_text.`;
};

/** What hit_test was aimed at, written one way for a point and another for a rect (the rect is the one with a width) */
const formatHitTarget = (target: Point | Rect): string =>
	"width" in target ? formatRect(target) : formatPoint(target);

/**
 * The SVG string. Over the budget it returns only the start and says outright
 * that the rest cannot be had this way, along with what to read instead
 * (written the same way as the describe_canvas truncation)
 */
const describeSvg = (svg: string): string =>
	svg.length <= MAX_SVG_CHARS
		? svg
		: [
				`(SVG truncated: ${svg.length} chars total, showing the first ${MAX_SVG_CHARS}. The rest cannot be reached this way: look at the drawing with capture_canvas, or read the objects with list_objects and get_object.)`,
				svg.slice(0, MAX_SVG_CHARS),
			].join("\n");

/**
 * The user's interaction status. What the AI cares about is what it must not
 * touch and why a write of its own may be turned away, so the text being edited
 * and the drag come first, and the rest is added only where it is on
 */
const describeInteractionStatus = ({
	drag,
	isInertialScrolling,
	editingTextId,
	drawingShapeType,
	modal,
	isBusy,
}: CanvasInteractionStatus): string => {
	const parts = [
		editingTextId === null
			? "no text is open in the editor"
			: `the user is typing in "${editingTextId}", so leave that object's text alone until they are done`,
		drag === null
			? "no drag is in progress"
			: `a "${drag}" drag is in progress, which is why an edit of yours may be refused or wiped out; wait for it to end rather than calling again`,
		isInertialScrolling
			? "the view is still coasting from a released pan"
			: null,
		drawingShapeType === null
			? null
			: `the ${drawingShapeType} drawing tool is armed`,
		modal === null ? null : `the "${modal}" dialog is open`,
	].filter((part) => part !== null);
	const busyNote = isBusy
		? "The canvas is busy: hold off on edits and read this again in a moment."
		: "The canvas is idle, so it is safe to write to.";
	return `${parts.join("; ")}. ${busyNote}`;
};

/** The rect form of fit_view. The rect fitted and what actually shows are two different things, so the result says as much */
const applyFitToRect = (
	rect: AiRect,
	handleControl: AiHandleControl,
): AiCanvasOpOutcome => {
	const camera = handleControl.fitViewToRect(rect);
	if (camera === null) {
		return {
			ok: false,
			text: `${formatRect(rect)} has no extent on either axis, so there was nothing to fit the view to`,
		};
	}
	return {
		ok: true,
		text: `fitted the view around ${formatRect(rect)}; ${describeCamera(camera)}. The window's proportions decide how much extra is on screen, so read get_view for what actually shows`,
	};
};

/** One overlapping pair. Containment is usually deliberate, so which of the two this is always comes with it */
const describeOverlap = ({ ids, overlap, covers }: ObjectOverlap): string => {
	const [first, second] = ids;
	const coverNote =
		covers === null
			? "neither contains the other, so this is usually a layout mistake"
			: `"${covers === "first" ? first : second}" contains the other entirely, which is usually deliberate`;
	return `- "${first}" and "${second}" share ${formatRect(overlap)}; ${coverNote}`;
};

/**
 * Applies an operation that needs a mounted canvas, and builds the result text
 * to hand back to the AI.
 *
 * @param op - Any operation but capturing (capturing is async, so the caller
 *   deals with it first)
 * @param handleControl - The way in to the canvas on screen; the host injects it
 * @returns The outcome of applying; when ok=false, text is the error message
 *   written for the AI. A measurement of zero results is still ok=true as long
 *   as there was something to measure, and only nothing to measure at all makes
 *   it ok=false
 */
export const applyHandleOp = (
	op: Exclude<AiHandleOp, { kind: "captureCanvas" }>,
	handleControl: AiHandleControl,
): AiCanvasOpOutcome => {
	if (!handleControl.isAvailable()) {
		return { ok: false, text: NO_CANVAS_TEXT };
	}
	switch (op.kind) {
		case "selectObjects": {
			if (op.ids.length === 0) {
				handleControl.selectObjects([]);
				return { ok: true, text: "cleared the selection" };
			}
			const { selectedIds, ignoredIds } = handleControl.selectObjects(op.ids);
			const ignoredNote =
				ignoredIds.length === 0
					? ""
					: ` (could not select ${quoteIds(ignoredIds)}: not on the canvas, or a connector asked for together with something else)`;
			return selectedIds.length === 0
				? {
						ok: false,
						text: `selected nothing${ignoredNote === "" ? "" : ignoredNote}`,
					}
				: { ok: true, text: `selected ${quoteIds(selectedIds)}${ignoredNote}` };
		}
		case "centerView": {
			const camera = handleControl.centerView({ x: op.x, y: op.y }, op.zoom);
			if (camera === null) {
				return { ok: false, text: NO_CANVAS_TEXT };
			}
			return {
				ok: true,
				text: `centered the view on (${op.x}, ${op.y}); ${describeCamera(camera)}`,
			};
		}
		case "setView": {
			const camera = handleControl.setView({
				minX: op.minX,
				minY: op.minY,
				zoom: op.zoom,
			});
			if (camera === null) {
				return { ok: false, text: NO_CANVAS_TEXT };
			}
			return {
				ok: true,
				text: `moved the view; ${describeCamera(camera)}. Read get_view for the world rect that now shows`,
			};
		}
		case "getView": {
			const view = handleControl.getView();
			if (view === null) {
				return { ok: false, text: NO_CANVAS_TEXT };
			}
			const { viewport, visibleWorldRect } = view;
			return {
				ok: true,
				text: `${describeCamera(viewport)} in a drawing area of ${formatNumber(viewport.width)} x ${formatNumber(viewport.height)} screen px, so the user is looking at ${describeRectEdges(visibleWorldRect)}. Anything placed inside that rect lands in front of them; hand these minX / minY / zoom back to set_view to return here later`,
			};
		}
		case "fitView": {
			const { target, rect } = op;
			if (target !== undefined && rect !== undefined) {
				return {
					ok: false,
					text: 'give either target or rect, not both: "all" and "selection" frame what the canvas holds, a rect frames the region you name',
				};
			}
			if (rect !== undefined) {
				return applyFitToRect(rect, handleControl);
			}
			if (target === undefined) {
				return {
					ok: false,
					text: 'nothing was given to fit the view to: pass target "all" or "selection", or a rect',
				};
			}
			const camera = handleControl.fitView(target);
			if (camera === null) {
				return {
					ok: false,
					text:
						target === "selection"
							? "nothing is selected, so there was nothing to fit the view to"
							: "the canvas is empty, so there was nothing to fit the view to",
				};
			}
			return {
				ok: true,
				text: `fitted the view to ${target === "selection" ? "the selection" : "the whole drawing"}; ${describeCamera(camera)}`,
			};
		}
		case "measureText": {
			const measurement = handleControl.measureText(op.id, op.slot);
			if (measurement === null) {
				const slotNote = op.slot === undefined ? "" : ` slot "${op.slot}" of`;
				return {
					ok: false,
					text: `nothing to measure at${slotNote} "${op.id}": either no object has that id, its type has no text region (connectors and poly shapes have none), or it holds no such text slot — describe_canvas lists the slots an object has`,
				};
			}
			return { ok: true, text: describeTextSlot(op.id, measurement) };
		}
		case "findOverlaps": {
			const overlaps = handleControl.findOverlaps(op.ids);
			if (overlaps.length === 0) {
				return {
					ok: true,
					text:
						op.ids === undefined
							? "no two shapes on the canvas overlap (connectors and groups are never compared: a line crossing a shape is how connectors are drawn)"
							: `none of the ${op.ids.length} shape(s) named overlaps another (connectors, groups and ids that are not on the canvas are skipped, so check the ids if you expected an overlap)`,
				};
			}
			return {
				ok: true,
				text: [
					`${overlaps.length} overlapping pair(s), widest overlap first:`,
					...overlaps.map(describeOverlap),
					"Open the layout up with translate_objects, or re-place one shape with set_position.",
				].join("\n"),
			};
		}
		case "measureConnectorPath": {
			const path = handleControl.measureConnectorPath(op.id);
			if (path === null || path.length === 0) {
				return {
					ok: false,
					text: `no path to trace for "${op.id}": either no object has that id, it is not a connector, or one of its ends hangs on an object that is gone`,
				};
			}
			return {
				ok: true,
				text: `connector "${op.id}" is drawn through ${path.length} point(s), source end first: ${path.map(formatPoint).join(" -> ")}`,
			};
		}
		case "measureVisualBounds": {
			const bounds = handleControl.measureVisualBounds(op.ids);
			if (bounds === null) {
				return {
					ok: false,
					text: `nothing to measure at ${quoteIds(op.ids)}: none of those ids is on the canvas, or none of them draws anything (an empty group, a connector whose ends are gone)`,
				};
			}
			return {
				ok: true,
				text: `${quoteIds(op.ids)} draw within ${formatRect(bounds)}, so their right edge is x ${formatNumber(bounds.x + bounds.width)} and their bottom edge y ${formatNumber(bounds.y + bounds.height)}`,
			};
		}
		case "hitTest": {
			const { point, rect, tolerance } = op;
			if (point !== undefined && rect !== undefined) {
				return {
					ok: false,
					text: "give either a point or a rect to test, not both",
				};
			}
			const target = rect ?? point;
			if (target === undefined) {
				return {
					ok: false,
					text: "nothing was given to test: pass a point, or a rect to collect everything reaching into it",
				};
			}
			const ids = handleControl.hitTest(target, tolerance);
			const where = formatHitTarget(target);
			if (ids.length === 0) {
				return {
					ok: true,
					text: `nothing is drawn at ${where}, so that spot is free (groups are never reported, and a connector or polyline counts as hit only near its line)`,
				};
			}
			return {
				ok: true,
				text: `${quoteIds(ids)} at ${where}, front-most first, so "${ids[0]}" is what a click there would land on`,
			};
		}
		case "getSelection": {
			const ids = handleControl.getSelectedIds();
			if (ids.length === 0) {
				return {
					ok: true,
					text: 'nothing is selected right now, so a request pointing at "this" or "these" has to be settled another way: ask the user which objects they mean, or select_objects the ones you think they mean and let them correct you',
				};
			}
			return {
				ok: true,
				text: `the user has ${ids.length} object(s) selected: ${quoteIds(ids)}`,
			};
		}
		case "toSvg": {
			const svg = handleControl.toSvgString();
			if (svg === null) {
				return { ok: false, text: NO_CANVAS_TEXT };
			}
			return { ok: true, text: describeSvg(svg) };
		}
		case "getInteractionStatus": {
			const status = handleControl.getInteractionStatus();
			if (status === null) {
				return { ok: false, text: NO_CANVAS_TEXT };
			}
			return { ok: true, text: describeInteractionStatus(status) };
		}
		case "toWorld": {
			const worldPoint = handleControl.toWorld({ x: op.x, y: op.y });
			if (worldPoint === null) {
				return { ok: false, text: NOT_MOUNTED_TEXT };
			}
			return {
				ok: true,
				text: `client (${op.x}, ${op.y}) is world ${formatPoint(worldPoint)}, which is the form every other tool takes`,
			};
		}
		case "toClient": {
			const clientPoint = handleControl.toClient({ x: op.x, y: op.y });
			if (clientPoint === null) {
				return { ok: false, text: NOT_MOUNTED_TEXT };
			}
			return {
				ok: true,
				text: `world (${op.x}, ${op.y}) is client ${formatPoint(clientPoint)} at this instant; it moves with every pan and zoom`,
			};
		}
	}
};
