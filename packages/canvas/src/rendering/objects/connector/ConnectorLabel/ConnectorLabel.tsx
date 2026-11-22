import { CONNECTOR_LABEL_DEFAULTS } from "@jiscribe/doc/model/objects/connector/ConnectorDoc";
import type { Point } from "@jiscribe/geometry";
import type React from "react";
import { memo, useMemo } from "react";

import { LABEL_BOX_CORNER_RADIUS, LabelBox } from "./ConnectorLabelStyled";
import { LabelBackdropLayers } from "../../base/LabelBackdropLayers";
import { useDocumentSurface } from "../../DocumentSurfaceContext";
import { useFontsLoadedNonceContext } from "../../FontsLoadedNonceContext";
import { useIsTextLegible } from "../../useIsTextLegible";
import { useLabelBackdropLayers } from "../../useLabelBackdropLayers";
import { resolveAutoColor } from "../../utils/resolveAutoColor";
import { resolveLabelFill } from "../../utils/resolveLabelFill";
import {
	calcConnectorLabelRect,
	resolveConnectorLabelBox,
} from "../geometry/label/connectorLabelLayout";

type ConnectorLabelProps = {
	/** Parent connector id (placed in a data attribute so a hit can start editing). */
	id: string;
	/** Label anchor (world coordinates on the path). */
	anchor: Point;
	text: string;
	fontColor?: string;
	fontFamily?: string;
	fontSize?: number;
	fontWeight?: string;
	/**
	 * Background color. Omitted or auto knocks out the line in the page's color
	 * (resolveLabelFill), with the backdrops the label lies on painted over it
	 * (useLabelBackdropLayers, looked up under `id`).
	 */
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
	fontFamily = CONNECTOR_LABEL_DEFAULTS.fontFamily,
	fontSize = CONNECTOR_LABEL_DEFAULTS.fontSize,
	fontWeight = CONNECTOR_LABEL_DEFAULTS.fontWeight,
	fill,
	stroke,
	strokeWidth = 0,
	strokeDashType = "solid",
	disablePointerEvents = false,
}) => {
	// An invalidation signal, not an argument: the box was measured against
	// whatever face was loaded at the time, so a later arrival has to re-run this
	// even though nothing the callback reads has changed.
	const fontsLoadedNonce = useFontsLoadedNonceContext();
	const documentSurface = useDocumentSurface();
	// Memoized so dragging the connector (anchor changes every frame, text does not)
	// skips the per-line measureText.
	const labelBox = useMemo(
		() =>
			resolveConnectorLabelBox({
				text,
				fontFamily,
				fontSize,
				fontWeight,
				strokeWidth,
			}),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[text, fontFamily, fontSize, fontWeight, strokeWidth, fontsLoadedNonce],
	);
	const box = useMemo(
		() => calcConnectorLabelRect(anchor, labelBox),
		[anchor, labelBox],
	);
	const layers = useLabelBackdropLayers(id);

	// A label is one plain string, so its own size is the largest it draws.
	const isLegible = useIsTextLegible(fontSize);

	if (text === "") {
		return null;
	}

	// Resolve auto (theme-following) to the theme foreground (ink) (issue #38).
	const color = resolveAutoColor(fontColor, "ink");
	const knockout = resolveLabelFill(fill, documentSurface);
	const borderColor = resolveAutoColor(stroke, "ink");
	// On a backdrop, the knockout and the frames' fills are drawn in SVG under the
	// box, and the box itself lets them show through.
	const hasLayers = layers.length > 0;
	const display = isLegible ? undefined : "none";

	return (
		<>
			{hasLayers && (
				<LabelBackdropLayers
					box={box}
					layers={layers}
					cornerRadius={LABEL_BOX_CORNER_RADIUS}
					isShown={isLegible}
					knockout={knockout}
				/>
			)}
			<foreignObject
				x={box.x}
				y={box.y}
				width={box.width}
				height={box.height}
				// Treat as connector so a hit resolves to the parent connector.
				// data-action marks this as the label box: with a committed label, only a
				// double click here (not on the bare line) starts editing, and a drag
				// here moves the label along the path.
				data-kind="connector"
				data-id={id}
				data-action="label"
				pointerEvents={disablePointerEvents ? "none" : "auto"}
				display={display}
			>
				<LabelBox
					style={{
						color,
						fontSize,
						fontFamily,
						fontWeight,
						background: hasLayers ? "transparent" : knockout,
						border:
							strokeWidth > 0
								? `${strokeWidth}px ${strokeDashType} ${borderColor}`
								: "none",
					}}
				>
					{text}
				</LabelBox>
			</foreignObject>
		</>
	);
};

/**
 * Renders a connector's label as a horizontally centered box at the given
 * anchor on the path. Returns null for empty text, and hides the box (kept
 * mounted) while it is too small to read at the canvas's zoom (useIsTextLegible).
 * An `"auto"` label lying on a frame's backdrop is painted under the box, in
 * SVG ahead of the foreignObject: the page's color, then the frames' fills
 * (LabelBackdropLayers), the box's own background left transparent.
 *
 * The DOM shape is load-bearing: image export reads the box style off the
 * single child of the foreignObject (see connectorLabelToSvgGroup), and the
 * gesture layer resolves hits through the data attributes above.
 */
export const ConnectorLabel = memo(ConnectorLabelComponent);
