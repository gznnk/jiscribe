import { generateUniqueId } from "./ids";
import type { CanvasDoc } from "../schemas/canvas/CanvasDoc";
import { EllipseObjectFactory } from "../schemas/objects/primitives/ellipse/EllipseObjectFactory";

const DEFAULT_ELLIPSE_RX = 80;
const DEFAULT_ELLIPSE_RY = 50;

export type AddEllipseParams = {
	/** 中心 x（px）。 */
	cx: number;
	/** 中心 y（px）。 */
	cy: number;
	rx?: number;
	ry?: number;
	text?: string;
};

/**
 * 楕円を追加し、生成した id を返す（doc は破壊的に変更）。
 *
 * 楕円は中心基準（cx/cy）。id は factory の UUID を `ellipse-N` 連番へ差し替える。
 */
export function addEllipse(doc: CanvasDoc, params: AddEllipseParams): string {
	const ellipse = EllipseObjectFactory.createDoc(
		{ x: params.cx, y: params.cy },
		{
			rx: params.rx ?? DEFAULT_ELLIPSE_RX,
			ry: params.ry ?? DEFAULT_ELLIPSE_RY,
			...(params.text !== undefined ? { text: params.text } : {}),
		},
	);
	ellipse.id = generateUniqueId(doc, "ellipse");
	doc.root.push(ellipse);
	return ellipse.id;
}
