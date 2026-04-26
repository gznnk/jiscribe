export type SnapEdge = "left" | "right" | "top" | "bottom";

/**
 * スナップ候補点。
 * x候補: left/right エッジ。coordinate はX座標、perpendicularMin/Max はそのオブジェクトのtop/bottom。
 * y候補: top/bottom エッジ。coordinate はY座標、perpendicularMin/Max はそのオブジェクトのleft/right。
 */
export type SnapCandidate = {
	objectId: string;
	coordinate: number;
	edge: SnapEdge;
	/** ガイド線の垂直方向範囲（開始）*/
	perpendicularMin: number;
	/** ガイド線の垂直方向範囲（終了）*/
	perpendicularMax: number;
};

export type SnapCandidates = {
	/** left/right エッジ候補（coordinate 昇順ソート済み）*/
	x: SnapCandidate[];
	/** top/bottom エッジ候補（coordinate 昇順ソート済み）*/
	y: SnapCandidate[];
};

export type SnapAxisFeedback = {
	/** スナップ座標（ガイド線の位置）*/
	coordinate: number;
	/** ガイド線の垂直方向開始（x-snap: Y座標、y-snap: X座標）*/
	lineStart: number;
	/** ガイド線の垂直方向終了 */
	lineEnd: number;
	sourceObjectIds: string[];
};

export type SnapFeedback = {
	/** X軸スナップ（縦ガイド線）*/
	x: SnapAxisFeedback | null;
	/** Y軸スナップ（横ガイド線）*/
	y: SnapAxisFeedback | null;
};
