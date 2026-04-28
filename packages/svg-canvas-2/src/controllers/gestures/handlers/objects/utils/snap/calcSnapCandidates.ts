import { calcKeyPointsBoundingBox } from "@workspace/geometry";

import type { SnapCandidate, SnapCandidates } from "../../../../../../states/canvas/SnapTypes";
import { hasFrameKeyPoints } from "../../../../../../states/objects/base/FrameWithKeyPoints";
import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";

/**
 * 全 Frame オブジェクトからスナップ候補を生成する。
 * dragStart 時に eventStartState（keyPoints キャッシュ済み）を渡して呼ぶこと。
 * 除外（選択中・子孫）は呼び出し側で filteredCandidates としてフィルタすること。
 *
 * @param objects - keyPoints がキャッシュされたオブジェクトマップ
 */
export const calcSnapCandidates = (
	objects: Record<string, ObjectState>,
): SnapCandidates => {
	const xCandidates: SnapCandidate[] = [];
	const yCandidates: SnapCandidate[] = [];

	for (const [id, obj] of Object.entries(objects)) {
		if (obj.type === "group") continue;
		if (!hasFrameKeyPoints(obj)) continue;

		const bbox = calcKeyPointsBoundingBox(obj.keyPoints);

		const { left, right, top, bottom } = bbox;

		// x 候補: left / right エッジ
		// perpendicularMin/Max は Y 方向の範囲（ガイド縦線の延伸用）
		xCandidates.push(
			{ objectId: id, coordinate: left, edge: "left", perpendicularMin: top, perpendicularMax: bottom },
			{ objectId: id, coordinate: right, edge: "right", perpendicularMin: top, perpendicularMax: bottom },
		);

		// y 候補: top / bottom エッジ
		// perpendicularMin/Max は X 方向の範囲（ガイド横線の延伸用）
		yCandidates.push(
			{ objectId: id, coordinate: top, edge: "top", perpendicularMin: left, perpendicularMax: right },
			{ objectId: id, coordinate: bottom, edge: "bottom", perpendicularMin: left, perpendicularMax: right },
		);
	}

	xCandidates.sort((a, b) => a.coordinate - b.coordinate);
	yCandidates.sort((a, b) => a.coordinate - b.coordinate);

	return { x: xCandidates, y: yCandidates };
};
