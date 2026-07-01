import type { StickyState } from "./StickyState";
import type { StickyDoc } from "../../../../schemas/objects/annotations/sticky/StickyDoc";
import { StickyFeatures } from "../../../../schemas/objects/annotations/sticky/StickyDoc";
import { createFrameMapper } from "../../base/FrameMapper";

/** StickyDoc ↔ StickyState 変換（Frame 系共通ロジックを features から生成）。 */
export const { toState: stickyToState, toDoc: stickyToDoc } = createFrameMapper<
	StickyDoc,
	StickyState
>(StickyFeatures);
