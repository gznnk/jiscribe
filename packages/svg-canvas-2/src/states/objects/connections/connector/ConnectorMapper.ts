import type { Point } from "@workspace/geometry";

import type { ConnectorState } from "./ConnectorState";
import type { ConnectorDoc } from "../../../../schemas/objects/connections/connector/ConnectorDoc";
import type {
	DocToStateMapper,
	StateToDocMapper,
} from "../../base/MapperTypes";
import { ObjectMapper } from "../../base/ObjectMapper";

/**
 * Converts ConnectorDoc to ConnectorState.
 */
export const connectorToState: DocToStateMapper<
	ConnectorDoc,
	ConnectorState
> = (doc) => {
	const base = ObjectMapper.toState(doc);

	return {
		...base,
		// points は中間経由点のみを保持する仕様だが、過去バージョンが作成時の端点座標を
		// 書き込んでいたため既存ファイルには陳腐化した座標が残っている。
		// 経由点による変形機能は未実装で正当な経由点データは存在しないため、
		// 読み込み時に無条件でクリアして陳腐データを掃除する。
		// TODO: 変形機能の実装時に doc.points を引き継ぐよう戻すこと
		points: [] as Point[],
		source: doc.source,
		target: doc.target,
		stroke: doc.stroke,
		strokeWidth: doc.strokeWidth,
		strokeDashType: doc.strokeDashType,
		startArrow: doc.startArrow,
		endArrow: doc.endArrow,
	} as ConnectorState;
};

/**
 * Converts ConnectorState to ConnectorDoc.
 */
export const connectorToDoc: StateToDocMapper<ConnectorState, ConnectorDoc> = (
	state,
) => {
	const base = ObjectMapper.toDoc(state);

	return {
		...base,
		points: state.points,
		source: state.source,
		target: state.target,
		stroke: state.stroke,
		strokeWidth: state.strokeWidth,
		strokeDashType: state.strokeDashType,
		startArrow: state.startArrow,
		endArrow: state.endArrow,
	} as ConnectorDoc;
};
