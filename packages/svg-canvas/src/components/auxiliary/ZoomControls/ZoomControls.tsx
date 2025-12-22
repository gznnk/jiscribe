import { memo } from "react";

import {
	ZoomControlsContainer,
	ZoomButton,
	ZoomDisplay,
} from "./ZoomControlsStyled";

export type ZoomControlsProps = {
	/** Current zoom level (1.0 = 100%) */
	zoom: number;
	/** Callback when zoom in button is clicked */
	onZoomIn: () => void;
	/** Callback when zoom out button is clicked */
	onZoomOut: () => void;
	/** Callback when zoom display is clicked to reset zoom */
	onZoomReset: () => void;
};

const ZoomControlsComponent = ({
	zoom,
	onZoomIn,
	onZoomOut,
	onZoomReset,
}: ZoomControlsProps) => {
	// Display the actual zoom value as percentage
	const zoomPercentage = Math.round(zoom * 100);

	return (
		<ZoomControlsContainer>
			<ZoomButton onClick={onZoomOut} title="Zoom Out (Ctrl+-)">
				<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
					<title>Zoom Out</title>
					<path d="M11 6H3a1 1 0 100 2h8a1 1 0 100-2z" />
				</svg>
			</ZoomButton>
			<ZoomDisplay onClick={onZoomReset} title="Reset Zoom (Ctrl+0)">
				{zoomPercentage}%
			</ZoomDisplay>
			<ZoomButton onClick={onZoomIn} title="Zoom In (Ctrl++)">
				<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
					<title>Zoom In</title>
					<path d="M11 6H8V3a1 1 0 10-2 0v3H3a1 1 0 100 2h3v3a1 1 0 102 0V8h3a1 1 0 100-2z" />
				</svg>
			</ZoomButton>
		</ZoomControlsContainer>
	);
};

export const ZoomControls = memo(ZoomControlsComponent);
