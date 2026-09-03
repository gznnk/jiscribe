// Applies a canvas operation that arrived from an agent's AI tool to the
// CanvasDoc being edited. docOps changes a document destructively, so it is
// always cloned before applying and the new object is what goes back to the
// host (given the same object, Canvas never decides it has to sync).

import {
	DocOperationError,
	type CanvasDoc,
	type DocOps,
	type ObjectSummary,
} from "@jiscribe/doc";

import { MAX_DESCRIBE_CHARS, MAX_SUMMARY_CHARS } from "../canvasOps";
import type {
	AiCanvasOpOutcome,
	AiDocOp,
	AiPoint,
	AiViewPadding,
	AiZOrderPlacement,
} from "../canvasOps";
import { canonicalizeFontWeights } from "./canonicalFontWeight";
import type { CanvasOpHistory } from "./canvasOpHistory";
import { describeRectEdges, formatNumber, quoteIds } from "../resultText";
import type { AiDocBridge } from "./docBridge";

const describeCanvas = (doc: CanvasDoc): string => {
	const json = JSON.stringify(doc, null, 2);
	if (json.length <= MAX_DESCRIBE_CHARS) {
		return json;
	}
	return [
		`(document truncated: ${json.length} chars total, showing the first ${MAX_DESCRIBE_CHARS}. The rest cannot be reached this way: read list_objects for the whole canvas as summaries, find_objects to narrow it down, and get_object for one object in full.)`,
		json.slice(0, MAX_DESCRIBE_CHARS),
	].join("\n");
};

/**
 * The summary list as JSON. Over the budget it does not cut through the middle
 * of a shape: it returns as many whole entries as fit and points at narrowing
 * the search instead (keeping the result in a form the AI can read back as
 * JSON)
 */
const describeSummaries = (summaries: readonly ObjectSummary[]): string => {
	const json = JSON.stringify(summaries);
	if (json.length <= MAX_SUMMARY_CHARS) {
		return json;
	}
	let charCount = "[]".length;
	let shownCount = 0;
	for (const summary of summaries) {
		charCount += JSON.stringify(summary).length + ",".length;
		if (charCount > MAX_SUMMARY_CHARS) {
			break;
		}
		shownCount += 1;
	}
	return [
		`(showing the first ${shownCount} of ${summaries.length} objects; the whole list is ${json.length} chars. Narrow the search with find_objects — by type, by the text a shape carries, by a rect, or by group — instead of reading the rest.)`,
		JSON.stringify(summaries.slice(0, shownCount)),
	].join("\n");
};

/** How the getText result sentence names the text it read; with no slot given it is the body */
const slotLabel = (id: string, slot: string | undefined): string =>
	slot === undefined ? `"${id}"` : `slot "${slot}" of "${id}"`;

/** How a result sentence names a connector end: the id for an end attached to a shape, the coordinates for a free one */
const endpointLabel = (
	ownerId: string | undefined,
	point: AiPoint | undefined,
): string =>
	// Only called once applying has succeeded, so an end with no id always has a point
	ownerId !== undefined ? `"${ownerId}"` : `(${point?.x}, ${point?.y})`;

/** How a result sentence names what an inline decoration covers; omitting occurrence means every match */
const matchLabel = (match: string, occurrence: number | undefined): string =>
	occurrence === undefined
		? `every occurrence of "${match}"`
		: `occurrence ${occurrence} of "${match}"`;

/** The reorderObjects placement, in the wording a result sentence uses */
const PLACEMENT_PHRASES: Record<AiZOrderPlacement, string> = {
	front: "to the front",
	back: "to the back",
	forward: "one step forward",
	backward: "one step backward",
};

/** The note for groups that were emptied by moving objects in or out, and so went away */
const emptiedGroupsNote = (droppedGroupIds: readonly string[]): string =>
	droppedGroupIds.length === 0
		? ""
		: ` (${quoteIds(droppedGroupIds)} went with them: a group with nothing left in it is dropped)`;

