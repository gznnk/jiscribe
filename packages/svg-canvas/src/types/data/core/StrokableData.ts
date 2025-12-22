import type { StrokeDashType } from "../../core/StrokeDashType";

/**
 * Interface for diagram elements that can have stroke styling.
 * Provides properties to control the stroke color, width, and dash pattern.
 */
export type StrokableData = {
	stroke: string;
	strokeWidth: number;
	strokeDashType: StrokeDashType;
};
