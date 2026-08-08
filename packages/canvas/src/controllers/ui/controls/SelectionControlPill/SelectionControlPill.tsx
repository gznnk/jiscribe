import { memo } from "react";

import { theme } from "../../../../constants/theme";
import { useCanvasTheme } from "../../../../theme/CanvasThemeContext";

/** Pill dimensions in screen pixels — distinct from the circular resize anchors. */
const PILL_WIDTH = 18;
const PILL_HEIGHT = 7;

type SelectionControlPillProps = {
	/** Handle center in world coordinates. */
	cx: number;
	cy: number;
	/** Rotation of the pill's long axis, in degrees (0 = horizontal). */
	rotation: number;
	zoom: number;
	objectId: string;
	/** data-part value (the control's derived `selection:<objectType>:<name>`). */
	part: string;
	cursor: string;
};

/**
 * Shared pill-shaped handle for selection controls (the container's header
 * height, the callout's tail tip, …; every one of them lives in a plugin today).
 * Carries the control data attributes; the caller
 * provides the world position, orientation, and cursor.
 */
const SelectionControlPillComponent: React.FC<SelectionControlPillProps> = ({
	cx,
	cy,
	rotation,
	zoom,
	objectId,
	part,
	cursor,
}) => {
	const { handleDimensions } = useCanvasTheme();
	const pillWidth = PILL_WIDTH / zoom;
	const pillHeight = PILL_HEIGHT / zoom;
	const adjustedStrokeWidth = handleDimensions.anchorStrokeWidth / zoom;

	return (
		<g transform={`translate(${cx} ${cy}) rotate(${rotation})`}>
			<rect
				x={-pillWidth / 2}
				y={-pillHeight / 2}
				width={pillWidth}
				height={pillHeight}
				rx={pillHeight / 2}
				strokeWidth={adjustedStrokeWidth}
				data-kind="control"
				data-id={objectId}
				data-part={part}
				style={{
					fill: theme.handleFill,
					stroke: theme.handleAccent,
					cursor,
				}}
			/>
		</g>
	);
};

export const SelectionControlPill = memo(SelectionControlPillComponent);
