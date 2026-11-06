// Applies the operations that arrived from an AI tool and need a mounted canvas
// (selection, the camera, measuring, reading the interaction status) to the
// canvas on screen. They do not change the document, so nothing is pushed onto
// the undo history and this is a route apart from applyCanvasOp (capturing is
// held by captureCanvasImage for the same reason, and because it carries an
// image rather than text). Measuring text may wait for the fonts to settle, so
// applying is async as a whole even though the rest answers at once.
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
import { resolveAiRegion } from "./resolveAiRegion";
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
	`${lineCount === null ? "laid out as HTML blocks (no line count)," : `${lineCount} line(s)`} taking ${formatNumber(textSize.width)} x ${formatNumber(textSize.height)} px in a text region of ${formatNumber(regionSize.width)} x ${formatNumber(regionSize.height)} px, drawn at ${formatPoint(bounds)}`;

const describeTextSlot = (
	id: string,
	measurement: TextSlotMeasurement,
): string => {
	const head = `text slot "${measurement.textSlotId}" of "${id}": ${describeTextSlotSize(measurement)}`;
	if (!measurement.isOverflowing) {
		return `${head}; it fits`;
	}
	const missing = describeMissingRoom(measurement);
	const missingNote = missing === "" ? "" : ` It is short ${missing}.`;
	return `${head}; the shape is clipping it.${missingNote} Fix it by growing the object with resize_objects, by lowering fontSize with set_style, or by shortening the text with set_texts.`;
};

/** What hit_test was aimed at, written one way for a point and another for a rect (the rect is the one with a width) */
const formatHitTarget = (target: Point | Rect): string =>
	"width" in target ? formatRect(target) : formatPoint(target);

/**
 * The user's interaction status: the text being edited and the drag first, since
 * those are what an edit written meanwhile can cut off, and the rest only where it
 * is on. The closing note names no drag kind; the drags that change nothing are
 * named in get_interaction_status's declaration
 */
