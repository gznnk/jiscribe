import {
	calcBoundingBox,
	calcPolyBoundingBox,
	isTransformedFrame,
	roundToDecimal,
} from "@workspace/geometry";

import { calcConnectorBoundingBox } from "./calcConnectorBoundingBox";
import { PRECISION } from "../../constants/precision";
import { ZOOM } from "../../constants/zoom";
import { isPoly } from "../../schemas/objects/types/Poly";
import type { Viewport } from "../../states/canvas/Viewport";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../states/objects/connections/connector/ConnectorState";

type FitOptions = {
	/** Viewport width in screen px. */
	width: number;
	/** Viewport height in screen px. */
	height: number;
	/** Empty margin (screen px) kept around the content on every side. */
	padding?: number;
};

/**
 * 全コンテンツ（group を除く全オブジェクト）を収める Viewport を算出する純関数。
 *
 * `ZoomToFitCommand`（Ctrl+0）と読み取り専用の `CanvasThumbnail` が共有し、
 * フィット挙動がドリフトしないようにする。フィットできる広がりが無い
 * （オブジェクト無し／全て退化）場合は `null` を返す。
 */
export const calcFitViewport = (
	objects: Record<string, ObjectState>,
	{ width, height, padding = 48 }: FitOptions,
): Viewport | null => {
	let minX = Infinity,
		maxX = -Infinity,
		minY = Infinity,
		maxY = -Infinity;

	for (const obj of Object.values(objects)) {
		if (!obj || obj.type === "group") {
			continue;
		}

		// コネクター: points は中間経由点のみのため、動的解決した端点 + 経由点で
		// バウンドを計算する（free 端点はここでしか拾えない）。
		if (obj.type === "connector") {
			const bbox = calcConnectorBoundingBox(obj as ConnectorState, objects);
			if (bbox) {
				minX = Math.min(minX, bbox.left);
				maxX = Math.max(maxX, bbox.right);
				minY = Math.min(minY, bbox.top);
				maxY = Math.max(maxY, bbox.bottom);
			}
			continue;
		}

		if (isTransformedFrame(obj)) {
			const bbox = calcBoundingBox(obj);
			minX = Math.min(minX, bbox.left);
			maxX = Math.max(maxX, bbox.right);
			minY = Math.min(minY, bbox.top);
			maxY = Math.max(maxY, bbox.bottom);
		} else if (isPoly(obj)) {
			const bbox = calcPolyBoundingBox(obj.points);
			if (bbox) {
				minX = Math.min(minX, bbox.left);
				maxX = Math.max(maxX, bbox.right);
				minY = Math.min(minY, bbox.top);
				maxY = Math.max(maxY, bbox.bottom);
			}
		}
	}

	if (!isFinite(minX)) {
		return null;
	}

	const contentWidth = maxX - minX;
	const contentHeight = maxY - minY;
	const contentCx = (minX + maxX) / 2;
	const contentCy = (minY + maxY) / 2;

	const availableW = width - 2 * padding;
	const availableH = height - 2 * padding;

	const zoomCandidates = [
		contentWidth > 0 ? availableW / contentWidth : null,
		contentHeight > 0 ? availableH / contentHeight : null,
	].filter((v): v is number => v !== null);
	// 両軸ともサイズ 0（単一点 Poly や退化 Frame など）はフィット不能 → null。
	if (zoomCandidates.length === 0) {
		return null;
	}

	const zoom = Math.max(
		ZOOM.MIN,
		Math.min(ZOOM.MAX, Math.min(...zoomCandidates)),
	);

	return {
		width,
		height,
		zoom: roundToDecimal(zoom, PRECISION.ZOOM),
		minX: roundToDecimal(contentCx - width / (2 * zoom), PRECISION.COORDINATE),
		minY: roundToDecimal(contentCy - height / (2 * zoom), PRECISION.COORDINATE),
	};
};
