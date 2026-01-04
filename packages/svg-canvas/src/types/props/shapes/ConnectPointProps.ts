import type { TransformedFrame } from "@workspace/geometry";

import type { ConnectType } from "../../core/ConnectType";
import type { DiagramConnectEvent } from "../../events/DiagramConnectEvent";
import type { PreviewConnectLineEvent } from "../../events/PreviewConnectLineEvent";
import type { ConnectPointState } from "../../state/shapes/ConnectPointState";

/**
 * Connect point properties
 */
export type ConnectPointProps = Omit<
	ConnectPointState,
	"type" | "geometryType"
> & {
	ownerId: string;
	ownerFrame: TransformedFrame; // Should be passed as memoized
	alwaysVisible: boolean; // Whether to always show the connect point, even when not hovered.
	connectType?: ConnectType;
	onConnect?: (e: DiagramConnectEvent) => void;
	onPreviewConnectLine?: (e: PreviewConnectLineEvent) => void;
};
