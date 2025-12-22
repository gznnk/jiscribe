import { memo } from "react";

import {
	RightPanelContainerStyled,
	BottomPanelContainerStyled,
} from "./RightPanelContainerStyled";
import type {
	RightPanelContainerProps,
	BottomPanelContainerProps,
} from "./RightPanelContainerTypes";

/**
 * Container component for right-side panels (top-right positioning).
 * Manages vertical stacking layout for MiniMap and similar components.
 *
 * @param props - Component properties
 * @returns React component
 */
const RightPanelContainerComponent = ({
	children,
}: RightPanelContainerProps) => {
	return <RightPanelContainerStyled>{children}</RightPanelContainerStyled>;
};

/**
 * Container component for bottom-right panels.
 * Manages vertical stacking layout for ZoomControls and AiChatPanel.
 *
 * @param props - Component properties
 * @returns React component
 */
const BottomPanelContainerComponent = ({
	children,
}: BottomPanelContainerProps) => {
	return <BottomPanelContainerStyled>{children}</BottomPanelContainerStyled>;
};

export const RightPanelContainer = memo(RightPanelContainerComponent);
export const BottomPanelContainer = memo(BottomPanelContainerComponent);
