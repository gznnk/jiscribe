import { theme } from "../../../../../constants/theme";
import { AUTO_COLOR } from "../../../../../schemas/objects/utils/autoColor";

/**
 * ラベル背景（fill）の描画色を解決する。
 * 省略時・`"auto"` 時はキャンバス地色（knockout で線を隠す既定）。具体色はそのまま
 * （`"transparent"` を選べば線が透ける）。表示と編集で同じ結果にするため共通化する。
 */
export const resolveLabelFill = (fill?: string): string =>
	fill === undefined || fill === AUTO_COLOR ? theme.canvasBg : fill;
