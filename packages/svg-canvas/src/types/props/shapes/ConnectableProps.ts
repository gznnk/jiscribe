import type { ConnectType } from "../../core/ConnectType";
import type { DiagramConnectEvent } from "../../events/DiagramConnectEvent";
import type { PreviewConnectLineEvent } from "../../events/PreviewConnectLineEvent";

/**
 * Props for connectable component.
 *
 * @property {ConnectType} connectType - The type of connection for the component.
 * @property {boolean} connectEnabled   - Whether the component is connectable.
 * @property {function} onConnect        - Event handler for diagram connection.
 *                                         The connectable component must trigger this event when a connection is made.
 * @property {function} onPreviewConnectLine - Event handler for preview connection line changes.
 *                                             The connectable component must trigger this event when the preview connection line should be updated.
 */
export type ConnectableProps = {
	connectType?: ConnectType;
	onConnect?: (e: DiagramConnectEvent) => void;
	onPreviewConnectLine?: (e: PreviewConnectLineEvent) => void;
};
