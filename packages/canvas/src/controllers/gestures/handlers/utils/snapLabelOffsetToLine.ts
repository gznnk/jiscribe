import type { ConnectorLabelPlacement } from "../../../../presentations/layers/content/utils/label/calcConnectorLabelPlacement";

/**
 * Pulls a label placed just beside the line back onto it, so the common
 * "label sits on the line" placement does not need pixel-perfect aiming.
 * Only `offset` snaps: `position` is a free ratio with no distinguished value.
 *
 * @param placement Raw placement from calcConnectorLabelPlacement
 * @param thresholdSvg Snap threshold in SVG units, chosen by the caller
 *   (SNAP_THRESHOLD_PX / zoom for a drag, widened to the hit band at creation);
 *   an offset exactly at the threshold is left alone, as in findSnap
 * @returns The placement with `offset` replaced by 0, or `placement` itself when
 *   it is outside the threshold
 */
export const snapLabelOffsetToLine = (
	placement: ConnectorLabelPlacement,
	thresholdSvg: number,
): ConnectorLabelPlacement =>
	Math.abs(placement.offset) < thresholdSvg
		? { ...placement, offset: 0 }
		: placement;
