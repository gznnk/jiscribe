import type { ConnectPointData } from "../../data/shapes/ConnectPointData";
import type { DiagramBaseState } from "../core/DiagramBaseState";

/**
 * State type for connection points.
 * Defines properties for points where connections between diagram elements can be made.
 */
export type ConnectPointState = ConnectPointData & DiagramBaseState;
