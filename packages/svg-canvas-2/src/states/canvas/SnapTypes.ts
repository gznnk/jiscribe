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
	/** X軸スナップ（縦ガイド線）。left/right が各々候補と一致した場合に複数になる */
	x: SnapAxisFeedback[];
	/** Y軸スナップ（横ガイド線）。top/bottom が各々候補と一致した場合に複数になる */
	y: SnapAxisFeedback[];
};
