import { CIRCLE_INSET } from "./shapes/Circle";
import { CONCAVE_TRIANGLE_INSET } from "./shapes/ConcaveTriangle";
import { FILLED_DIAMOND_INSET } from "./shapes/FilledDiamond";
import { FILLED_TRIANGLE_INSET } from "./shapes/FilledTriangle";
import { HOLLOW_DIAMOND_INSET } from "./shapes/HollowDiamond";
import { HOLLOW_TRIANGLE_INSET } from "./shapes/HollowTriangle";
import type { ArrowType } from "../../../schemas/objects/types/ArrowType";

/**
 * 矢印種別ごとの「線を終端させるべき根元」までの距離（ローカル単位）。
 *
 * コネクタ/ポリラインの線は端点（矢印の先端）まで引かれるため、そのままだと
 *   1. 中空矢印では線が中空部を貫通して見える
 *   2. 線が太いと先端の細い部分から線幅分はみ出す
 * 線をこの距離だけ手前で終端させることで、背景色に依存せず両方を解消する。
 *
 * `Record<ArrowType, number>` で全種別を網羅しているため、矢印種別が増えたときに
 * inset の定義漏れをコンパイルエラーで検知できる。各値は対応するシェイプの定数を参照する
 * （形状と inset を同じファイルで管理し、形を変えたら inset も追従させるため）。
 *
 * 短縮しない種別:
 *   - None: 矢印が無い
 *   - OpenArrow: body を持たず先端（端点）で線と接続するため、短縮すると隙間ができる
 */
const ARROW_LINE_INSETS: Record<ArrowType, number> = {
	FilledTriangle: FILLED_TRIANGLE_INSET,
	ConcaveTriangle: CONCAVE_TRIANGLE_INSET,
	OpenArrow: 0,
	HollowTriangle: HOLLOW_TRIANGLE_INSET,
	FilledDiamond: FILLED_DIAMOND_INSET,
	HollowDiamond: HOLLOW_DIAMOND_INSET,
	Circle: CIRCLE_INSET,
	None: 0,
};

/**
 * 矢印種別に応じた線の inset（ローカル単位）を返す。実距離は呼び出し側で
 * 矢印スケール（= strokeWidth）を掛ける。`undefined` / 短縮不要な種別は 0。
 */
export const getArrowLineInset = (type: ArrowType | undefined): number =>
	type === undefined ? 0 : ARROW_LINE_INSETS[type];
