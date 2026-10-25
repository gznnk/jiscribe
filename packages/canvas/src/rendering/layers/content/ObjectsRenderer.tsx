import { memo } from "react";

import { ConnectorRenderer } from "./ConnectorRenderer";
import { useElementReuse } from "./hooks/useElementReuse";
import {
	isConnectorShiftedWithOwners,
	readShiftedStartState,
} from "./MovePreview";
import type { MovePreview } from "./MovePreview";
import { ObjectRenderBoundary } from "./ObjectRenderBoundary";
import type { CanvasState } from "../../../states/canvas/CanvasState";
import type { ConnectorState } from "../../../states/objects/connector/ConnectorState";
import type { GroupState } from "../../../states/objects/primitives/group/GroupState";
import { resolveEndpointOwner } from "../../objects/connector/geometry/endpoints";
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
	/**
	 * The move drag under way, as its handler declared it. Each object it
	 * translated is drawn from its start state inside a shifted wrapper, so the
	 * object's component is not re-rendered per frame. Omit outside a move drag.
	 */
	movePreview?: MovePreview;
};

/**
 * Unified renderer that traverses rootIds (in z-order) to draw content.
 * Objects and connectors are drawn in the same mixed order, so the array order
 * is the stacking order as-is.
 * - group → expand children recursively (a group's children never include a connector)
 * - connector → drawn by the dedicated ConnectorRenderer since it needs endpoint resolution
 * - otherwise → the component from the registry, each inside its own
 *   ObjectRenderBoundary so one object's throw leaves the rest drawn
 *
 * Every drawn object and connector sits in a wrapper `<g>` of its own, outside
 * the boundary, which carries the move preview's shift while a move drag draws
 * it from its start state (see MovePreview). The wrapper is there whether or
 * not it is shifted, so a drag that starts or ends moves no subtree; export
 * folds it away (`data-canvas-export="flatten"`).
 *
 * The element built for an id is handed back as the very same object while
 * everything it is built from holds (useElementReuse), so React bails out on it
 * without visiting the wrapper or the boundary: a frame that moves a few objects
 * costs React those few, not every object drawn.
 */
const ObjectsRendererComponent: React.FC<ObjectsRendererProps> = ({
	objects,
	rootIds,
	textEditObjectId,
	editingTextSlotId,
	renderedObjectIds,
	movePreview,
}) => {
	const objectComponentRegistry = useObjectComponentRegistry();
	const shiftTransform = movePreview
		? `translate(${movePreview.delta.x} ${movePreview.delta.y})`
		: undefined;

	const reuseElement = useElementReuse();

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
			const isEditing = id === textEditObjectId;
			const isShifted =
				movePreview !== undefined &&
				!isEditing &&
				isConnectorShiftedWithOwners(connectorState, movePreview, objects);
			// The start owners keep their identities for the whole drag, so a shifted
			// connector's memo holds and its route is not resolved again.
			const ownerObjects = isShifted ? movePreview.startObjects : objects;
			// Extract only the endpoint owners here so ConnectorRenderer's memo works:
			// their identities are stable across commits that touch unrelated objects,
			// unlike the objects map itself.
			const sourceObj = resolveEndpointOwner(
				ownerObjects,
				connectorState.source,
			);
			const targetObj = resolveEndpointOwner(
				ownerObjects,
				connectorState.target,
			);
			const transform = isShifted ? shiftTransform : undefined;
			result.push(
				reuseElement(
					id,
					[connectorState, sourceObj, targetObj, isEditing, transform],
					() => (
						<g key={id} data-canvas-export="flatten" transform={transform}>
							<ConnectorRenderer
								connectorState={connectorState}
								sourceObj={sourceObj}
								targetObj={targetObj}
								// Derived here so only the edited connector's prop changes and
								// starting/ending an edit does not break the others' memo.
								isEditing={isEditing}
							/>
						</g>
					),
				),
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
		// The edited object is drawn from its draft, which its start state lacks.
		const shiftedStartState = isEditing
			? null
			: readShiftedStartState(id, movePreview, objects);
		const drawnState = shiftedStartState ?? objState;
		const transform = shiftedStartState ? shiftTransform : undefined;
		// Only the edited object receives the slot id; for the rest the prop stays
		// undefined so starting/ending an edit does not break their memo.
		const drawnSlotId = isEditing
			? (editingTextSlotId ?? undefined)
			: undefined;
		result.push(
			reuseElement(
				id,
				[drawnState, isEditing, drawnSlotId, transform, ObjectComponent],
				() => (
					<g key={id} data-canvas-export="flatten" transform={transform}>
						<ObjectRenderBoundary
							objectId={id}
							objectType={drawnState.type}
							objectState={drawnState}
							component={ObjectComponent}
							isEditing={isEditing}
							editingTextSlotId={drawnSlotId}
						/>
					</g>
				),
			),
		);
	};

	const renderObjects: React.ReactNode[] = [];
	rootIds.forEach((id) => renderObject(id, renderObjects));

	return <>{renderObjects}</>;
};
export const ObjectsRenderer = memo(ObjectsRendererComponent);
