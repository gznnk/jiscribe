import type React from "react";
import { memo } from "react";

// Imports related to this component.
import {
	DiagramMenuControlPositioner,
	DiagramMenuControlContainer,
} from "./DiagramMenuControlStyled";

/**
 * Props for the DiagramMenuControl component.
 */
type DiagramMenuControlProps = {
	children: React.ReactNode;
};

/**
 * DiagramMenuControl component.
 */
const DiagramMenuControlComponent: React.FC<DiagramMenuControlProps> = ({
	children,
}) => {
	return (
		<DiagramMenuControlPositioner>
			<DiagramMenuControlContainer>{children}</DiagramMenuControlContainer>
		</DiagramMenuControlPositioner>
	);
};

export const DiagramMenuControl = memo(DiagramMenuControlComponent);
