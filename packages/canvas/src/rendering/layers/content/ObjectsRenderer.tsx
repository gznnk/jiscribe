import { memo } from "react";

import { ConnectorRenderer } from "./ConnectorRenderer";
import { ObjectRenderBoundary } from "./ObjectRenderBoundary";
import { resolveEndpointOwner } from "../../../connectors/endpoints";
import type { CanvasState } from "../../../states/canvas/CanvasState";
import type { ConnectorState } from "../../../states/objects/connector/ConnectorState";
import type { GroupState } from "../../../states/objects/primitives/group/GroupState";
import { useObjectComponentRegistry } from "../../objects/registry/ObjectComponentRegistryContext";

type ObjectsRendererProps = Pick<CanvasState, "objects" | "rootIds"> & {
	textEditObjectId?: string | null;
	/**
	 * Slot of `textEditObjectId` the editor is over. Passed on so a multi-slot
	 * shape hides only that slot's text while the editor covers it.
	 */
	editingTextSlotId?: string | null;
	/**
	 * When set, only these IDs are rendered: the objects on screen (viewport
	 * culling, issue #212), or what an export snapshot draws in their place (see
	 * resolveRenderedObjectIds). A group must be in the set for any of its
	 * descendants to be drawn. Omit to render the full tree.
	 */
	renderedObjectIds?: ReadonlySet<string>;
};

/**
 * Unified renderer that traverses rootIds (in z-order) to draw content.
 * Objects and connectors are drawn in the same mixed order, so the array order
 * is the stacking order as-is.
 * - group → expand children recursively (a group's children never include a connector)
 * - connector → drawn by the dedicated ConnectorRenderer since it needs endpoint resolution
 * - otherwise → the component from the registry, each inside its own
 *   ObjectRenderBoundary so one object's throw leaves the rest drawn
 */
const ObjectsRendererComponent: React.FC<ObjectsRendererProps> = ({
	objects,
	rootIds,
	textEditObjectId,
	editingTextSlotId,
	renderedObjectIds,
}) => {
	const objectComponentRegistry = useObjectComponentRegistry();

	const renderObject = (id: string, result: React.ReactNode[]): void => {
		// Render gate: a group is in the set only when a descendant is to be
		// drawn, so this single check also prunes whole subtrees.
		if (renderedObjectIds && !renderedObjectIds.has(id)) {
			return;
		}

		const objState = objects[id];
		if (!objState) {
			return;
		}

		// For a group, add its children to the array recursively
		if (objState.type === "group") {
			const groupState = objState as GroupState;
			groupState.childIds.forEach((childId) => renderObject(childId, result));
			return;
		}

		// Connectors need dynamic resolution of their endpoints (source/target), so draw them with the dedicated renderer.
		if (objState.type === "connector") {
			const connectorState = objState as ConnectorState;
			// Extract only the endpoint owners here so ConnectorRenderer's memo works:
			// their identities are stable across commits that touch unrelated objects,
			// unlike the objects map itself.
			result.push(
				<ConnectorRenderer
					key={id}
					connectorState={connectorState}
					sourceObj={resolveEndpointOwner(objects, connectorState.source)}
					targetObj={resolveEndpointOwner(objects, connectorState.target)}
					// Derived here so only the edited connector's prop changes and
					// starting/ending an edit does not break the others' memo.
					isEditing={id === textEditObjectId}
				/>,
			);
			return;
		}

		// For a regular object, get the component from the registry and add it to the array
		const ObjectComponent = objectComponentRegistry.get(objState.type);
		if (!ObjectComponent) {
			return;
		}

		// When text editing, add the isEditing prop
		const isEditing = id === textEditObjectId;
		result.push(
			<ObjectRenderBoundary
				key={id}
				objectId={id}
				objectType={objState.type}
				objectState={objState}
				component={ObjectComponent}
				isEditing={isEditing}
				// Only the edited object receives the slot id; for the rest the prop
				// stays undefined so starting/ending an edit does not break their memo.
				editingTextSlotId={
					isEditing ? (editingTextSlotId ?? undefined) : undefined
				}
			/>,
		);
	};

	const renderObjects: React.ReactNode[] = [];
	rootIds.forEach((id) => renderObject(id, renderObjects));

	return <>{renderObjects}</>;
};
export const ObjectsRenderer = memo(ObjectsRendererComponent);
