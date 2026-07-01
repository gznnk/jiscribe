import type { DiamondState } from "./DiamondState";
import type { DiamondDoc } from "../../../../schemas/objects/primitives/diamond/DiamondDoc";
import { DiamondFeatures } from "../../../../schemas/objects/primitives/diamond/DiamondDoc";
import { createFrameMapper } from "../../base/FrameMapper";

/** DiamondDoc ↔ DiamondState 変換（Frame 系共通ロジックを features から生成）。 */
export const { toState: diamondToState, toDoc: diamondToDoc } =
	createFrameMapper<DiamondDoc, DiamondState>(DiamondFeatures);
