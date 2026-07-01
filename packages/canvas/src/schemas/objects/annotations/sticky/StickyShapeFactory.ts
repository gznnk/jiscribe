import { STICKY_DOC_DEFAULTS } from "./StickyDoc";
import { createFrameShapeFactory } from "../../utils/createFrameShapeFactory";

/**
 * Sticky の生成ファクトリ（Frame 系共通ロジックを defaults から生成）。
 * sticky はクリックで中央配置のみ（bounds 描画なし）。
 */
export const StickyShapeFactory = createFrameShapeFactory(STICKY_DOC_DEFAULTS, {
	supportsBounds: false,
});
