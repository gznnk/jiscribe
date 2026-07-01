import type { Point } from "@workspace/geometry";

import { directionsFace, elbowCandidates } from "./elbowCandidates";
import { calcRouteCost, compareCost, type RouteCost } from "./routeCost";
import { simplifyPath } from "./simplifyPath";
import { clampStubMargin, stubPoint } from "./stub";
import type {
	OrthogonalConnectorEndpoint,
	RouteOrthogonalConnectorOptions,
} from "./types";
import { DEFAULT_CONNECTOR_MARGIN } from "../../../../../constants/connectorRouting";

/**
 * 2 端点間を水平/垂直セグメントだけで結ぶ直交経路を生成する。
 *
 * アルゴリズム概要（各ステップは同フォルダのモジュールに分割）:
 * 1. `stubPoint`: 各端点を退出方向へ押し出した**スタブ**を作る（AABB 辺 + margin。
 *    回転図形でもバウンディングボックスの外へ確実に出る）。
 * 2. `elbowCandidates`: スタブ間を結ぶ**エルボ候補**を、折れ位置の「チャネル」（両スタブ端・
 *    中点・各 box の外周 ± margin）から列挙する。中点チャネルは S/Z 字、box 外周チャネルは
 *    図形の回り込みを表現する。
 * 3. `calcRouteCost` / `compareCost`: 各候補を**辞書式**で評価して最良を選ぶ:
 *    図形貫通 → 美観（曲がり数×weight + 長さ + 折り返し×penalty − 対称ボーナス）。
 *
 * 戻り値は端点を含むフルパス `[source.point, …, target.point]`（共線・重複は畳み済み）。
 * **両端の図形のみ**を回避対象とし、間にある他図形は考慮しない（v1）。
 *
 * 未対応 / 将来の拡張余地:
 * - **角丸 / 曲線レンダリング**（`pathType` の Rounded / Curve 相当）。本実装は角が直角のみ。
 *   角の描画スタイルは別機能として後回し。
 *
 * @param source - 始点の端点（座標・外向き方向・回避用 AABB）
 * @param target - 終点の端点（座標・外向き方向・回避用 AABB）
 * @param options - margin（スタブ長, px）などの調整オプション。省略時は DEFAULT_CONNECTOR_MARGIN
 * @returns 端点を含む直交フルパス `[source.point, …, target.point]`（共線・重複は畳み済み）
 */
export const routeOrthogonalConnector = (
	source: OrthogonalConnectorEndpoint,
	target: OrthogonalConnectorEndpoint,
	options: RouteOrthogonalConnectorOptions = {},
): Point[] => {
	const margin = options.margin ?? DEFAULT_CONNECTOR_MARGIN;

	// ── ステップ1: スタブ ──
	// 各端点を退出方向へ margin だけ押し出した点。線は必ずこのスタブを通って図形面に
	// 直交して出入りする。図形を持つ端点だけスタブを出す（free 端点はその場から結ぶ）。
	//
	// 近接して向かい合う配置では、フル margin のスタブが相手側を追い越して無駄な回り込みを
	// 招くため、相手端点までの前方距離に応じてスタブ長を縮める（clampStubMargin）。
	// チャネル算出（elbowCandidates）には縮めない margin を使い、回り込み経路の表現力は保つ。
	const sourceMargin = clampStubMargin(
		source.point,
		source.direction,
		target.point,
		margin,
	);
	const targetMargin = clampStubMargin(
		target.point,
		target.direction,
		source.point,
		margin,
	);
	const sourceStub = source.box
		? stubPoint(source.point, source.direction, source.box, sourceMargin)
		: source.point;
	const targetStub = target.box
		? stubPoint(target.point, target.direction, target.box, targetMargin)
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
		// simplifyPath を 2 回呼ぶのは入力が違うため:
		// - simplifiedElbow: スタブ脚を含まない（貫通判定はスタブ脚を除くため）。
		// - fullPath: スタブ脚込み（角数・長さは実際に描かれる線で測るため）。
		const simplifiedElbow = simplifyPath(elbow);
		const fullPath = simplifyPath([
			source.point,
			...simplifiedElbow,
			target.point,
		]);
		const cost = calcRouteCost(
			fullPath,
			simplifiedElbow,
			source.box,
			target.box,
			symmetric,
		);
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
		bestPath ??
		simplifyPath([source.point, sourceStub, targetStub, target.point])
	);
};
