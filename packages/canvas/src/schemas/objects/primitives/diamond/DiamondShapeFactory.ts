import { DIAMOND_DOC_DEFAULTS } from "./DiamondDoc";
import { createFrameShapeFactory } from "../../utils/createFrameShapeFactory";

/** Diamond の生成ファクトリ（Frame 系共通ロジックを defaults から生成）。 */
export const DiamondShapeFactory =
	createFrameShapeFactory(DIAMOND_DOC_DEFAULTS);
