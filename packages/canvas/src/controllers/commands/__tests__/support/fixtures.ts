import type { CanvasDoc } from "../../../../schemas/canvas/CanvasDoc";

const rectDoc = (id: string, x: number, y: number, size = 10): unknown => ({
	id,
	type: "rect",
	x,
	y,
	width: size,
	height: size,
});

/**
 * 2 矩形 + それらを繋ぐコネクター（conn-1）のドキュメント。
 * root は z-order 順なので、初期状態ではコネクターが最前面（末尾）。
 * 両端 owned なので free-free 破棄には引っかからない。
 */
export const twoRectsWithConnectorDoc: CanvasDoc = {
	version: 1,
	root: [
		rectDoc("rect-1", 0, 0),
		rectDoc("rect-2", 100, 100),
		{
			id: "conn-1",
			type: "connector",
			points: [],
			source: {
				owner: { id: "rect-1" },
				anchor: { kind: "center" },
			},
			target: {
				owner: { id: "rect-2" },
				anchor: { kind: "center" },
			},
		},
	],
} as unknown as CanvasDoc;
