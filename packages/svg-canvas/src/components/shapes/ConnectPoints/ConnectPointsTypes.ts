import type { ConnectType } from "../../../types/core/ConnectType";
import type { Frame } from "../../../types/core/Frame";
import type { DiagramConnectEvent } from "../../../types/events/DiagramConnectEvent";
import type { PreviewConnectLineEvent } from "../../../types/events/PreviewConnectLineEvent";
import type { ConnectPointState } from "../../../types/state/shapes/ConnectPointState";

/**
 * Props for ConnectPoints component
 */
export type ConnectPointsProps = {
	/** Owner shape ID */
	ownerId: string;
	/** Owner shape properties */
	ownerFrame: Frame;
	/** Array of connect points to render */
	connectPoints: ConnectPointState[];
	/** Whether to show all connect points */
	showConnectPoints: boolean;
	/** Whether to render connect points at all */
	shouldRender: boolean;
	/** Whether the connect points are enabled for connections */
	connectEnabled?: boolean;
	/** Connection type for the connect points */
	connectType?: ConnectType;
	/** Connect event handler */
	onConnect?: (event: DiagramConnectEvent) => void;
	/** Preview connect line event handler */
	onPreviewConnectLine?: (event: PreviewConnectLineEvent) => void;
};
