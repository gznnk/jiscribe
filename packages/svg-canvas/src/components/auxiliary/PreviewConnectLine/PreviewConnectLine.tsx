import { memo } from "react";

import type { PreviewConnectLineProps } from "./PreviewConnectLineTypes";
import { DragPoint } from "../../core/DragPoint";
import { Path } from "../../shapes/Path";

/**
 * Component for rendering a preview connection line.
 *
 * This component exists to ensure that the preview connection line is rendered
 * on top of all other shapes. It is positioned at the front of the render order
 * in SvgCanvas to achieve this visual layering effect.
 */
const PreviewConnectLineComponent: React.FC<PreviewConnectLineProps> = ({
	pathData,
}) => {
	if (!pathData) {
		return null;
	}

	// Get the start point for displaying the connect point circle
	const startPoint = pathData.items?.[0];

	return (
		<>
			<Path {...pathData} />
			{startPoint && (
				<DragPoint
					id={`${pathData.id}-start-point`}
					x={startPoint.x}
					y={startPoint.y}
					radius={6}
					stroke="rgba(107, 114, 128, 0.8)"
					fill="rgba(255, 255, 255, 1)"
					cursor="default"
					hidden={false}
					isTransparent={false}
				/>
			)}
		</>
	);
};

export const PreviewConnectLine = memo(PreviewConnectLineComponent);
