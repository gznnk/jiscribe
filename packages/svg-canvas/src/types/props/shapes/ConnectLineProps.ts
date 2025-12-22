import type { CreateDiagramProps } from "./CreateDiagramProps";
import type { ConnectLineFeatures } from "../../data/shapes/ConnectLineData";
import type { ConnectLineState } from "../../state/shapes/ConnectLineState";

/**
 * Props for ConnectLine component.
 */
export type ConnectLineProps = CreateDiagramProps<
	ConnectLineState,
	typeof ConnectLineFeatures
>;
