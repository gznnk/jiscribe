import {
	calcAffineTransformedPoint,
	degreesToRadians,
} from "@workspace/geometry";
import { memo } from "react";

import { theme } from "../../../../constants/theme";
import { calcContainerHeaderHeight } from "../../../../presentations/objects/containers/Container";
import type { ContainerState } from "../../../../states/objects/containers/container/ContainerState";
import { useCanvasTheme } from "../../../../theme/CanvasThemeContext";
import type { SelectionControlProps } from "../../../registry/SelectionControlTypes";
import { getResizeCursorForRotation } from "../../utils/getResizeCursorForRotation";

/** Pill dimensions in screen pixels — distinct from the circular resize anchors. */
const PILL_WIDTH = 18;
const PILL_HEIGHT = 7;

/**
 * Handle for dragging the container's header divider to change headerHeight.
 * Rendered as a horizontal pill at the divider midpoint.
 *
 * data-kind="control" + data-id=<objectId> + data-part={part}
 * (part comes from HeaderHeightControlHandler via SelectionControlsLayer).
 */
const ContainerHeaderHeightControlComponent: React.FC<
	SelectionControlProps<ContainerState>
> = ({ object, zoom, part }) => {
	const { handleDimensions } = useCanvasTheme();
	const { id, cx, cy, height, rotation, scaleX, scaleY } = object;

	const headerHeight = calcContainerHeaderHeight(object);
	const radians = degreesToRadians(rotation);
	// Divider midpoint (local: x=0, y=header bottom edge) in world coordinates
	const handlePoint = calcAffineTransformedPoint(
		0,
		-height / 2 + headerHeight,
		scaleX,
		scaleY,
		radians,
		cx,
		cy,
	);

	const pillWidth = PILL_WIDTH / zoom;
	const pillHeight = PILL_HEIGHT / zoom;
	const adjustedStrokeWidth = handleDimensions.anchorStrokeWidth / zoom;

	return (
		<g
			transform={`translate(${handlePoint.x} ${handlePoint.y}) rotate(${rotation})`}
		>
			<rect
				x={-pillWidth / 2}
				y={-pillHeight / 2}
				width={pillWidth}
				height={pillHeight}
				rx={pillHeight / 2}
				strokeWidth={adjustedStrokeWidth}
				data-kind="control"
				data-id={id}
				data-part={part}
				style={{
					fill: theme.handleFill,
					stroke: theme.handleAccent,
					cursor: getResizeCursorForRotation(90, rotation, scaleX, scaleY),
				}}
			/>
		</g>
	);
};

export const ContainerHeaderHeightControl = memo(
	ContainerHeaderHeightControlComponent,
);
