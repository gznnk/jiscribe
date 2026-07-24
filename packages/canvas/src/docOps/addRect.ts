import { generateUniqueId } from "./ids";
import type { CanvasDoc } from "../schemas/canvas/CanvasDoc";
import { RectObjectFactory } from "../schemas/objects/primitives/rect/RectObjectFactory";

const DEFAULT_RECT_WIDTH = 160;
const DEFAULT_RECT_HEIGHT = 80;

export type AddRectParams = {
	/** 左上 x（px）。 */
	x: number;
	/** 左上 y（px）。 */
	y: number;
	width?: number;
	height?: number;
	text?: string;
};

/**
 * 矩形を追加し、生成した id を返す（doc は破壊的に変更）。
 *
 * 座標は左上基準で受け取り、ObjectFactory の中心基準へ変換する。id は factory の UUID を
 * `rect-N` 連番へ差し替える（AI が後続の connect 等で参照しやすいよう）。
 */
export function addRect(doc: CanvasDoc, params: AddRectParams): string {
	const width = params.width ?? DEFAULT_RECT_WIDTH;
	const height = params.height ?? DEFAULT_RECT_HEIGHT;
	const rect = RectObjectFactory.createDoc(
		{ x: params.x + width / 2, y: params.y + height / 2 },
		{
			width,
			height,
			...(params.text !== undefined ? { text: params.text } : {}),
		},
	);
	rect.id = generateUniqueId(doc, "rect");
	doc.root.push(rect);
	return rect.id;
}
