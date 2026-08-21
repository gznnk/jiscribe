import { requireObjects } from "./utils/objectAccess";
import type { DocDefinitions } from "./utils/objectGeometry";
import {
	applyStyle,
	requestedStyleKeys,
	type StyleParams,
} from "./utils/styleFields";
import type { CanvasDoc } from "../model/canvas/CanvasDoc";

export type SetStyleResult = {
	/** Ids whose object took at least one of the requested properties. */
	styledIds: string[];
	/** Objects that could not take every property, with the names they had no place for. */
	ignored: { id: string; properties: string[] }[];
};

/**
 * Set styling on several objects at once, mutating `doc` in place.
 *
 * A property a given type cannot hold is skipped rather than written — a connector has no
 * fill of its own, a plain `text` shape no corner radius — and every such skip is reported,
 * so the caller can tell "coloured it" from "there was nothing to colour".
 *
 * @param doc - Mutated in place
 * @param ids - Ids to style; all must exist in the root tree
 * @param style - Properties to set; omitted ones are left as they are
 * @param definitions - Type table `features` is read from
 * @returns Which ids were styled, and per object the properties that did not apply
 * @throws {@link DocOperationError} naming every id that was not found, before anything is
 *   written
 */
export const setStyle = (
	doc: CanvasDoc,
	ids: readonly string[],
	style: StyleParams,
	definitions: DocDefinitions,
): SetStyleResult => {
	const locations = requireObjects(doc, ids);
	const result: SetStyleResult = { styledIds: [], ignored: [] };
	const requestedCount = requestedStyleKeys(style).length;

	for (const { object } of locations) {
		const ignoredProperties = applyStyle(
			object,
			style,
			definitions.get(object.type),
		);
		if (ignoredProperties.length < requestedCount) {
			result.styledIds.push(object.id);
		}
		if (ignoredProperties.length > 0) {
			result.ignored.push({ id: object.id, properties: ignoredProperties });
		}
	}
	return result;
};
