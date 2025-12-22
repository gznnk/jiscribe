import type { ConnectType } from "../../core/ConnectType";
import type { Frame } from "../../core/Frame";
import type { DiagramConnectEvent } from "../../events/DiagramConnectEvent";
import type { PreviewConnectLineEvent } from "../../events/PreviewConnectLineEvent";
import type { ConnectPointState } from "../../state/shapes/ConnectPointState";

/**
 * Connect point properties
 */
export type ConnectPointProps = Omit<ConnectPointState, "type"> & {
	ownerId: string;
	ownerFrame: Frame; // Should be passed as memoized
	alwaysVisible: boolean; // Whether to always show the connect point, even when not hovered.
	connectType?: ConnectType;
	onConnect?: (e: DiagramConnectEvent) => void;
	onPreviewConnectLine?: (e: PreviewConnectLineEvent) => void;
};
