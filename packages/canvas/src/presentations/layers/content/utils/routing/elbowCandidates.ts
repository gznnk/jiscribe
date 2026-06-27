import type {
	BoxFeatures,
	OrthogonalDirection,
	Point,
} from "@workspace/geometry";

const uniqueNumbers = (ns: number[]): number[] => [...new Set(ns)];

/** box の外側クリアランス x チャネル（左右辺から margin 外）。free は空。 */
const boxXChannels = (box: BoxFeatures | null, margin: number): number[] =>
	box ? [box.left - margin, box.right + margin] : [];

/** box の外側クリアランス y チャネル（上下辺から margin 外）。free は空。 */
const boxYChannels = (box: BoxFeatures | null, margin: number): number[] =>
	box ? [box.top - margin, box.bottom + margin] : [];

export type ElbowCandidate = {
	elbow: Point[];
	/** 向かい合う端点に対して「中点」で折れる対称（S/Z 字）ルートか。 */
	symmetric: boolean;
};

/**
 * 端点の退出方向が軸上で正面に向かい合うかを判定する（x: 左右、y: 上下）。
 *
 * @param a - 一方の端点の外向き方向
 * @param b - もう一方の端点の外向き方向
 * @returns 各軸で向かい合うか（x: 左右で対向、y: 上下で対向）
 */
export const directionsFace = (
	a: OrthogonalDirection,
	b: OrthogonalDirection,
): { x: boolean; y: boolean } => ({
	x: (a === "right" && b === "left") || (a === "left" && b === "right"),
	y: (a === "down" && b === "up") || (a === "up" && b === "down"),
});

/**
 * スタブ間のエルボ候補を生成する。
 *
 * 縦チャネル x ／横チャネル y の候補集合（両スタブ・中点に加え、**各 box の外周
 * クリアランス（辺 ± margin）**）を通る Z 字を列挙する。box の外周チャネルを含める
 * ことで、図形を回り込む経路が候補に入り、固定スタブだけでは表現できず図形へ
 * めり込んでいた折れ方を解消する。L 字・直線は `simplifyPath` で自然に畳まれて出る。
 *
 * `facingX` / `facingY`（端点が軸上で向かい合う）のとき、その軸の**中点**で折れる
 * 候補に `symmetric` フラグを立て、呼び出し側で S/Z 字を優先できるようにする。
 *
 * @param a - 始点側スタブの座標
 * @param b - 終点側スタブの座標
 * @param sourceBox - 始点図形の回避用 AABB（free 端点は null）
 * @param targetBox - 終点図形の回避用 AABB（free 端点は null）
 * @param margin - 図形面からの押し出し距離（px）。box 外周チャネルの算出に使う
 * @param facingX - 端点が x 軸（左右）で向かい合うか。true なら x=中点折れに symmetric を立てる
 * @param facingY - 端点が y 軸（上下）で向かい合うか。true なら y=中点折れに symmetric を立てる
 * @returns エルボ候補の配列（各候補は折れ点列 elbow と対称フラグ symmetric を持つ）
 */
export const elbowCandidates = (
	a: Point,
	b: Point,
	sourceBox: BoxFeatures | null,
	targetBox: BoxFeatures | null,
	margin: number,
	facingX: boolean,
	facingY: boolean,
): ElbowCandidate[] => {
	const midX = Math.round((a.x + b.x) / 2);
	const midY = Math.round((a.y + b.y) / 2);
	// 折れ位置の候補となる「チャネル」座標を集める。
	// - 両スタブ端の x/y（L 字＝最短の折れ）
	// - 中点 midX/midY（S/Z 字の対称な折れ）
	// - 各 box の外周（辺 ± margin）（図形を回り込む折れ。直線スタブだけでは表現不可）
	// 重複は除く（同じチャネルは1度だけ評価すればよい）。
	const xs = uniqueNumbers([
		a.x,
		b.x,
		midX,
		...boxXChannels(sourceBox, margin),
		...boxXChannels(targetBox, margin),
	]);
	const ys = uniqueNumbers([
		a.y,
		b.y,
		midY,
		...boxYChannels(sourceBox, margin),
		...boxYChannels(targetBox, margin),
	]);

	const candidates: ElbowCandidate[] = [];
	// 縦チャネル x を1本通る経路（水平→垂直→水平）。x が両端や中点と一致すれば
	// 余分な点は simplifyPath で畳まれて L 字／直線になる。
	// 横に向かい合う配置では x=midX が中央で折れる S 字。
	for (const x of xs) {
		candidates.push({
			elbow: [a, { x, y: a.y }, { x, y: b.y }, b],
			symmetric: facingX && x === midX,
		});
	}
	// 横チャネル y を1本通る経路（垂直→水平→垂直）。縦に向かい合う配置では
	// y=midY が中央で折れる S 字。
	for (const y of ys) {
		candidates.push({
			elbow: [a, { x: a.x, y }, { x: b.x, y }, b],
			symmetric: facingY && y === midY,
		});
	}
	return candidates;
};
