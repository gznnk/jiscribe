import { memo } from "react";

import { ConnectorRenderer } from "./ConnectorRenderer";
import { resolveEndpointOwner } from "./utils/endpoints";
import type { CanvasState } from "../../../states/canvas/CanvasState";
import type { ConnectorState } from "../../../states/objects/connections/connector/ConnectorState";
import type { GroupState } from "../../../states/objects/primitives/group/GroupState";
import { useObjectComponentRegistry } from "../../objects/registry/ObjectComponentRegistryContext";

type ObjectsRendererProps = Pick<CanvasState, "objects" | "rootIds"> & {
	textEditObjectId?: string | null;
	/**
	 * Viewport culling (issue #212): when set, only these IDs are rendered.
	 * Omit to render the full tree — required for paths that need every object
	 * in the DOM (export clones the live SVG; thumbnails fit all content).
	 */
	visibleObjectIds?: ReadonlySet<string>;
};

/**
 * Unified renderer that traverses rootIds (in z-order) to draw content.
 * Objects and connectors are drawn in the same mixed order, so the array order
 * is the stacking order as-is.
 * - group → expand children recursively (a group's children never include a connector)
 * - connector → drawn by the dedicated ConnectorRenderer since it needs endpoint resolution
 * - otherwise → the component from the registry
 */
const ObjectsRendererComponent: React.FC<ObjectsRendererProps> = ({
	objects,
	rootIds,
	textEditObjectId,
	visibleObjectIds,
}) => {
	const objectComponentRegistry = useObjectComponentRegistry();

	const renderObject = (id: string, result: React.ReactNode[]): void => {
		// Culling gate: groups with any visible descendant are in the set, so
		// this single check also prunes fully offscreen subtrees.
		if (visibleObjectIds && !visibleObjectIds.has(id)) {
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
					textEditObjectId={textEditObjectId}
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
			<ObjectComponent key={id} {...objState} isEditing={isEditing} />,
		);
	};

	const renderObjects: React.ReactNode[] = [];
	rootIds.forEach((id) => renderObject(id, renderObjects));

	return <>{renderObjects}</>;
};
export const ObjectsRenderer = memo(ObjectsRendererComponent);
