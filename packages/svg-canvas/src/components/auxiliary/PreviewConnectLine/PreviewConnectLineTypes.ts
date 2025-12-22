import type { PathState } from "../../../types/state/shapes/PathState";

/**
 * Props for PreviewConnectLine component.
 */
export type PreviewConnectLineProps = {
	/** The path data for the preview connection line. When undefined, nothing is rendered. */
	pathData?: PathState;
};
