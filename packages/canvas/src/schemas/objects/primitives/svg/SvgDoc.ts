import type { ObjectFeatures } from "../../types/ObjectFeatures";
import type { CreateObjectType } from "../../utils/CreateObjectType";

export const SvgFeatures = {
	type: "svg",
	geometry: "rect",
	transform: true,
	connectable: false,
} as const satisfies ObjectFeatures;

/**
 * SVG オブジェクト固有のフィールド。
 * 中身は不透明な「インライン SVG マークアップ」で、描画時にサニタイズされる。
 */
export type SvgExtraDoc = {
	/** サニタイズ前のインライン SVG 文字列。外部参照は描画時に除去される。 */
	svgText: string;
	/** SVG の原寸（viewBox 由来）。frame の width/height とは独立にスケール基準として保持。 */
	naturalWidth: number;
	naturalHeight: number;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const SvgDocBrand: unique symbol;

export type SvgDoc = CreateObjectType<
	typeof SvgFeatures,
	typeof SvgDocBrand,
	SvgExtraDoc
>;
