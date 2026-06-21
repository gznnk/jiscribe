import { memo } from "react";

import { ConnectorRenderer } from "./ConnectorRenderer";
import type { CanvasState } from "../../../states/canvas/CanvasState";
import type { ConnectorState } from "../../../states/objects/connections/connector/ConnectorState";
import type { GroupState } from "../../../states/objects/primitives/group/GroupState";
import { objectComponentRegistry } from "../../objects/registry/ObjectComponentRegistry";

type ObjectsRendererProps = Pick<CanvasState, "objects" | "rootIds"> & {
	textEditObjectId?: string | null;
};

/**
 * rootIds（z-order 順）を走査してコンテンツを描画する統一レンダラー。
 * オブジェクトとコネクターを混在した同一順序で描くため、配列順がそのまま重なり順になる。
 * - group → 子を再帰展開（group の子に connector は来ない）
 * - connector → 端点解決が必要なので専用の ConnectorRenderer で描画
 * - それ以外 → レジストリのコンポーネント
 */
const ObjectsRendererComponent: React.FC<ObjectsRendererProps> = ({
	objects,
	rootIds,
	textEditObjectId,
}) => {
	const renderObject = (id: string, result: React.ReactNode[]): void => {
		const objState = objects[id];
		if (!objState) {
			return;
		}

		// Groupの場合は子要素を再帰的に配列に追加
		if (objState.type === "group") {
			const groupState = objState as GroupState;
			groupState.childIds.forEach((childId) => renderObject(childId, result));
			return;
		}

		// コネクターは端点（source/target）の動的解決が必要なため専用レンダラーで描く。
		if (objState.type === "connector") {
			result.push(
				<ConnectorRenderer
					key={id}
					connectorState={objState as ConnectorState}
					objects={objects}
				/>,
			);
			return;
		}

		// 通常のオブジェクトはレジストリからコンポーネントを取得して配列に追加
		const ObjectComponent = objectComponentRegistry.get(objState.type);
		if (!ObjectComponent) {
			return;
		}

		// テキスト編集中の場合は isEditing prop を追加
		const isEditing = id === textEditObjectId;
		result.push(
			<ObjectComponent key={id} {...objState} isEditing={isEditing} />,
		);
	};

	const renderObjects: React.ReactNode[] = [];
	rootIds.forEach((id) => renderObject(id, renderObjects));

	return <>{renderObjects}</>;
};
export const ObjectsRenderer = memo(ObjectsRendererComponent);
