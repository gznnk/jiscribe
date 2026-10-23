import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";

import { canvasToState } from "../../../states/canvas/CanvasMapper";
import type { DocSnapshot } from "../../CanvasTypes";
import { createTestRegistries } from "../../registries/createCanvasRegistries";
import { createDocSnapshotFromState } from "../../utils/resolveDocSnapshot";

const registries = createTestRegistries();

/**
 * A history entry holding the state `doc` loads to, the way one sits on the
 * past or future stack: without a Doc cache, so moving it between stacks keeps
 * its identity (dropDocCache).
 *
 * @param doc - Loaded through the full built-in registries; pass one already
 *   shaped like a parsed doc, since nothing here validates it
 * @param cachedDoc - Held as the entry's Doc cache, as a present entry holds
 *   one once it has been saved; omitted, the entry has none
 */
export const createTestSnapshot = (
	doc: CanvasDoc,
	cachedDoc: CanvasDoc | null = null,
): DocSnapshot => {
	const snapshot = createDocSnapshotFromState(
		canvasToState(
			doc,
			registries.objectMapper,
			registries.objectContentResizer,
		),
	);
	snapshot.doc = cachedDoc;
	return snapshot;
};
