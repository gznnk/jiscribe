import {
	calcManhattanDistance,
	isLineIntersectingBox,
	type BoxFeatures,
	type Point,
} from "@workspace/geometry";

/**
 * 軸並行セグメントが box の内部を貫通するか。
 *
 * 直交ルーティングのエルボは常に水平/垂直セグメントなので、汎用の
 * `isLineIntersectingBox`（辺タプルと内部ベクトルを毎回確保する）を呼ばずに、
 * アロケーション無しで判定する。ホットパス（ドラッグ追従の経路再計算）で効く。
 *
 * セマンティクスは `isLineIntersectingBox`（辺との真の交差・接触は除外）と一致させる:
 * 水平セグメントは「y が上下辺の内側」かつ「x 範囲が左 or 右辺を跨ぐ」とき貫通。
 * 境界に乗るだけ（接触）は厳密不等号で除外する。非軸並行が来た場合は汎用版へ委譲する。
 */
const segmentCrossesBox = (p1: Point, p2: Point, box: BoxFeatures): boolean => {
	if (p1.y === p2.y) {
		const y = p1.y;
		if (y <= box.top || y >= box.bottom) {
			return false;
		}
		const xMin = Math.min(p1.x, p2.x);
		const xMax = Math.max(p1.x, p2.x);
		return (
			(xMin < box.left && box.left < xMax) ||
			(xMin < box.right && box.right < xMax)
		);
	}
	if (p1.x === p2.x) {
		const x = p1.x;
		if (x <= box.left || x >= box.right) {
			return false;
		}
		const yMin = Math.min(p1.y, p2.y);
		const yMax = Math.max(p1.y, p2.y);
		return (
			(yMin < box.top && box.top < yMax) ||
			(yMin < box.bottom && box.bottom < yMax)
		);
	}
	// 直交ルーティングでは起きないが、防御的に汎用判定へフォールバック。
	return isLineIntersectingBox(p1, p2, box);
};

/** フルパスの総延長（マンハッタン距離）。 */
export const pathLength = (points: Point[]): number => {
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

/**
 * フルパス中の「折り返し（逆走）」角の数を数える。
 *
 * 同一軸上で進行方向が反転する中間点（a→b と b→c が共線かつ逆向き）を折り返しとみなす。
 * スタブを出した直後に同じ線分を逆走して戻るスパイク（図形の縁から線が生えて見える
 * 不自然な経路）がこれに当たる。`simplifyPath` は退出方向を保つためこの逆走点を温存するので、
 * コスト評価側で明示的に数えてペナルティをかける。
 */
export const countReversals = (points: Point[]): number => {
	let reversals = 0;
	for (let i = 1; i < points.length - 1; i++) {
		const a = points[i - 1];
		const b = points[i];
		const c = points[i + 1];
		const reverseH =
			a.y === b.y && b.y === c.y && (b.x - a.x) * (c.x - b.x) < 0;
		const reverseV =
			a.x === b.x && b.x === c.x && (b.y - a.y) * (c.y - b.y) < 0;
		if (reverseH || reverseV) {
			reversals++;
		}
	}
	return reversals;
};

/** エルボ（スタブ間）が図形を貫通する回数。スタブ脚は含めない。 */
export const countBoxCrossings = (
	elbow: Point[],
	sourceBox: BoxFeatures | null,
	targetBox: BoxFeatures | null,
): number => {
	let crossings = 0;
	for (let i = 0; i < elbow.length - 1; i++) {
		const p1 = elbow[i];
		const p2 = elbow[i + 1];
		if (sourceBox && segmentCrossesBox(p1, p2, sourceBox)) {
			crossings++;
		}
		if (targetBox && segmentCrossesBox(p1, p2, targetBox)) {
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
// 折り返し（スタブ直後に同じ線分を逆走するスパイク）は強く避ける。1 折り返し =
// 10 曲がり相当。回り込み（曲がり数増）より常に不利にし、出口方向の裏側にある端点へは
// 一度スタブ分まっすぐ出てから回り込ませる。回り込みようがない配置では全候補が等しく
// 加点されるため、相対比較に影響せず自然にフォールバックする（貫通とは独立＝ソフト制約）。
const REVERSAL_PENALTY = 10_000;

/**
 * ルート評価。図形貫通は**ハード制約**として最優先で比較し、曲がり数・長さ・対称性は
 * **柔らかい美観**として 1 つの重み付き和にまとめる（ハードは辞書式・ソフトは加点）。
 *
 * 逆走（スタブの押し出し方向に逆らって同じ線分を戻る折り返し）は `REVERSAL_PENALTY` で
 * 明示的に強く減点する。角数はフルパス（スタブ脚込み）で測るため逆走も 1 角として現れるが、
 * それだけだと回り込み（角数増）の方が高コストになりスパイクが選ばれてしまうため、
 * 専用ペナルティで回り込みを優先させる。回り込みようがない配置では全候補が等しく加点され、
 * 相対比較に影響しないので破綻しない。
 */
export type RouteCost = {
	/** 図形を貫通する回数（最優先で 0 にしたい）。 */
	crossings: number;
	/** 曲がり数×weight + 経路長 + 折り返し×penalty − 対称ボーナス（小さいほど良い）。 */
	aesthetic: number;
};

/**
 * 1 候補のコストを算出する。
 *
 * - 貫通判定は**エルボ部分のみ**（source→stub / stub→target の脚は必ず面から外へ出る
 *   正当な交差なので除く）。`simplifiedElbow` を渡す。
 * - 角数・長さは「実際に描かれるフルパス（スタブ脚込み）」で測る。エルボ単体だと、
 *   スタブ脚と最初/最後の向きが噛み合わずに増える角を見落とす（例: 右へ出た直後に下へ
 *   折れるエルボは見かけ1角でもフルパスでは2角）。`fullPath` を渡す。
 */
export const calcRouteCost = (
	fullPath: Point[],
	simplifiedElbow: Point[],
	sourceBox: BoxFeatures | null,
	targetBox: BoxFeatures | null,
	symmetric: boolean,
): RouteCost => {
	const turns = Math.max(fullPath.length - 2, 0);
	return {
		crossings: countBoxCrossings(simplifiedElbow, sourceBox, targetBox),
		// 柔らかい美観: 曲がり数を重視（×weight）、同程度なら短く、向かい合いは
		// 対称(S字)を一段優先。スタブ直後の逆走スパイクは別項で強く減点し、回り込みを優先。
		aesthetic:
			turns * TURN_WEIGHT +
			pathLength(fullPath) +
			countReversals(fullPath) * REVERSAL_PENALTY -
			(symmetric ? SYMMETRY_BONUS : 0),
	};
};

/** 負: a が良い / 正: b が良い。crossings → aesthetic の順（辞書式）。 */
export const compareCost = (a: RouteCost, b: RouteCost): number =>
	a.crossings - b.crossings || a.aesthetic - b.aesthetic;
