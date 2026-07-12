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

/**
 * 3 矩形 + rect-1 → rect-3 のコネクター。
 * rect-1 + rect-2 をグループ化するとコネクターがグループ境界を跨ぐ形になる
 * （グループ削除カスケードや LCA グルーピングのシナリオ用）。
 */
export const threeRectsWithConnectorDoc: CanvasDoc = {
	version: 1,
	root: [
		rectDoc("rect-1", 0, 0),
		rectDoc("rect-2", 100, 100),
		rectDoc("rect-3", 200, 0),
		{
			id: "conn-1",
			type: "connector",
			points: [],
			source: {
				owner: { id: "rect-1" },
				anchor: { kind: "center" },
			},
			target: {
				owner: { id: "rect-3" },
				anchor: { kind: "center" },
			},
		},
	],
} as unknown as CanvasDoc;

/**
 * 1 矩形 + target 側がすでに free 端点のコネクター。
 * rect-1 を削除すると owned 端点が残らない（free-free になる）ため、
 * クリーンアップはコネクター自体を削除しなければならない。
 */
export const halfFreeConnectorDoc: CanvasDoc = {
	version: 1,
	root: [
		rectDoc("rect-1", 0, 0),
		{
			id: "conn-1",
			type: "connector",
			points: [],
			source: {
				owner: { id: "rect-1" },
				anchor: { kind: "center" },
			},
			target: {
				anchor: { kind: "free", point: { x: 50, y: 50 } },
			},
		},
	],
} as unknown as CanvasDoc;
