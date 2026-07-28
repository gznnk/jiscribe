import { roundToDecimal } from "@workspace/geometry";

import { PRECISION } from "../../constants/precision";
import type { ConnectorLabelPlacement } from "../../presentations/layers/content/utils/label/calcConnectorLabelPlacement";
import type { ConnectorLabel } from "../../schemas/objects/connections/connector/ConnectorDoc";

/** Decimal places for label.position (a 0..1 ratio; 4 ≒ sub-pixel on paths up to ~10k px). */
const LABEL_POSITION_PRECISION = 4;

/** Position an absent `label.position` means, mirroring calcConnectorLabelAnchor. */
export const DEFAULT_LABEL_POSITION = 0.5;

/** Offset an absent `label.offset` means, mirroring calcConnectorLabelAnchor. */
export const DEFAULT_LABEL_OFFSET = 0;

/**
 * Placement of a label nobody aimed: the path midpoint, on the line. Passing it
 * to {@link applyLabelPlacement} strips `position` / `offset` (both equal their
 * defaults), which is how a creation path with no pointer point — the Enter
 * shortcut — discards what a deleted label left on the connector.
 */
export const DEFAULT_LABEL_PLACEMENT: ConnectorLabelPlacement = {
	position: DEFAULT_LABEL_POSITION,
	offset: DEFAULT_LABEL_OFFSET,
};

/**
 * Returns the label with its placement replaced by a rounded, document-safe
 * `placement`.
 *
 * `position` is clamped to [0, 1] because the state validator rejects anything
 * outside it. A key that lands back on its default is dropped rather than
 * written, so returning the label to the midpoint restores the original
 * document shape (`-0 === 0`, so a negative zero offset is dropped too).
 * Style keys are carried over untouched.
 *
 * @param label Label to rebase; only `position` / `offset` are replaced
 * @param placement Raw placement from calcConnectorLabelPlacement (unrounded,
 *   `position` possibly outside [0, 1])
 */
export const applyLabelPlacement = (
	label: ConnectorLabel,
	placement: ConnectorLabelPlacement,
): ConnectorLabel => {
	const position = roundToDecimal(
		Math.min(1, Math.max(0, placement.position)),
		LABEL_POSITION_PRECISION,
	);
	const offset = roundToDecimal(placement.offset, PRECISION.COORDINATE);

	const { position: _prevPosition, offset: _prevOffset, ...rest } = label;
	return {
		...rest,
		...(position === DEFAULT_LABEL_POSITION ? {} : { position }),
		...(offset === DEFAULT_LABEL_OFFSET ? {} : { offset }),
	};
};
