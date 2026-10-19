import type { ConnectorState } from "../../../states/objects/connector/ConnectorState";
import type {
	MoveByDeltaFunction,
	RotateByGroupFunction,
	TransformByGroupFunction,
} from "../../gestures/registry/ObjectBehaviorTypes";

/**
 * No-op: the paths that move a selection refuse one that is a lone connector
 * (moveCommands, ObjectEventHandler), and cloneObjects applies offsets to
 * rootIds only, so this function is never reached in practice. Connector
 * geometry follows its endpoints, which are resolved dynamically at render time.
 */
export const moveByDelta: MoveByDeltaFunction<ConnectorState> = (
	state,
	_delta,
) => state;

/**
 * No-op: connectors cannot be added to groups via the UI (exclusive selection),
 * so this function is never reached in practice.
 */
export const transformByGroup: TransformByGroupFunction<ConnectorState> = (
	state,
	_groupStart,
	_groupEnd,
) => state;

/**
 * No-op: connectors cannot be added to groups via the UI (exclusive selection),
 * so this function is never reached in practice.
 */
export const rotateByGroup: RotateByGroupFunction<ConnectorState> = (
	state,
	_rotationRootGroup,
	_endGroupRotation,
) => state;
