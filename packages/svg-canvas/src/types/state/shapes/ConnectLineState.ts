import type { CreateStateType } from "./CreateStateType";
import type {
	ConnectLineData,
	ConnectLineFeatures,
} from "../../data/shapes/ConnectLineData";

/**
 * State type for connection lines between diagram elements.
 */
export type ConnectLineState = CreateStateType<
	ConnectLineData,
	typeof ConnectLineFeatures
>;
