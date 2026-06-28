import type { SvgState } from "./SvgState";
import type { SvgDoc } from "../../../../schemas/objects/primitives/svg/SvgDoc";
import { SvgFeatures } from "../../../../schemas/objects/primitives/svg/SvgDoc";
import { createFrameMapper } from "../../base/FrameMapper";

/**
 * SvgDoc ↔ SvgState 変換（Frame 系共通ロジックを features から生成）。
 * svgText は Svg 固有の素通しフィールドなので extraKeys で渡す。
 */
export const { toState: svgToState, toDoc: svgToDoc } = createFrameMapper<
	SvgDoc,
	SvgState
>(SvgFeatures, ["svgText"]);
