import { isLineIntersectingBox } from "./isLineIntersectingBox";
import { calcManhattanDistance } from "../points/calcManhattanDistance";
import type { BoxFeatures } from "../types/BoxFeatures";
import type { OrthogonalDirection } from "../types/OrthogonalDirection";
import type { Point } from "../types/Point";

/**
 * 直交ルータの端点。
 * - `point`: 解決済みの端点座標（図形の辺上 or free 点）
 * - `direction`: その端点で線が図形から**外向きに出る**方向
 * - `box`: 接続図形の軸並行バウンディングボックス（free 端点は null）
 */
export type OrthogonalConnectorEndpoint = {
	point: Point;
	direction: OrthogonalDirection;
	box: BoxFeatures | null;
};

export type RouteOrthogonalConnectorOptions = {
	/** 図形の面から線を押し出す距離（スタブ長, px）。 */
	margin?: number;
};

const DEFAULT_MARGIN = 20;

/**
 * 端点のスタブ点を返す。退出方向の軸では**バウンディングボックスの辺 + margin**まで
 * 押し出し（回転した図形でも AABB の外へ確実に出す）、直交軸は端点座標を保つ。
 *
 * 非回転の図形では face 中心が AABB の辺上にあるため、辺 + margin は
 * 「face 中心 + margin」と一致し、従来挙動と変わらない。回転した図形では face 中心が
 * AABB の内側に入るので、固定 margin だけでは AABB を出られずめり込んでいたのを解消する。
 *
 * 前提: `point` は退出方向の辺の上にあること（connectPoint＝辺の中央なら厳密に成立）。
 * center アンカー等で `point` が辺上に無い場合、スタブ脚（point → stub）が直交軸方向に
 * AABB をかすめうる（v1 の近似。実害は connectPoint 主体なら小さい）。
 */
const stubPoint = (
	point: Point,
	direction: OrthogonalDirection,
	box: BoxFeatures,
	margin: number,
): Point => {
	switch (direction) {
		case "up":
			return { x: point.x, y: box.top - margin };
		case "down":
			return { x: point.x, y: box.bottom + margin };
		case "left":
			return { x: box.left - margin, y: point.y };
		case "right":
			return { x: box.right + margin, y: point.y };
	}
};

/**
 * 重複点と「通過するだけの」共線中間点を畳む。
 * 折り返し（逆走）する点は畳まない——スタブの押し出し方向を保つため、
 * 中間点が両隣の間（単調）にあるときだけ除去する。
 */
const simplify = (points: Point[]): Point[] => {
	// パス1: 連続する重複点を落とす（長さ0セグメントを消す）。
	const dedup: Point[] = [];
	for (const p of points) {
		const last = dedup[dedup.length - 1];
		if (!last || last.x !== p.x || last.y !== p.y) {
			dedup.push({ x: p.x, y: p.y });
		}
	}
	if (dedup.length <= 2) {
		return dedup;
	}
	// パス2: 共線の中間点 b を落として角の数を最小化する。
	// 端点（最初/最後）は常に残し、b は前後の a・c と一直線のときだけ捨てる。
	const out: Point[] = [dedup[0]];
	for (let i = 1; i < dedup.length - 1; i++) {
		const a = out[out.length - 1];
		const b = dedup[i];
		const c = dedup[i + 1];
		// 「単調な共線」= 同じ軸上で、b が a→c の進行方向と同じ向き（折り返さない）。
		// (b - a) と (c - b) の符号が一致（積 >= 0）なら単調。逆走点は畳まずに残す
		// ——スタブの押し出し方向を保つため（畳むと退出方向が消えて図形へ戻る角ができる）。
		const monotonicH =
			a.y === b.y && b.y === c.y && (b.x - a.x) * (c.x - b.x) >= 0;
		const monotonicV =
			a.x === b.x && b.x === c.x && (b.y - a.y) * (c.y - b.y) >= 0;
		if (!monotonicH && !monotonicV) {
			out.push(b);
		}
	}
	out.push(dedup[dedup.length - 1]);
	return out;
};

const uniqueNumbers = (ns: number[]): number[] => [...new Set(ns)];

/** box の外側クリアランス x チャネル（左右辺から margin 外）。free は空。 */
const boxXChannels = (box: BoxFeatures | null, margin: number): number[] =>
	box ? [box.left - margin, box.right + margin] : [];

