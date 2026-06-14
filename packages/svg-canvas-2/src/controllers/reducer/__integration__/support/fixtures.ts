import type { CanvasDoc } from "../../../../schemas/canvas/CanvasDoc";

/**
 * テスト用の矩形 Doc を作る。
 * Doc は左上原点（x,y）+ 幅高さ。canvasToState で中心（cx,cy）に変換される
 * （例: x=0,y=0,w=10,h=10 → cx=5,cy=5）。
 */
export const rectDoc = (
	id: string,
	x: number,
	y: number,
	size = 10,
): unknown => ({
	id,
	type: "rect",
	x,
	y,
	width: size,
	height: size,
});

/**
 * 2 矩形のドキュメント。
 * rect-1 → cx=5,cy=5 / rect-2 → cx=105,cy=105。
 */
export const twoRectsDoc: CanvasDoc = {
	version: 1,
	root: [rectDoc("rect-1", 0, 0), rectDoc("rect-2", 100, 100)],
	connectors: [],
} as unknown as CanvasDoc;
