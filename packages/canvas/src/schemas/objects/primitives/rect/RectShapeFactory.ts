import { RECT_DOC_DEFAULTS } from "./RectDoc";
import { createFrameShapeFactory } from "../../utils/createFrameShapeFactory";

/** Rect の生成ファクトリ（Frame 系共通ロジックを defaults から生成）。 */
export const RectShapeFactory = createFrameShapeFactory(RECT_DOC_DEFAULTS);
