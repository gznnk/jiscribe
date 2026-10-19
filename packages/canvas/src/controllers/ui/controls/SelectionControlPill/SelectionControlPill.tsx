import { memo } from "react";

import { useCanvasTheme } from "../../../../theme/CanvasThemeContext";
import { theme } from "../../../../theme/themeTokens";
import { SELECTED_HANDLE_STROKE_SCALE } from "../../utils/selectedHandleStrokeScale";

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
	/** data-action value (the control's derived `selection:<objectType>:<name>`). */
	action: string;
	cursor: string;
	/**
	 * Whether the part this pill stands for is selected. Swaps fill and stroke
	 * and thickens the stroke (SELECTED_HANDLE_STROKE_SCALE). Omitted = not
	 * selected.
	 */
	selected?: boolean;
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
	action,
	cursor,
	selected = false,
}) => {
	const { handleDimensions } = useCanvasTheme();
	const pillWidth = PILL_WIDTH / zoom;
	const pillHeight = PILL_HEIGHT / zoom;
	const adjustedStrokeWidth =
		(handleDimensions.anchorStrokeWidth *
			(selected ? SELECTED_HANDLE_STROKE_SCALE : 1)) /
		zoom;

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
				data-action={action}
				style={{
					fill: selected ? theme.handleAccent : theme.handleFill,
					stroke: selected ? theme.handleFill : theme.handleAccent,
					cursor,
				}}
			/>
		</g>
	);
};

export const SelectionControlPill = memo(SelectionControlPillComponent);
