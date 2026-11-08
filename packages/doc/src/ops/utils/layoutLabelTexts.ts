import type { Rect } from "@jiscribe/geometry";
import type { LayoutVisualMargin } from "@jiscribe/layout";

import { type ObjectRecord, readChildren } from "./objectAccess";
import {
	type DocDefinitions,
	readBodyTextStyleDefaults,
} from "./objectGeometry";
import { isTransformed } from "./transformFields";
import type { CanvasDoc } from "../../model/canvas/CanvasDoc";
import type { ObjectDoc } from "../../model/objects/base/ObjectDoc";
import { isRichText } from "../../model/objects/types/text/RichText";
import type { TextSlot } from "../../model/objects/types/text/TextSlot";
import {
	type RestackBeneathRequest,
	restackBeneath,
} from "../../model/objects/utils/restackBeneath";
import {
	type ConnectorUnderLabelText,
	calcLabelTextLayoutMargin,
} from "../../text/label/calcLabelTextLayoutMargin";
import {
	calcLabelTextRegion,
	isLabelTextDrawn,
} from "../../text/label/calcLabelTextRegion";

/** The object's caption as calcLabelTextLayoutMargin and calcLabelTextRegion take it. */
const readLabelTextBody = (
	object: ObjectRecord,
): Partial<TextSlot> | undefined =>
	isRichText(object.text) ? (object as Partial<TextSlot>) : undefined;

/**
 * What the object draws past its box, which the layout keeps room for: a `"label"`
 * type's caption (calcLabelTextLayoutMargin), measured in the font it is drawn with.
 *
 * @param bounds - The object's box as the layout is given it
 */
export const readLayoutVisualMargin = (
	object: ObjectRecord,
	bounds: Rect,
	definitions: DocDefinitions,
): LayoutVisualMargin | undefined => {
	const definition = definitions.get(object.type);
	return definition === undefined
		? undefined
		: calcLabelTextLayoutMargin(
				definition.features.text,
				bounds,
				readLabelTextBody(object),
				readBodyTextStyleDefaults(definition),
				isTransformed(object),
			);
};

/**
 * Where a `"label"` type hangs its caption (calcLabelTextRegion), in the shape's local
 * coordinates (its centre the origin), or undefined for any other type and for a
 * caption that draws nothing (isLabelTextDrawn).
 *
 * @param bounds - The object's untransformed box
 */
export const readLocalLabelTextRegion = (
	object: ObjectRecord,
	bounds: Rect,
	definitions: DocDefinitions,
): Rect | undefined => {
	const definition = definitions.get(object.type);
	const body = readLabelTextBody(object);
	return definition?.features.text !== "label" || !isLabelTextDrawn(body)
		? undefined
		: calcLabelTextRegion(bounds, body, readBodyTextStyleDefaults(definition));
};

/**
 * Where restacking takes the connectors the layout routed under a caption: each to
 * just beneath that shape, within its own parent, beneath the shape or the group
 * holding it there (restackBeneath), so the caption, knocking out what lies behind it,
 * reads over the line. Nothing is moved yet (see applyLabelTextRestack).
 */
export type LabelTextRestack = {
	/** Each parent's children in their new order, for the parents whose order changes. */
	orderedIdsBySiblings: Map<ObjectDoc[], string[]>;
	/** The connectors moved, parent by parent, each parent's in the order they stood. */
	movedIds: string[];
};

/** Where restacking takes the connectors given, with the owners each runs under the caption of. */
export const planLabelTextRestack = (
	doc: CanvasDoc,
	connectors: readonly ConnectorUnderLabelText[],
): LabelTextRestack => {
	const restack: LabelTextRestack = {
		orderedIdsBySiblings: new Map(),
		movedIds: [],
	};
	if (connectors.length === 0) {
		return restack;
	}
	const parentIdById = new Map<string, string>();
	const siblingsById = new Map<string, ObjectDoc[]>();
	const walk = (siblings: ObjectDoc[], parentId: string | undefined): void => {
		for (const object of siblings) {
			if (siblingsById.has(object.id)) {
				continue;
			}
			siblingsById.set(object.id, siblings);
			if (parentId !== undefined) {
				parentIdById.set(object.id, parentId);
			}
			walk(readChildren(object), object.id);
		}
	};
	walk(doc.root, undefined);
	const pathFrom = (id: string): string[] => {
		const path = [id];
		for (
			let parentId = parentIdById.get(id);
			parentId !== undefined;
			parentId = parentIdById.get(parentId)
		) {
			path.push(parentId);
		}
		return path;
	};
	const requestsBySiblings = new Map<ObjectDoc[], RestackBeneathRequest[]>();
	for (const { connectorId, ownerIds } of connectors) {
		const siblings = siblingsById.get(connectorId);
		if (siblings === undefined) {
			continue;
		}
		const request = { id: connectorId, beneathPaths: ownerIds.map(pathFrom) };
		const parentRequests = requestsBySiblings.get(siblings);
		if (parentRequests === undefined) {
			requestsBySiblings.set(siblings, [request]);
		} else {
			parentRequests.push(request);
		}
	}
	for (const [siblings, parentRequests] of requestsBySiblings) {
		const { orderedIds, movedIds } = restackBeneath(
			siblings.map(({ id }) => id),
			parentRequests,
		);
		if (movedIds.length > 0) {
			restack.orderedIdsBySiblings.set(siblings, orderedIds);
			restack.movedIds.push(...movedIds);
		}
	}
	return restack;
};

/** One parent's children in the order `restack` leaves them, as a new array. */
const readRestackedSiblings = (
	siblings: ObjectDoc[],
	restack: LabelTextRestack,
): ObjectDoc[] => {
	const orderedIds = restack.orderedIdsBySiblings.get(siblings);
	if (orderedIds === undefined) {
		return [...siblings];
	}
	const objectById = new Map(siblings.map((object) => [object.id, object]));
	return orderedIds.map((id) => objectById.get(id) as ObjectDoc);
};

/** Move the connectors where `restack` takes them, mutating the doc's parent arrays in place. */
export const applyLabelTextRestack = (restack: LabelTextRestack): void => {
	for (const siblings of restack.orderedIdsBySiblings.keys()) {
		siblings.splice(
			0,
			siblings.length,
			...readRestackedSiblings(siblings, restack),
		);
	}
};
