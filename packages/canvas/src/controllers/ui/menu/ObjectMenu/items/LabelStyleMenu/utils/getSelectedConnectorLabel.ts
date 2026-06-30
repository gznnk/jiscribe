import type { ConnectorLabel } from "../../../../../../../schemas/objects/connections/connector/ConnectorDoc";
import type { CanvasControllerState } from "../../../../../../CanvasTypes";

/**
 * 選択中コネクター（selectedConnectorId）のラベルを返す。
 * ラベル系メニュー項目（LabelStyleMenu）が現在値を読むための共通ヘルパ。
 * 図形の getFirstSelectedWithProp に相当するが、connector は selectedConnectorId 経由かつ
 * スタイルが label にネストするため別経路で取る。
 */
export const getSelectedConnectorLabel = (
	state: CanvasControllerState,
): ConnectorLabel | undefined => {
	const id = state.selectedConnectorId;
	const connector = id ? state.objects[id] : undefined;
	return (connector as { label?: ConnectorLabel } | undefined)?.label;
};
