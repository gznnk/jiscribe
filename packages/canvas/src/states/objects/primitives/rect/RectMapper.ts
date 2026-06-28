import type { RectState } from "./RectState";
import type { RectDoc } from "../../../../schemas/objects/primitives/rect/RectDoc";
import { RectFeatures } from "../../../../schemas/objects/primitives/rect/RectDoc";
import { createFrameMapper } from "../../base/FrameMapper";

/** RectDoc ↔ RectState 変換（Frame 系共通ロジックを features から生成）。 */
export const { toState: rectToState, toDoc: rectToDoc } = createFrameMapper<
	RectDoc,
	RectState
>(RectFeatures);
