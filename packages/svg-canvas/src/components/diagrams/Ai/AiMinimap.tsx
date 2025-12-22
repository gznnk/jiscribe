import type React from "react";
import { memo } from "react";

import type { AiProps } from "../../../types/props/diagrams/AiProps";

/**
 * Ai minimap component (simplified version for minimap)
 */
const AiMinimapComponent: React.FC<AiProps> = ({ x, y, avatarBgColor }) => {
	// Avatar size (same as component size)
	const avatarSize = 60;

	return (
		<g>
			{/* Avatar circle only */}
			<circle
				cx={x}
				cy={y}
				r={avatarSize / 2}
				fill={avatarBgColor}
				stroke="#333"
				strokeWidth="0.5"
			/>
		</g>
	);
};

export const AiMinimap = memo(AiMinimapComponent);
