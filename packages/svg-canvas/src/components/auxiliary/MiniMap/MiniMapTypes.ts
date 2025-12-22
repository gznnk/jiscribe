import type { Diagram } from "../../../types/state/core/Diagram";

/**
 * Props for MiniMap component
 */
export type MiniMapProps = {
	/** All canvas items */
	items: Diagram[];
	/** Current viewport position X */
	minX: number;
	/** Current viewport position Y */
	minY: number;
	/** Current container width */
	containerWidth: number;
	/** Current container height */
	containerHeight: number;
	/** Current zoom level */
	zoom: number;
	/** Width of the minimap */
	width?: number;
	/** Height of the minimap */
	height?: number;
	/** Callback when clicking on minimap to navigate */
	onNavigate?: (minX: number, minY: number) => void;
};
