import { calcKeyPointsBoundingBox } from "@workspace/geometry";
import type { FrameKeyPoints } from "@workspace/geometry";

import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
import type { SnapCandidate, SnapCandidates } from "../../../../../CanvasTypes";

/**
 * 全 Frame オブジェクトからスナップ候補を生成する。
 * dragStart 時に keyPointsCache（事前計算済み）を渡して呼ぶこと。
 * 除外（選択中・子孫）は呼び出し側で filteredCandidates としてフィルタすること。
 *
 * @param objects - オブジェクトマップ
 * @param keyPointsCache - 事前計算済みの keyPoints キャッシュ（EventStartSnapshot から渡す）
 */
export const calcSnapCandidates = (
	objects: Record<string, ObjectState>,
	keyPointsCache: Record<string, FrameKeyPoints>,
): SnapCandidates => {
	const xCandidates: SnapCandidate[] = [];
	const yCandidates: SnapCandidate[] = [];

	for (const [id, obj] of Object.entries(objects)) {
		if (obj.type === "group") {
			continue;
		}
		const keyPoints = keyPointsCache[id];
		if (!keyPoints) {
			continue;
		}

		const bbox = calcKeyPointsBoundingBox(keyPoints);

		const { left, right, top, bottom } = bbox;

		// x 候補: left / right エッジ
		// perpendicularMin/Max は Y 方向の範囲（ガイド縦線の延伸用）
		xCandidates.push(
			{
				objectId: id,
				coordinate: left,
				edge: "left",
				perpendicularMin: top,
				perpendicularMax: bottom,
			},
			{
				objectId: id,
				coordinate: right,
				edge: "right",
				perpendicularMin: top,
				perpendicularMax: bottom,
			},
		);

		// y 候補: top / bottom エッジ
		// perpendicularMin/Max は X 方向の範囲（ガイド横線の延伸用）
		yCandidates.push(
			{
				objectId: id,
				coordinate: top,
				edge: "top",
				perpendicularMin: left,
				perpendicularMax: right,
			},
			{
				objectId: id,
				coordinate: bottom,
				edge: "bottom",
				perpendicularMin: left,
				perpendicularMax: right,
			},
		);
	}

	xCandidates.sort((a, b) => a.coordinate - b.coordinate);
	yCandidates.sort((a, b) => a.coordinate - b.coordinate);

	return { x: xCandidates, y: yCandidates };
};