/**
 * Applies an operation that only reads the document, and builds the result text
 * to hand back to the AI. Zero results, no match and null are not failures, so
 * they come back as a sentence that says so (docOps throws only when an id is
 * not in the document, and the caller turns that into ok:false).
 *
 * @returns The result text; null for anything that is not a read (the caller
 *   then sends it on to the changing side)
 */
const applyDocRead = (
	op: AiDocOp,
	doc: CanvasDoc,
	docOps: DocOps,
): string | null => {
	switch (op.kind) {
		case "listObjects": {
			const summaries = docOps.listObjects(doc);
			return summaries.length === 0
				? "the canvas is empty: it holds no objects at all"
				: `${summaries.length} object(s), in drawing order (back to front), each group followed by what it holds:\n${describeSummaries(summaries)}`;
		}
		case "findObjects": {
			const { kind: _kind, ...filter } = op;
			const summaries = docOps.findObjects(doc, filter);
			return summaries.length === 0
				? `no object matches: the canvas holds ${docOps.listObjects(doc).length} object(s), and every condition you gave has to hold at once, so drop one of them or widen it`
				: `${summaries.length} match(es), in drawing order (back to front):\n${describeSummaries(summaries)}`;
		}
		case "getObject":
			return `"${op.id}" in full:\n${JSON.stringify(docOps.getObject(doc, op.id))}`;
		case "getObjectBounds": {
			const bounds = docOps.getObjectBounds(doc, op.id);
			return bounds === null
				? `"${op.id}" has no box of its own to measure: a connector follows the objects it joins, and a group holding nothing has nothing to measure`
				: `"${op.id}" occupies ${describeRectEdges(bounds)}`;
		}
		case "getCombinedBounds": {
			const bounds = docOps.getCombinedBounds(doc, op.ids);
			if (bounds === null) {
				return op.ids === undefined
					? "the canvas is empty, so there is nothing to measure"
					: `nothing among ${quoteIds(op.ids)} has a box to measure: they are connectors, empty groups, or types this canvas cannot measure`;
			}
			return op.ids === undefined
				? `the whole drawing occupies ${describeRectEdges(bounds)}`
				: `${quoteIds(op.ids)} together occupy ${describeRectEdges(bounds)}`;
		}
		case "getText": {
			const text = docOps.getText(doc, op.id, op.slot);
			return text === ""
				? `${slotLabel(op.id, op.slot)} holds no text: its text is empty, not missing`
				: `the text of ${slotLabel(op.id, op.slot)} is "${text}"`;
		}
		case "getZOrder": {
			const { index, total } = docOps.getZOrder(doc, op.id);
			const placeNote =
				index === total - 1
					? '; it is already drawn over its siblings, so reorder_objects "front" would change nothing'
					: index === 0
						? '; it is already behind its siblings, so reorder_objects "back" would change nothing'
						: "";
			return `"${op.id}" stands at index ${index} of ${total} sibling(s), counting from the back within the parent holding it (index ${total - 1} is drawn on top)${placeNote}`;
		}
		case "getParentGroup": {
			const parentId = docOps.getParentGroup(doc, op.id);
			return parentId === null
				? `"${op.id}" sits at the top level of the canvas, in no group`
				: `"${op.id}" is held by group "${parentId}"`;
		}
		case "getGroupMembers": {
			const memberIds = docOps.getGroupMembers(doc, op.groupId);
			return memberIds.length === 0
				? `group "${op.groupId}" holds nothing`
				: `group "${op.groupId}" holds ${memberIds.length} object(s) directly, in drawing order (back to front): ${quoteIds(memberIds)}`;
		}
		case "getConnectors": {
			const connectorIds = docOps.getConnectors(doc, op.id);
			return connectorIds.length === 0
				? `no connector has an end on "${op.id}"`
				: `${connectorIds.length} connector(s) have an end on "${op.id}", in drawing order: ${quoteIds(connectorIds)}`;
		}
		case "getConnectedObjects": {
			const connectedIds = docOps.getConnectedObjects(doc, op.id);
			return connectedIds.length === 0
				? `"${op.id}" reaches no other object: nothing is connected to it, or its connectors end at bare coordinates`
				: `"${op.id}" is connected to ${connectedIds.length} object(s): ${quoteIds(connectedIds)}`;
		}
		case "listTypes":
			return `the object types this canvas knows:\n${JSON.stringify(docOps.listTypes())}`;
		default:
			return null;
	}
};

