import type { Diagram } from "../../../types/state/core/Diagram";

/**
 * Props for DragGhost component
 */
export type DragGhostProps = {
	/** The selected diagrams to display as ghost */
	diagrams: Diagram[];
};
