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
 * Pure function that computes a Viewport fitting all content (every object
 * except groups).
 *
 * Shared by `ZoomToFitCommand` (Ctrl+0) and the read-only `CanvasThumbnail` so
 * the fit behavior does not drift. Returns `null` when there is no extent to
 * fit (no objects / all degenerate).
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

		// Connector: points holds only intermediate waypoints, so compute the
		// bounds from the dynamically resolved endpoints plus the waypoints
		// (free endpoints can only be captured here).
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
	// Zero size on both axes (single-point Poly, degenerate Frame, etc.) cannot be fit -> null.
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