/**
 * Applies an operation that changes the document, and builds the result text to
 * hand back to the AI. On failure it throws DocOperationError, which the caller
 * turns into ok:false.
 */
const applyDocChange = (
	op: AiDocOp,
	draftDoc: CanvasDoc,
	docOps: DocOps,
): string => {
	switch (op.kind) {
		case "addObject": {
			const { kind: _kind, type, ...params } = op;
			const newId = docOps.addObject(draftDoc, type, params);
			return `added ${type} "${newId}" at (${params.x}, ${params.y})`;
		}
		case "addObjects": {
			if (op.groupNewObjects === true && op.parentGroupId !== undefined) {
				throw new DocOperationError(
					"groupNewObjects and parentGroupId ask for two different homes; give only one",
				);
			}
			const addedIds = docOps.addObjects(draftDoc, op.objects);
			const added = op.objects
				.map((newObject, index) => `${newObject.type} "${addedIds[index]}"`)
				.join(", ");
			if (op.parentGroupId !== undefined) {
				docOps.addObjectsToGroup(draftDoc, op.parentGroupId, addedIds);
				return `added ${addedIds.length} objects inside "${op.parentGroupId}": ${added}`;
			}
			if (op.groupNewObjects === true) {
				const groupId = docOps.groupObjects(draftDoc, addedIds);
				return `added ${addedIds.length} objects as group "${groupId}": ${added}`;
			}
			return `added ${addedIds.length} objects: ${added}`;
		}
		case "connect": {
			const { kind: _kind, ...params } = op;
			const newId = docOps.connect(draftDoc, params);
			const source = endpointLabel(params.sourceId, params.sourcePoint);
			const target = endpointLabel(params.targetId, params.targetPoint);
			return `connected ${source} → ${target} as "${newId}"`;
		}
		case "connectMany": {
			const newIds = docOps.connectMany(draftDoc, op.entries);
			const drawn = op.entries
				.map((entry, index) => {
					const source = endpointLabel(entry.sourceId, entry.sourcePoint);
					const target = endpointLabel(entry.targetId, entry.targetPoint);
					return `${source} → ${target} as "${newIds[index]}"`;
				})
				.join(", ");
			return `connected ${newIds.length} connector(s): ${drawn}`;
		}
		case "deleteObjects": {
			const { deletedIds, cascadedIds } = docOps.deleteObjects(
				draftDoc,
				op.ids,
			);
			const cascadeNote =
				cascadedIds.length === 0
					? ""
					: ` (${quoteIds(cascadedIds)} went with them: a connector loses its endpoint, a group its last child)`;
			return `deleted ${quoteIds(deletedIds)}${cascadeNote}`;
		}
		case "setPosition": {
			docOps.setPosition(draftDoc, op.id, { x: op.x, y: op.y });
			return `moved "${op.id}" to (${op.x ?? "unchanged"}, ${op.y ?? "unchanged"})`;
		}
		case "setPositions": {
			docOps.setPositions(draftDoc, op.entries);
			const moved = op.entries
				.map(
					({ id, x, y }) =>
						`"${id}" to (${x ?? "unchanged"}, ${y ?? "unchanged"})`,
				)
				.join(", ");
			return `moved ${op.entries.length} object(s): ${moved}`;
		}
		case "translateObjects": {
			docOps.translateObjects(draftDoc, op.ids, op.deltaX, op.deltaY);
			return `moved ${quoteIds(op.ids)} by (${op.deltaX}, ${op.deltaY})`;
		}
		case "resizeObject": {
			docOps.resizeObject(draftDoc, op.id, {
				width: op.width,
				height: op.height,
			});
			return `resized "${op.id}" to ${op.width ?? "unchanged"} x ${op.height ?? "unchanged"}`;
		}
		case "resizeObjects": {
			docOps.resizeObjects(draftDoc, op.ids, {
				width: op.width,
				height: op.height,
			});
			return `resized ${quoteIds(op.ids)} to ${op.width ?? "unchanged"} x ${op.height ?? "unchanged"} each`;
		}
		case "setHeightMode": {
			if (op.mode === "auto") {
				docOps.setHeightMode(draftDoc, op.ids, { mode: "auto" });
				return `${quoteIds(op.ids)}: the height now follows the text`;
			}
			// The tool declaration leaves height optional (auto never reads it), so a
			// fixed height that has none is refused here
			if (op.height === undefined) {
				throw new DocOperationError(
					'a fixed height needs the height to write: pass height, or mode "auto" to let it follow the text',
				);
			}
			docOps.setHeightMode(draftDoc, op.ids, {
				mode: "fixed",
				height: op.height,
			});
			return `set the height of ${quoteIds(op.ids)} to ${op.height}`;
		}
		case "setRotation": {
			const { rotatedIds, ignoredIds } = docOps.setRotation(
				draftDoc,
				op.ids,
				op.rotation,
			);
			const ignoredNote =
				ignoredIds.length === 0
					? ""
					: ` (${quoteIds(ignoredIds)} stayed as they were: their type has no rotation)`;
			return rotatedIds.length === 0
				? `nothing turned: none of ${quoteIds(op.ids)} has a rotation of its own`
				: `turned ${quoteIds(rotatedIds)} to ${op.rotation}°${ignoredNote}`;
		}
		case "setPoints": {
			docOps.setPoints(draftDoc, op.id, op.points);
			return `reshaped "${op.id}" to ${op.points.length} vertices`;
		}
		case "setPointsMany": {
			docOps.setPointsMany(draftDoc, op.entries);
			const reshaped = op.entries
				.map(({ id, points }) => `"${id}" to ${points.length} vertices`)
				.join(", ");
			return `reshaped ${op.entries.length} shape(s): ${reshaped}`;
		}
		case "reorderObjects": {
			docOps.reorderObjects(draftDoc, op.ids, op.placement);
			return `restacked ${quoteIds(op.ids)} ${PLACEMENT_PHRASES[op.placement]}`;
		}
		case "setBackground": {
			docOps.setBackground(draftDoc, op.color);
			// "painted it white" and "handed it back to the theme" are different
			// things, so the sentence returned tells them apart
			return op.color === null
				? "cleared the canvas background, so the surface follows the viewer's theme again"
				: `painted the canvas background ${op.color}`;
		}
		case "setDocumentView": {
			const declaration = docOps.setView(draftDoc, {
				...(op.padding === undefined ? {} : { padding: op.padding }),
				...(op.open === undefined ? {} : { open: op.open }),
				...(op.scroll === undefined ? {} : { scroll: op.scroll }),
			});
			// Reads back the declaration as written rather than what was asked for,
			// because some requests do not become a declaration at all, such as
			// padding that is 0 on every side
			if (declaration === null) {
				return "the document now declares nothing about how it is presented, so each host frames it its own way";
			}
			const parts = [
				declaration.padding === undefined
					? null
					: `padding ${describePadding(declaration.padding)}`,
				declaration.open === undefined
					? null
					: `framing "${declaration.open}" on open`,
				declaration.scroll === undefined
					? null
					: `scrolling "${declaration.scroll}"`,
			].filter((part) => part !== null);
			return `the document now declares ${parts.join(", ")}`;
		}
		case "setStyle": {
			const { styledIds, ignored } = docOps.setStyle(
				draftDoc,
				op.ids,
				op.style,
			);
			const ignoredNote =
				ignored.length === 0
					? ""
					: ` (not supported by their type: ${ignored
							.map(({ id, properties }) => `"${id}" ${properties.join(" / ")}`)
							.join("; ")})`;
			return styledIds.length === 0
				? `nothing to style: none of ${quoteIds(op.ids)} takes these properties${ignoredNote}`
				: `styled ${quoteIds(styledIds)}${ignoredNote}`;
		}
		case "setExtraProps": {
			const written = docOps.setExtraProps(draftDoc, op.id, op.extraProps);
			// It only comes back empty when every value was undefined; nothing was written
			return written.length === 0
				? `nothing to set on "${op.id}": every value was empty`
				: `set ${written.join(" / ")} on "${op.id}"`;
		}
		case "setText": {
			docOps.setText(draftDoc, op.id, op.text, op.slot);
			return op.text === ""
				? `cleared the text of "${op.id}"`
				: `set the text of "${op.id}" to "${op.text}"`;
		}
		case "setTexts": {
			docOps.setTexts(draftDoc, op.entries);
			const written = op.entries
				.map(({ id, text, slot }) =>
					text === ""
						? `${slotLabel(id, slot)} cleared`
						: `${slotLabel(id, slot)} to "${text}"`,
				)
				.join(", ");
			return `set the text of ${op.entries.length} object(s): ${written}`;
		}
		case "setTextStyle": {
			const { kind: _kind, id, ...params } = op;
			docOps.setInlineTextStyle(draftDoc, id, params);
			return `styled ${matchLabel(params.match, params.occurrence)} in ${slotLabel(id, params.slot)}`;
		}
		case "setTextStyles": {
			docOps.setInlineTextStyles(draftDoc, op.entries);
			const styled = op.entries
				.map(
					({ id, match, occurrence, slot }) =>
						`${matchLabel(match, occurrence)} in ${slotLabel(id, slot)}`,
				)
				.join(", ");
			return `styled ${op.entries.length} stretch(es) of text: ${styled}`;
		}
		case "updateConnector": {
			const { kind: _kind, id, ...params } = op;
			docOps.updateConnector(draftDoc, id, params);
			return `updated connector "${id}"`;
		}
		case "updateConnectors": {
			docOps.updateConnectors(draftDoc, op.entries);
			const updatedIds = op.entries.map(({ id }) => id);
			return `updated ${updatedIds.length} connector(s): ${quoteIds(updatedIds)}`;
		}
		case "alignObjects": {
			docOps.alignObjects(draftDoc, op.ids, op.edge);
			return `aligned ${quoteIds(op.ids)} on ${op.edge}`;
		}
		case "distributeObjects": {
			docOps.distributeObjects(draftDoc, op.ids, op.axis, op.spacing);
			return `distributed ${quoteIds(op.ids)} ${op.axis}ly`;
		}
		case "groupObjects": {
			const groupId = docOps.groupObjects(draftDoc, op.ids);
			return `grouped ${quoteIds(op.ids)} as "${groupId}"`;
		}
		case "dissolveGroup": {
			const releasedIds = docOps.dissolveGroup(draftDoc, op.id);
			return `dissolved "${op.id}", releasing ${quoteIds(releasedIds)}`;
		}
		case "dissolveGroups": {
			const releasedIds = docOps.dissolveGroups(draftDoc, op.ids);
			return releasedIds.length === 0
				? `dissolved ${quoteIds(op.ids)}, which held nothing to release`
				: `dissolved ${quoteIds(op.ids)}, releasing ${quoteIds(releasedIds)}`;
		}
		case "addToGroup": {
			const droppedGroupIds = docOps.addObjectsToGroup(
				draftDoc,
				op.groupId,
				op.ids,
			);
			return `moved ${quoteIds(op.ids)} into "${op.groupId}"${emptiedGroupsNote(droppedGroupIds)}`;
		}
		case "removeFromGroup": {
			const { releasedIds, droppedGroupIds } = docOps.removeObjectsFromGroup(
				draftDoc,
				op.ids,
			);
			return `took ${quoteIds(releasedIds)} out of their group${emptiedGroupsNote(droppedGroupIds)}`;
		}
		default:
			// describeCanvas, undo and the reads do not change the document, so
			// applyCanvasOp deals with them before reaching here
			throw new DocOperationError(`unsupported operation: ${op.kind}`);
	}
};

