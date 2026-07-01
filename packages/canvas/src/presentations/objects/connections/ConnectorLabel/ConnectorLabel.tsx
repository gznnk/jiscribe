import type { Point } from "@workspace/geometry";
import type React from "react";
import { memo } from "react";

import { LabelBox } from "./ConnectorLabelStyled";
import {
	calcConnectorLabelBox,
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
	if (text === "") {
		return null;
	}

	const fontFamily = CONNECTOR_LABEL_DEFAULTS.fontFamily;
	// Resolve auto (theme-following) to the theme foreground (ink) (issue #38).
	const color = resolveAutoColor(fontColor, "ink");
	const background = resolveLabelFill(fill);
	const borderColor = resolveAutoColor(stroke, "ink");

	const { width, height } = calcConnectorLabelBox(
		text,
		{ fontSize, fontFamily, fontWeight },
		strokeWidth,
	);

	// Lay out horizontally centered on the anchor (no rotation).
	return (
		<foreignObject
			x={anchor.x - width / 2}
			y={anchor.y - height / 2}
			width={width}
			height={height}
			// Treat as connector so double-clicking the on-line label can start editing.
			data-kind="connector"
			data-id={id}
			pointerEvents={disablePointerEvents ? "none" : "auto"}
		>
			<LabelBox
				color={color}
				fontSize={fontSize}
				fontFamily={fontFamily}
				fontWeight={fontWeight}
				background={background}
				borderWidth={strokeWidth}
				borderColor={borderColor}
				borderStyle={strokeDashType}
			>
				{text}
			</LabelBox>
		</foreignObject>
	);
};

/**
 * Renders a connector's label as a horizontally centered box at the given
 * anchor on the path. Returns null for empty text.
 */
export const ConnectorLabel = memo(ConnectorLabelComponent);
