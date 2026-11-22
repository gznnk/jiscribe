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
import { SELECTION_OUTLINE_WIDTH } from "../utils/selectionOutline";

type ConnectorLabelPartOutlineProps = {
	/** The connector's resolved path, the one its label is drawn along (world coordinates). */
	points: readonly Point[];
	/**
	 * The picked label; while it is open in the editor, the draft's text at the
	 * placement the editor sits at. Outside the editor one with empty text draws
	 * no box and so no outline.
	 */
	label: ConnectorLabel;
	/**
	 * Whether the label is open in the editor: the outline then follows the
	 * editor's box, drawn for an empty draft (the minimum box) and at any zoom,
	 * as the editor is.
	 */
	isTextEditing: boolean;
};

/**
 * Outlines a connector's picked label (the `connectorLabel` part kind), a
 * stroke lying just outside the label's box (calcConnectorLabelRect) with
 * nothing inside, so it reads the same around the label and around its
 * editor. Outside the editor it is hidden while the label itself is, too
 * small to read at the canvas's zoom.
 */
const ConnectorLabelPartOutlineComponent: React.FC<
	ConnectorLabelPartOutlineProps
> = ({ points, label, isTextEditing }) => {
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
	if (
		anchor === null ||
		(!isTextEditing && (label.text === "" || !isLegible))
	) {
		return null;
	}

	const { x, y, width, height } = calcConnectorLabelRect(anchor, labelBox);
	// Moved out by half the stroke so the whole line lies outside the box: the
	// label's editor is an opaque HTML box over this layer, and would cover the
	// inner half of a line centered on the edge.
	const outset = SELECTION_OUTLINE_WIDTH / 2;
	return (
		<rect
			x={x - outset}
			y={y - outset}
			width={width + 2 * outset}
			height={height + 2 * outset}
			// Tells a part's box from an object outline, which is drawn the same way.
			data-testid="part-outline"
			strokeWidth={SELECTION_OUTLINE_WIDTH}
			pointerEvents="none"
			// The color may hold var(--jiscribe-*), so it is applied via style.
			style={{ fill: "none", stroke: theme.handleAccent }}
		/>
	);
};

export const ConnectorLabelPartOutline = memo(
	ConnectorLabelPartOutlineComponent,
);
