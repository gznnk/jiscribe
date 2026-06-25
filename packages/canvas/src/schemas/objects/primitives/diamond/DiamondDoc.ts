import type { ObjectFeatures } from "../../types/ObjectFeatures";
import { AUTO_COLOR } from "../../utils/autoColor";
import type { CreateObjectType } from "../../utils/CreateObjectType";

/**
 * フローチャートの条件分岐に使うひし形。
 *
 * ジオメトリは rect（x/y/width/height）を採用し、描画だけを菱形ポリゴンに差し替える。
 * これにより Frame ベースの変形・テキスト（BoundingBox 全体に配置）・コネクター外形接続を
 * すべて Rect と同じ仕組みで再利用できる。菱形に角丸は不要なので radius は持たない。
 */
export const DiamondFeatures = {
	type: "diamond",
	geometry: "rect",
	transform: true,
	stroke: true,
	fill: true,
	text: true,
	connectable: true,
} as const satisfies ObjectFeatures;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const DiamondDocBrand: unique symbol;

export type DiamondDoc = CreateObjectType<
	typeof DiamondFeatures,
	typeof DiamondDocBrand
>;

export const DIAMOND_DOC_DEFAULTS: Omit<DiamondDoc, "id"> = {
	type: "diamond",
	x: 0,
	y: 0,
	width: 120,
	height: 80,
	fill: "transparent",
	stroke: AUTO_COLOR,
	strokeWidth: 2,
	text: "",
	textType: "text",
	textAlign: "center",
	verticalAlign: "middle",
	fontColor: AUTO_COLOR,
	fontSize: 16,
	fontFamily: "Noto Sans JP",
	fontWeight: "normal",
} as const as DiamondDoc;