const boxYChannels = (box: BoxFeatures | null, margin: number): number[] =>
	box ? [box.top - margin, box.bottom + margin] : [];

type ElbowCandidate = {
	elbow: Point[];
	/** 向かい合う端点に対して「中点」で折れる対称（S/Z 字）ルートか。 */
	symmetric: boolean;
};

/**
 * スタブ間のエルボ候補を生成する。
 *
 * 縦チャネル x ／横チャネル y の候補集合（両スタブ・中点に加え、**各 box の外周
 * クリアランス（辺 ± margin）**）を通る Z 字を列挙する。box の外周チャネルを含める
 * ことで、図形を回り込む経路が候補に入り、固定スタブだけでは表現できず図形へ
 * めり込んでいた折れ方を解消する。L 字・直線は `simplify` で自然に畳まれて出る。
 *
 * `facingX` / `facingY`（端点が軸上で向かい合う）のとき、その軸の**中点**で折れる
 * 候補に `symmetric` フラグを立て、呼び出し側で S/Z 字を優先できるようにする。
 */
const elbowCandidates = (
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
	// 余分な点は simplify で畳まれて L 字／直線になる。
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

const pathLength = (points: Point[]): number => {
	let total = 0;
	for (let i = 1; i < points.length; i++) {
		total += calcManhattanDistance(
			points[i - 1].x,
			points[i - 1].y,
			points[i].x,
			points[i].y,
		);
	}
	return total;
};

/** エルボ（スタブ間）が図形を貫通する回数。スタブ脚は含めない。 */
const countBoxCrossings = (
	elbow: Point[],
	sourceBox: BoxFeatures | null,
	targetBox: BoxFeatures | null,
): number => {
	let crossings = 0;
	for (let i = 0; i < elbow.length - 1; i++) {
		const p1 = elbow[i];
		const p2 = elbow[i + 1];
		if (sourceBox && isLineIntersectingBox(p1, p2, sourceBox)) {
			crossings++;
		}
		if (targetBox && isLineIntersectingBox(p1, p2, targetBox)) {
			crossings++;
		}
	}
	return crossings;
};

// 美観（aesthetic）の柔らかいトレードオフ用の重み。ここだけが調整つまみ。
// 1 曲がりは ~1000px の遠回りと釣り合う。
const TURN_WEIGHT = 1_000;
// 向かい合う端点では、中点で折れる対称（S/Z 字）を 1 曲がり分強めに優先する。
const SYMMETRY_BONUS = 1_500;

/**
 * ルート評価。図形貫通は**ハード制約**として最優先で比較し、曲がり数・長さ・対称性は
 * **柔らかい美観**として 1 つの重み付き和にまとめる（ハードは辞書式・ソフトは加点）。
 *
 * 逆走（スタブの押し出し方向に逆らって図形側へ戻る）の専用ペナルティは持たない。
 * 角数をフルパス（スタブ脚込み）で測るため、逆走は必ず折り返しの 1 角として `aesthetic`
 * に現れて自然に不利になる（スタブ脚があるのは box を持つ端点のみで、free 端点では
 * そもそも逆走が定義されない）。
 */
type RouteCost = {
	/** 図形を貫通する回数（最優先で 0 にしたい）。 */
	crossings: number;
	/** 曲がり数×weight + 経路長 − 対称ボーナス（小さいほど良い）。 */
	aesthetic: number;
};

/** 負: a が良い / 正: b が良い。crossings → aesthetic の順。 */
const compareCost = (a: RouteCost, b: RouteCost): number =>
	a.crossings - b.crossings || a.aesthetic - b.aesthetic;

const directionsFace = (
	a: OrthogonalDirection,
	b: OrthogonalDirection,
): { x: boolean; y: boolean } => ({
	x: (a === "right" && b === "left") || (a === "left" && b === "right"),
	y: (a === "down" && b === "up") || (a === "up" && b === "down"),
});

/**
 * 2 端点間を水平/垂直セグメントだけで結ぶ直交経路を生成する。
 *
 * アルゴリズム概要:
 * 1. 各端点を退出方向へ押し出した**スタブ**を作る（AABB 辺 + margin。回転図形でも
 *    バウンディングボックスの外へ確実に出る）。
 * 2. スタブ間を結ぶ**エルボ候補**を、折れ位置の「チャネル」（両スタブ端・中点・
 *    各 box の外周 ± margin）から列挙する。中点チャネルは S/Z 字、box 外周チャネルは
 *    図形の回り込みを表現する。
 * 3. 各候補を `compareCost` の**辞書式**で評価して最良を選ぶ:
 *    図形貫通 → 美観（曲がり数×weight + 長さ − 対称ボーナス）。
 *    角数・長さは「実際に描かれるフルパス（スタブ脚込み）」で測るため、逆走は折り返しの
 *    余分な角として自然に不利になる（専用ペナルティは持たない）。
 *
 * 戻り値は端点を含むフルパス `[source.point, …, target.point]`（共線・重複は畳み済み）。
 * **両端の図形のみ**を回避対象とし、間にある他図形は考慮しない（v1）。
 *
 * 未対応 / 将来の拡張余地（旧 svg-canvas にあって本実装に無いもの）:
 * - **角丸 / 曲線レンダリング**（旧 `pathType` の Rounded / Curve）。本実装は角が直角のみ。
 *   角の描画スタイルは別機能として後回し。
 */
export const routeOrthogonalConnector = (
	source: OrthogonalConnectorEndpoint,
	target: OrthogonalConnectorEndpoint,
	options: RouteOrthogonalConnectorOptions = {},
): Point[] => {
	const margin = options.margin ?? DEFAULT_MARGIN;

	// ── ステップ1: スタブ ──
	// 各端点を退出方向へ margin だけ押し出した点。線は必ずこのスタブを通って図形面に
	// 直交して出入りする。図形を持つ端点だけスタブを出す（free 端点はその場から結ぶ）。
	const sourceStub = source.box
		? stubPoint(source.point, source.direction, source.box, margin)
		: source.point;
	const targetStub = target.box
		? stubPoint(target.point, target.direction, target.box, margin)
		: target.point;

	// ── ステップ2: 候補生成 ──
	// スタブ間を結ぶ直交エルボ候補を列挙する。向かい合う配置では中点折れ（S 字）を
	// 優先するため、その軸（x/y）を facing として候補生成へ渡す。
	const facing = directionsFace(source.direction, target.direction);
	const candidates = elbowCandidates(
		sourceStub,
		targetStub,
		source.box,
		target.box,
		margin,
		facing.x,
		facing.y,
	);

	// ── ステップ3: 評価して最良を選ぶ ──
	// コストは compareCost の辞書式（貫通 → 美観）で比較する。
	let bestPath: Point[] | null = null;
	let bestCost: RouteCost | null = null;
	for (const { elbow, symmetric } of candidates) {
		// simplify を 2 回呼ぶのは入力が違うため:
		// - simplifiedElbow: スタブ脚を含まない（貫通判定はスタブ脚を除くため）。
		// - fullPath: スタブ脚込み（角数・長さは実際に描かれる線で測るため）。
		const simplifiedElbow = simplify(elbow);
		// 角数・長さは「実際に描かれるフルパス（スタブ脚込み）」で測る。
		// エルボ単体だと、スタブ脚と最初/最後の向きが噛み合わずに増える角を見落とす
		// （例: 右へ出た直後に下へ折れるエルボは、見かけ1角でもフルパスでは2角になる）。
		const fullPath = simplify([source.point, ...simplifiedElbow, target.point]);
		const turns = Math.max(fullPath.length - 2, 0);
		const cost: RouteCost = {
			// 図形貫通の判定はエルボ部分のみ（source→stub / stub→target の脚は必ず
			// 面から外へ出る正当な交差なので除く）。
			crossings: countBoxCrossings(simplifiedElbow, source.box, target.box),
			// 柔らかい美観: 曲がり数を重視（×weight）、同程度なら短く、向かい合いは
			// 対称(S字)を一段優先。逆走は角数に必ず現れるので別項は持たない。
			aesthetic:
				turns * TURN_WEIGHT +
				pathLength(fullPath) -
				(symmetric ? SYMMETRY_BONUS : 0),
		};
		// 厳密比較なので同コストのときは先に評価した候補を保持する。
		// 候補は x チャネル（水平始まり H→V→H）→ y チャネルの順に並ぶため、
		// 完全な同点では水平始まりが優先される（決定的だが任意）。
		if (!bestCost || compareCost(cost, bestCost) < 0) {
			bestCost = cost;
			bestPath = fullPath;
		}
	}

	// 候補が空（理論上起きないが防御的に）の場合は単純なスタブ直結を返す。
	return (
		bestPath ?? simplify([source.point, sourceStub, targetStub, target.point])
	);
};
