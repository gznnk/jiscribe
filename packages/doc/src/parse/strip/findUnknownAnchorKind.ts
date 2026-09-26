import { isObject, isString } from "@jiscribe/basic-validators";

import { isAnchorKind } from "../../model/objects/types/EndpointRef";
import type { ObjectTreeNode } from "../utils/mapObjectTree";

/**
 * Finds the first endpoint of a connector doc whose anchor names a kind outside the
 * known set. A missing anchor or a non-string kind is corruption rather than an
 * unknown value, so it is passed over and left to validateConnectorDoc. A known kind
 * in the wrong position (an owned endpoint anchored "free") is likewise not unknown.
 *
 * @param connector - A node whose `type` is `"connector"`; `source` is examined before `target`
 * @returns The endpoint that named the kind and the kind itself, or undefined when
 *   both endpoints anchor to a known kind
 */
export const findUnknownAnchorKind = (
	connector: ObjectTreeNode,
): { endpoint: "source" | "target"; kind: string } | undefined => {
	for (const endpoint of ["source", "target"] as const) {
		const ref = connector[endpoint];
		if (!isObject(ref)) {
			continue;
		}
		const anchor = ref.anchor;
		if (!isObject(anchor)) {
			continue;
		}
		const kind = anchor.kind;
		if (isString(kind) && !isAnchorKind(kind)) {
			return { endpoint, kind };
		}
	}
	return undefined;
};