const describeInteractionStatus = ({
	drag,
	isInertialScrolling,
	editingTextId,
	drawingShapeType,
	modal,
}: CanvasInteractionStatus): string => {
	const parts = [
		editingTextId === null
			? "no text is open in the editor"
			: `the user is typing in "${editingTextId}"`,
		drag === null
			? "no drag is in progress"
			: `a "${drag}" drag is in progress`,
		isInertialScrolling
			? "the view is still coasting from a released pan"
			: null,
		drawingShapeType === null
			? null
			: `the ${drawingShapeType} drawing tool is armed`,
		modal === null ? null : `the "${modal}" dialog is open`,
	].filter((part) => part !== null);
	const holdNote =
		editingTextId === null && drag === null
			? ""
			: " Hold off on edits until the text is closed, or a drag that changes the document has ended, then read this again.";
	return `${parts.join("; ")}.${holdNote}`;
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

/** fit_view: the whole drawing, the selection, named objects, or a world rect */
const applyFitView = (
	op: Extract<AiHandleOp, { kind: "fitView" }>,
	handleControl: AiHandleControl,
): AiCanvasOpOutcome => {
	const resolution = resolveAiRegion(op);
	if (!resolution.ok) {
		return resolution;
	}
	const { region } = resolution;
	switch (region.kind) {
		case "none":
			return {
				ok: false,
				text: 'nothing was given to fit the view to: pass target "all" or "selection", ids, or a rect',
			};
		case "rect":
			return applyFitToRect(region.rect, handleControl);
		case "ids": {
			const bounds = handleControl.measureVisualBounds(region.ids);
			if (bounds === null) {
				return {
					ok: false,
					text: `nothing to frame at ${quoteIds(region.ids)}: none of those ids is on the canvas, or none of them draws anything`,
				};
			}
			const camera = handleControl.fitViewToRect(bounds);
			if (camera === null) {
				return {
					ok: false,
					text: `${quoteIds(region.ids)} draw ${formatRect(bounds)}, which has no extent on either axis, so there was nothing to fit the view to`,
				};
			}
			return {
				ok: true,
				text: `fitted the view around ${quoteIds(region.ids)}, drawn within ${formatRect(bounds)}; ${describeCamera(camera)}. The window's proportions decide how much extra is on screen, so read get_view for what actually shows`,
			};
		}
		case "all":
		case "selection": {
			const camera = handleControl.fitView(region.kind);
			if (camera === null) {
				return {
					ok: false,
					text:
						region.kind === "selection"
							? "nothing is selected, so there was nothing to fit the view to"
							: "the canvas is empty, so there was nothing to fit the view to",
				};
			}
			return {
				ok: true,
				text: `fitted the view to ${region.kind === "selection" ? "the selection" : "the whole drawing"}; ${describeCamera(camera)}`,
			};
		}
	}
};

/** An overlapping pair whose two boxes are identical */
type CoincidingOverlap = ObjectOverlap & { covers: "both" };

/** An overlapping pair where neither box covers the other */
type PartialOverlap = ObjectOverlap & { covers: null };

/** An overlapping pair where one box covers the other, which `covers` names */
type Containment = ObjectOverlap & { covers: "first" | "second" };

const isCoincidingOverlap = (
	value: ObjectOverlap,
): value is CoincidingOverlap => value.covers === "both";

const isPartialOverlap = (value: ObjectOverlap): value is PartialOverlap =>
	value.covers === null;

const isContainment = (value: ObjectOverlap): value is Containment =>
	value.covers === "first" || value.covers === "second";

/** The pairs whose boxes are identical */
const describeCoincidingOverlaps = (
	coincidingOverlaps: CoincidingOverlap[],
): string[] =>
	coincidingOverlaps.length === 0
		? []
		: [
				`${coincidingOverlaps.length} pair(s) occupying the same box:`,
				...coincidingOverlaps.map(
					({ ids: [first, second], overlap }) =>
						`- "${first}" and "${second}" both occupy ${formatRect(overlap)}`,
				),
			];

/** The pairs that share area without either box containing the other */
const describePartialOverlaps = (
	partialOverlaps: PartialOverlap[],
): string[] =>
	partialOverlaps.length === 0
		? []
		: [
				`${partialOverlaps.length} partly overlapping pair(s), widest overlap first:`,
				...partialOverlaps.map(
					({ ids: [first, second], overlap }) =>
						`- "${first}" and "${second}" share ${formatRect(overlap)}`,
				),
			];

/** The pairs where one box contains the other: a count, or with includeContained one line each naming which contains which */
const describeContainments = (
	containments: Containment[],
	includeContained: boolean,
): string[] => {
	if (containments.length === 0) {
		return [];
	}
	if (!includeContained) {
		return [
			`${containments.length} pair(s) where one box contains the other are not listed (includeContained: true lists them).`,
		];
	}
	return [
		`${containments.length} pair(s) where one box contains the other, widest overlap first:`,
		...containments.map(({ ids: [first, second], overlap, covers }) => {
			const [outerId, innerId] =
				covers === "first" ? [first, second] : [second, first];
			return `- "${first}" and "${second}" share ${formatRect(overlap)}; "${outerId}" contains "${innerId}" entirely`;
		}),
	];
};

/**
 * Applies an operation that needs a mounted canvas, and builds the result text
 * to hand back to the AI.
 *
 * @param op - Any operation but capturing (capturing carries an image rather
 *   than text, so the caller deals with it first)
 * @param handleControl - The way in to the canvas on screen; the host injects it
 * @returns The outcome of applying; when ok=false, text is the error message
 *   written for the AI. A measurement of zero results is still ok=true as long
 *   as there was something to measure, and only nothing to measure at all makes
 *   it ok=false
 */
export const applyHandleOp = async (
	op: Exclude<AiHandleOp, { kind: "captureCanvas" }>,
	handleControl: AiHandleControl,
): Promise<AiCanvasOpOutcome> => {
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
		case "fitView":
			return applyFitView(op, handleControl);
		case "measureText": {
			let measurement = handleControl.measureText(op.id, op.slot);
			// A type that measures its own body lays it out off screen at once, so a
			// face the page has not loaded yet (a bold heading, a code font) is
			// measured with its fallback; once the fonts settle, measure again
			if (
				measurement !== null &&
				typeof document !== "undefined" &&
				document.fonts?.status === "loading"
			) {
				await document.fonts.ready;
				measurement = handleControl.measureText(op.id, op.slot);
			}
			if (measurement === null) {
				const slotNote = op.slot === undefined ? "" : ` slot "${op.slot}" of`;
				return {
					ok: false,
					text: `nothing to measure at${slotNote} "${op.id}": either no object has that id, its type has no text region (connectors and poly shapes have none), or it holds no such text slot — describe_canvas lists the slots an object has`,
				};
			}
			return {
				ok: true,
				text: describeTextSlot(op.id, measurement),
				textMeasurement: measurement,
			};
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
			// filter keeps the canvas's order (widest shared area first) within each group
			const coincidingOverlaps = overlaps.filter(isCoincidingOverlap);
			const partialOverlaps = overlaps.filter(isPartialOverlap);
			const containments = overlaps.filter(isContainment);
			const hasUncontainedOverlap =
				coincidingOverlaps.length > 0 || partialOverlaps.length > 0;
			return {
				ok: true,
				text: [
					...describeCoincidingOverlaps(coincidingOverlaps),
					...describePartialOverlaps(partialOverlaps),
					...(hasUncontainedOverlap
						? []
						: ["no pair(s) occupying the same box or partly overlapping"]),
					...describeContainments(containments, op.includeContained ?? false),
					...(hasUncontainedOverlap
						? [
								"Overlaps are allowed; where one was not meant, open the layout up with translate_objects, re-place shapes with set_positions, or remove a shape placed twice with delete_objects.",
							]
						: []),
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
