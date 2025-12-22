import type React from "react";
import { memo } from "react";

import { DiagramRegistry } from "../../../registry";
import type { GroupProps } from "../../../types/props/shapes/GroupProps";

/**
 * Group minimap component - lightweight version without outlines, controls, and labels.
 */
const GroupMinimapComponent: React.FC<GroupProps> = ({ items }) => {
	return (
		<g>
			{items.map((item) => {
				const MinimapComponent = DiagramRegistry.getMinimapComponent(item.type);
				if (!MinimapComponent) return null;

				return (
					<MinimapComponent
						key={item.id}
						{...item}
						isSelected={false}
						showOutline={false}
						isTransforming={false}
						isDragging={false}
					/>
				);
			})}
		</g>
	);
};

export const GroupMinimap = memo(GroupMinimapComponent);
