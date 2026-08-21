import type { Point } from "@jiscribe/geometry";
import type React from "react";
import { memo, useMemo } from "react";

import { LabelBox } from "./ConnectorLabelStyled";
import {
	resolveConnectorLabelBox,
	CONNECTOR_LABEL_DEFAULTS,
} from "./utils/connectorLabelLayout";
import { resolveLabelFill } from "./utils/resolveLabelFill";
import { resolveAutoColor } from "../../utils/resolveAutoColor";

type ConnectorLabelProps = {
	/** Parent connector id (placed in a data attribute so a hit can start editing). */
	id: string;
	/** Label anchor (world coordinates on the path). */
	anchor: Point;
	text: string;
	fontColor?: string;
	fontSize?: number;
	fontWeight?: string;
	/** Background color (omitted/auto uses the canvas background = knockout). */
	fill?: string;
	/** Border color. */
	stroke?: string;
	/** Border width (omitted/0 means no border). */
	strokeWidth?: number;
	/** Border style (solid / dashed / dotted). Defaults to solid when omitted. */
	strokeDashType?: string;
	disablePointerEvents?: boolean;
};

const ConnectorLabelComponent: React.FC<ConnectorLabelProps> = ({
	id,
	anchor,
	text,
	fontColor,
	fontSize = CONNECTOR_LABEL_DEFAULTS.fontSize,
	fontWeight = CONNECTOR_LABEL_DEFAULTS.fontWeight,
	fill,
	stroke,
	strokeWidth = 0,
	strokeDashType = "solid",
	disablePointerEvents = false,
}) => {
	// Memoized so dragging the connector (anchor changes every frame, text does not)
	// skips the per-line measureText.
	const { width, height } = useMemo(
		() => resolveConnectorLabelBox({ text, fontSize, fontWeight, strokeWidth }),
		[text, fontSize, fontWeight, strokeWidth],
	);

	if (text === "") {
		return null;
	}

	// Resolve auto (theme-following) to the theme foreground (ink) (issue #38).
	const color = resolveAutoColor(fontColor, "ink");
	const background = resolveLabelFill(fill);
	const borderColor = resolveAutoColor(stroke, "ink");

	// Lay out horizontally centered on the anchor (no rotation).
	return (
		<foreignObject
			x={anchor.x - width / 2}
			y={anchor.y - height / 2}
			width={width}
			height={height}
			// Treat as connector so a hit resolves to the parent connector.
			// data-part marks this as the label box: with a committed label, only a
			// double click here (not on the bare line) starts editing, and a drag
			// here moves the label along the path.
			data-kind="connector"
			data-id={id}
			data-part="label"
			pointerEvents={disablePointerEvents ? "none" : "auto"}
		>
			<LabelBox
				style={{
					color,
					fontSize,
					fontFamily: CONNECTOR_LABEL_DEFAULTS.fontFamily,
					fontWeight,
					background,
					border:
						strokeWidth > 0
							? `${strokeWidth}px ${strokeDashType} ${borderColor}`
							: "none",
				}}
			>
				{text}
			</LabelBox>
		</foreignObject>
	);
};

/**
 * Renders a connector's label as a horizontally centered box at the given
 * anchor on the path. Returns null for empty text.
 *
 * The DOM shape is load-bearing: image export reads the box style off the
 * single child of the foreignObject (see connectorLabelToSvgGroup), and the
 * gesture layer resolves hits through the data attributes above.
 */
export const ConnectorLabel = memo(ConnectorLabelComponent);
