import { memo } from "react";

import {
	PropertyPanelRowContainer,
	PropertyPanelRowControl,
	PropertyPanelRowLabel,
} from "../PropertyPanelStyled";

type PropertyRowProps = {
	/** Text of the label column. Omitted leaves it empty, for a row the control names itself (X / Y fields). */
	label?: string;
	children: React.ReactNode;
};

/**
 * One row of a property section: a fixed-width label and the control that states
 * the value. The label column is kept even when there is no label, so every
 * control in the panel starts on the same line.
 */
const PropertyRowComponent: React.FC<PropertyRowProps> = ({
	label,
	children,
}) => (
	<PropertyPanelRowContainer>
		<PropertyPanelRowLabel>{label}</PropertyPanelRowLabel>
		<PropertyPanelRowControl>{children}</PropertyPanelRowControl>
	</PropertyPanelRowContainer>
);

export const PropertyRow = memo(PropertyRowComponent);
