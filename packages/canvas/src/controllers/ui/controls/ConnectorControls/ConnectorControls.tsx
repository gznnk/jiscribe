import { memo } from "react";

import { useResolvedConnectorPoints } from "../../../../presentations/layers/content/utils/useResolvedConnectorPoints";
import { isOrthogonalRouting } from "../../../../schemas/objects/types/ConnectorRouting";
import type { CanvasState } from "../../../../states/canvas/CanvasState";
import type { ConnectorState } from "../../../../states/objects/connections/connector/ConnectorState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { VertexControls, VertexInsertControls } from "../VertexControls";

const ENDPOINT_RADIUS = 4;
const ENDPOINT_STROKE_WIDTH = 1;
const ENDPOINT_COLOR = "#0d99ff";
const ENDPOINT_FILL = "white";

type ConnectorControlsProps = {
	connectorState: ConnectorState;
	objects: CanvasState["objects"];
	zoom?: number;
	selectedVertex?: CanvasControllerState["selectedVertex"];
};

/**
 * Renders the editing controls for a selected connector:
 * - 端点ハンドル（source / target）: ドラッグで図形へ再接続する
 *   （data-id="connection-anchor:edit:<id>:source|target" → ConnectionAnchorEventHandler）
 * - waypoint 移動ハンドル: 既存の経由点を動かす
 *   （data-id="vertex-control:<id>:<i>" → VertexControlHandler を流用）
 * - waypoint 挿入ハンドル: 解決済みパス [source, ...waypoints, target] の各セグメント中点。
 *   ドラッグで新しい経由点を追加する
 *   （data-id="connector-vertex-insert:<id>:<segment>" → ConnectorVertexInsertHandler）
 *
 * Placed in the controllers layer so selection visuals are decoupled from the connector itself.
 */
const ConnectorControlsComponent: React.FC<ConnectorControlsProps> = ({
	connectorState,
	objects,
	zoom = 1,
	selectedVertex = null,
}) => {
	const resolved = useResolvedConnectorPoints(connectorState, objects);

	if (!resolved) {
		return null;
	}

	// Adjust sizes based on zoom level to maintain consistent visual size
	const adjustedEndpointRadius = ENDPOINT_RADIUS / zoom;
	const adjustedEndpointStrokeWidth = ENDPOINT_STROKE_WIDTH / zoom;

	// コネクターの不変条件「少なくとも一方が owned」を UI 側で守る。
	// 片端が free のときは、対になる owned 端のハンドルを隠す。
	// 隠さないと owned 端を空中（free）へドラッグして free-free を作れてしまうため。
	// free 端のハンドルは常に表示する（位置調整・図形への再接続のため）。
	const sourceIsFree = !connectorState.source.owner;
	const targetIsFree = !connectorState.target.owner;
	const showSourceHandle = sourceIsFree || !targetIsFree;
	const showTargetHandle = targetIsFree || !sourceIsFree;

	// 移動ハンドルは中間経由点（waypoints）に、挿入ハンドルは端点込みの
	// フル解決パスの各セグメント中点に出す。
	// orthogonal（自動ルーティング）では経路が計算値のため、手動ハンドルは出さない。
	// routing 省略時は orthogonal が既定。
	const isOrthogonal = isOrthogonalRouting(connectorState.routing);
	const waypoints = connectorState.points;
	const selectedVertexIndex =
		selectedVertex?.objectId === connectorState.id
			? selectedVertex.vertexIndex
			: null;

	return (
		<g data-layer="connector-controls">
			{/* waypoint 挿入ハンドル（端点込みパスのセグメント中点）。端点ハンドルの下に描く */}
			{!isOrthogonal && (
				<VertexInsertControls
					objectId={connectorState.id}
					points={resolved.points}
					controlIdPrefix="connector-vertex-insert"
					zoom={zoom}
				/>
			)}

			{/* waypoint 移動ハンドル */}
			{!isOrthogonal && (
				<VertexControls
					objectId={connectorState.id}
					points={waypoints}
					zoom={zoom}
					selectedVertexIndex={selectedVertexIndex}
				/>
			)}

			{/* Source endpoint handle (interactive). 対が free のとき owned 端は隠す */}
			{showSourceHandle && (
				<circle
					cx={resolved.source.x}
					cy={resolved.source.y}
					r={adjustedEndpointRadius}
					fill={ENDPOINT_FILL}
					stroke={ENDPOINT_COLOR}
					strokeWidth={adjustedEndpointStrokeWidth}
					data-kind="control"
					data-id={`connection-anchor:edit:${connectorState.id}:source`}
					style={{ cursor: "move" }}
				/>
			)}

			{/* Target endpoint handle (interactive). 対が free のとき owned 端は隠す */}
			{showTargetHandle && (
				<circle
					cx={resolved.target.x}
					cy={resolved.target.y}
					r={adjustedEndpointRadius}
					fill={ENDPOINT_FILL}
					stroke={ENDPOINT_COLOR}
					strokeWidth={adjustedEndpointStrokeWidth}
					data-kind="control"
					data-id={`connection-anchor:edit:${connectorState.id}:target`}
					style={{ cursor: "move" }}
				/>
			)}
		</g>
	);
};

export const ConnectorControls = memo(ConnectorControlsComponent);
