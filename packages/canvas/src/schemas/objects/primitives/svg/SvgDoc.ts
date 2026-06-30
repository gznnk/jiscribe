import type { CreateObjectType } from "../../types/CreateObjectType";
import type { ObjectFeatures } from "../../types/ObjectFeatures";

export const SvgFeatures = {
	type: "svg",
	geometry: "rect",
	transform: true,
	connectable: false,
} as const satisfies ObjectFeatures;

/**
 * SVG オブジェクト固有のフィールド。
 * 中身は不透明な「インライン SVG マークアップ」で、描画時にサニタイズされる。
 *
 * 原寸（スケール基準）は描画時に SVG の viewBox（無ければ width/height 属性、
 * それも無ければ既定値）から自動導出するため、doc には持たせない。
 */
export type SvgExtraDoc = {
	/** サニタイズ前のインライン SVG 文字列。外部参照は描画時に除去される。 */
	svgText: string;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const SvgDocBrand: unique symbol;

export type SvgDoc = CreateObjectType<
	typeof SvgFeatures,
	typeof SvgDocBrand,
	SvgExtraDoc
>;