/** Levels a failure during applying into an ok:false for the AI; what docOps had to say is passed through as it is */
const toFailureOutcome = (error: unknown): AiCanvasOpOutcome => {
	if (error instanceof DocOperationError) {
		return { ok: false, text: error.message };
	}
	return {
		ok: false,
		text: `internal error: ${error instanceof Error ? error.message : String(error)}`,
	};
};

/**
 * Every side of the padding. It is keyed off the type, so a side added to it
 * makes this a type error (a side left off the list would disappear without
 * ever reaching the reader)
 */
const PADDING_SIDES: Readonly<Record<keyof AiViewPadding, true>> = {
	top: true,
	right: true,
	bottom: true,
	left: true,
};

/** A side left out is 0, so every side is filled in and listed for the reader to take them all in */
const describePadding = (padding: AiViewPadding): string =>
	`${(Object.keys(PADDING_SIDES) as (keyof AiViewPadding)[])
		.map((side) => `${side} ${formatNumber(padding[side] ?? 0)}`)
		.join(" / ")} px`;

/**
 * Applies an operation and builds the result text to hand back to the AI.
 *
 * @param op - The operation the host's own tool handler built
 * @param docBridge - A handle on the document being edited; applying happens on
 *   a clone, and only an operation that succeeded reaches replaceDoc
 * @param history - The AI's own undo history; one step is pushed for every
 *   operation that changes the document
 * @param docOps - The doc-ops applying goes through; pass one built with the
 *   same plugin set as the capabilities the tools were given
 * @returns The outcome of applying; when ok=false, text is the error message
 *   written for the AI
 */
