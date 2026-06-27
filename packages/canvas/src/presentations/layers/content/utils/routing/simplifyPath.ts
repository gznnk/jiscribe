import type { Point } from "@workspace/geometry";

/**
 * 重複点と「通過するだけの」共線中間点を畳む。
 * 折り返し（逆走）する点は畳まない——スタブの押し出し方向を保つため、
 * 中間点が両隣の間（単調）にあるときだけ除去する。
 *
 * @param points - 直交パスの点列（端点を含む）
 * @returns 重複点と通過点を畳んだ点列（端点と逆走点は保持）
 */
export const simplifyPath = (points: Point[]): Point[] => {
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
