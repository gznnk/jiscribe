import {
	CONNECTOR_LABEL_DEFAULTS,
	type ConnectorLabel,
} from "@jiscribe/doc/model/objects/connector/ConnectorDoc";
import type { Point } from "@jiscribe/geometry";
import { memo, useMemo } from "react";

import { theme } from "../../../../foundation/theme/themeTokens";
import { calcConnectorLabelAnchor } from "../../../../rendering/objects/connector/geometry/label/calcConnectorLabelAnchor";
import {
	calcConnectorLabelRect,
	resolveConnectorLabelBox,
} from "../../../../rendering/objects/connector/geometry/label/connectorLabelLayout";
import { useFontsLoadedNonceContext } from "../../../../rendering/objects/FontsLoadedNonceContext";
import { useIsTextLegible } from "../../../../rendering/objects/useIsTextLegible";
import {
	PART_SELECTION_FILL,
	SELECTION_OUTLINE_WIDTH,
} from "../utils/selectionOutline";

type ConnectorLabelPartOutlineProps = {
	/** The connector's resolved path, the one its label is drawn along (world coordinates). */
	points: readonly Point[];
	/** The picked label; one with empty text draws no box and so no outline. */
	label: ConnectorLabel;
};

/**
 * Outlines a connector's picked label (the `connectorLabel` part kind), drawn
 * the way ObjectPartOutline draws a part inside a shape, over the label's box
 * (calcConnectorLabelRect). It is hidden while the label itself is, too small
 * to read at the canvas's zoom.
 */
const ConnectorLabelPartOutlineComponent: React.FC<
	ConnectorLabelPartOutlineProps
> = ({ points, label }) => {
	// An invalidation signal, as in ConnectorLabel: a face arriving later
	// re-measures the box the label is drawn in, and the outline goes with it.
	const fontsLoadedNonce = useFontsLoadedNonceContext();
	// Keyed on what sizes the box, so a drag (the placement changes every frame)
	// skips the per-line measureText.
	const labelBox = useMemo(
		() => resolveConnectorLabelBox(label),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[
			label.text,
			label.fontFamily,
			label.fontSize,
			label.fontWeight,
			label.strokeWidth,
			fontsLoadedNonce,
		],
	);
	const isLegible = useIsTextLegible(
		label.fontSize ?? CONNECTOR_LABEL_DEFAULTS.fontSize,
	);

	const anchor = calcConnectorLabelAnchor(points, label.position, label.offset);
	if (label.text === "" || !isLegible || anchor === null) {
		return null;
	}

	const { x, y, width, height } = calcConnectorLabelRect(anchor, labelBox);
	return (
		<rect
			x={x}
			y={y}
			width={width}
			height={height}
			// Tells a part's box from an object outline, which is drawn the same way.
			data-testid="part-outline"
			strokeWidth={SELECTION_OUTLINE_WIDTH}
			pointerEvents="none"
			// The color may hold var(--jiscribe-*), so it is applied via style.
			style={{ fill: PART_SELECTION_FILL, stroke: theme.handleAccent }}
		/>
	);
};

export const ConnectorLabelPartOutline = memo(
	ConnectorLabelPartOutlineComponent,
);