export const applyCanvasOp = (
	op: AiDocOp,
	docBridge: AiDocBridge,
	history: CanvasOpHistory,
	docOps: DocOps,
): AiCanvasOpOutcome => {
	if (op.kind === "describeCanvas") {
		return { ok: true, text: describeCanvas(docBridge.getDoc()) };
	}

	const currentDoc = docBridge.getDoc();

	if (op.kind === "undo") {
		const restoredDoc = history.pop(currentDoc);
		if (restoredDoc === null) {
			return {
				ok: false,
				text:
					history.depth() === 0
						? "nothing of yours left to undo"
						: "the canvas changed after your last edit, so undoing it would discard someone else's work; read the canvas and fix it forward instead",
			};
		}
		docBridge.replaceDoc(structuredClone(restoredDoc));
		return { ok: true, text: "undid your last change" };
	}

	// A read never replaces the document, so it needs neither a clone nor an undo entry
	try {
		const readText = applyDocRead(op, currentDoc, docOps);
		if (readText !== null) {
			return { ok: true, text: readText };
		}
	} catch (error) {
		return toFailureOutcome(error);
	}

	const draftDoc = structuredClone(currentDoc);
	try {
		const text = applyDocChange(canonicalizeFontWeights(op), draftDoc, docOps);
		history.push(currentDoc, draftDoc);
		docBridge.replaceDoc(draftDoc);
		return { ok: true, text };
	} catch (error) {
		return toFailureOutcome(error);
	}
};
