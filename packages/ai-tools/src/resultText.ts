// ツール結果テキストの共通の書き方。doc への適用（canvasOps/）とマウント済み
// キャンバスへの適用（client/）が同じ形で数値を返すための置き場で、両方から
// 参照するため src 直下に置く（canvasOps/ は React にも DOM にも依存しないので、
// ここも依存しない）。
//
// AI は返ってきた数値をそのまま次の呼び出しに書き戻すので、桁と単位の揃え方が
// 結果の読みやすさをそのまま決める。

import type { Point, Rect } from "@jiscribe/geometry";

/** 結果文で id を指す書き方。複数なら読点で並べる */
export const quoteIds = (ids: readonly string[]): string =>
	ids.map((id) => `"${id}"`).join(", ");

/** 計測値の桁を落とす。AI が座標として書き戻せればよく、それ以上の精度は読みにくい */
export const formatNumber = (value: number): string =>
	String(Math.round(value * 10) / 10);

/** ワールド座標の点。単位は px で、書式は addObject の x / y と同じ並び */
export const formatPoint = ({ x, y }: Point): string =>
	`(${formatNumber(x)}, ${formatNumber(y)})`;

/** 左上と大きさ。矩形はすべてこの書き方で返す */
export const formatRect = ({ x, y, width, height }: Rect): string =>
	`${formatPoint({ x, y })} ${formatNumber(width)} x ${formatNumber(height)} px`;

/**
 * 矩形に右端・下端を添えた形。AI が「この隣に置く」を決めるには左上と大きさ
 * より端の座標が要るので、矩形を返す結果文ではこちらを使う。
 *
 * @param bounds - ワールド座標の矩形。負の幅・高さは想定しない
 */
export const describeRectEdges = (bounds: Rect): string =>
	`${formatRect(bounds)}, so the right edge is x ${formatNumber(bounds.x + bounds.width)} and the bottom edge y ${formatNumber(bounds.y + bounds.height)}`;
