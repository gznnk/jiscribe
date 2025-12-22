import type { ConnectableState } from "../../../types/state/shapes/ConnectableState";
import type { ConnectPointState } from "../../../types/state/shapes/ConnectPointState";

export const ConnectableDefaultState = {
	connectEnabled: true,
	showConnectPoints: false,
	connectPoints: [] as ConnectPointState[],
} as const satisfies ConnectableState;
