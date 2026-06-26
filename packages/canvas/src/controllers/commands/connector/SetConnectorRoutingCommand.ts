import { isOrthogonalRouting } from "../../../schemas/objects/types/ConnectorRouting";
import type { ConnectorRouting } from "../../../schemas/objects/types/ConnectorRouting";
import type { ConnectorState } from "../../../states/objects/connections/connector/ConnectorState";
import type { CanvasControllerState } from "../../CanvasTypes";
import type { Command } from "../CommandTypes";

/**
 * 選択中の対象が単一コネクターのときだけ実行可能。
 * routing 切替は selectedConnectorId のコネクターに対してのみ意味を持つ。
 */
const isConnectorSelected = (state: CanvasControllerState): boolean =>
	state.selectedConnectorId !== null &&
	state.objects[state.selectedConnectorId]?.type === "connector";

/**
 * 選択中コネクターの routing を差し替える。
 *
 * `orthogonal` は経路を描画時に算出する派生値であり、ドキュメントの不変条件として
 * `points`（手動 waypoint）は常に空に保つ。そのため orthogonal へ切り替える際は
 * 既存の waypoint を破棄する。`straight` へ切り替えるときは既存 waypoint を温存する。
 *
 * waypoint 移動ハンドルが消えるため、選択中 waypoint（selectedVertex）もクリアする。
 *
 * 実効 routing が変わらない場合は no-op。再クリックで無駄な履歴エントリを作らず、
 * 既定（routing 省略 = orthogonal）のコネクターに冗長な `routing: "orthogonal"` を
 * 書き込んでドキュメントを汚さないため。
 */
const applyConnectorRouting = (
	state: CanvasControllerState,
	routing: ConnectorRouting,
): CanvasControllerState => {
	const id = state.selectedConnectorId;
	if (id === null) {
		return state;
	}

	const connector = state.objects[id] as ConnectorState | undefined;
	if (!connector || connector.type !== "connector") {
		return state;
	}

	const isAlreadyApplied =
		isOrthogonalRouting(connector.routing) === (routing === "orthogonal");
	if (isAlreadyApplied) {
		return state;
	}

	const nextConnector: ConnectorState = {
		...connector,
		routing,
		points: routing === "orthogonal" ? [] : connector.points,
	} as ConnectorState;

	return {
		...state,
		objects: {
			...state.objects,
			[id]: nextConnector,
		},
		selectedVertex: null,
		commitVersion: state.commitVersion + 1,
	};
};

export const SetRoutingStraightCommand: Command = {
	id: "setRoutingStraight",
	label: "Straight Routing",
	category: "edit",
	canExecute: isConnectorSelected,
	execute: (state) => applyConnectorRouting(state, "straight"),
};

export const SetRoutingOrthogonalCommand: Command = {
	id: "setRoutingOrthogonal",
	label: "Orthogonal Routing",
	category: "edit",
	canExecute: isConnectorSelected,
	execute: (state) => applyConnectorRouting(state, "orthogonal"),
};
