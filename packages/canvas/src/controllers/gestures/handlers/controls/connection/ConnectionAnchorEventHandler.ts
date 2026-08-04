import { isTransformedFrame, type Point } from "@workspace/geometry";

import type { AnchorSnapContext } from "./utils/calcNearestAnchor";
import { computeEditedEndpoint } from "./utils/computeEditedEndpoint";
import { findConnectableHoverTarget } from "./utils/findConnectableHoverTarget";
import { getEditingEndpoint } from "./utils/getEditingEndpoint";
import { isSameConnectorEndpoints } from "./utils/isSameConnectorEndpoints";
import { snapFreeEndpointStraight } from "./utils/snapFreeEndpointStraight";
import { resolveEndpointOwner } from "../../../../../presentations/layers/content/utils/endpoints/resolveEndpointOwner";
import type { ExtraConnectPoint } from "../../../../../presentations/objects/registry/ObjectExtraConnectPointsRegistry";
import { ConnectorFeatures } from "../../../../../schemas/objects/connections/connector/ConnectorDoc";
import { defaultRoutingForAnchors } from "../../../../../schemas/objects/types/ConnectorRouting";
import {
	isFreeEndpointRef,
	isSameEndpoint,
} from "../../../../../schemas/objects/types/EndpointRef";
import { AUTO_COLOR } from "../../../../../schemas/objects/utils/autoColor";
import type { ObjectState } from "../../../../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../../../../states/objects/connections/connector/ConnectorState";
import type { CanvasControllerState } from "../../../../CanvasTypes";
import type { ICanvasRegistries } from "../../../../registries/ICanvasRegistries";
import { isAnchorHandleId } from "../../../../ui/controls/ConnectionAnchorTypes";
import { createCowObjects } from "../../../../utils/cowObjects";
import { ControlStrategy } from "../../../registry/ControlStrategy";
import type { CanvasEvent } from "../../../registry/GestureHandlerTypes";
import { SNAP_THRESHOLD_PX } from "../../utils/snap/findSnap";

/**
 * Handler that creates a connector by dragging from a connection anchor,
 * and re-anchors an existing connector's endpoint.
 * Registered with ControlEventHandler as a ControlStrategy.
 *
 * Target format:
 * - create: data-id=<sourceObjectId>, data-part="anchor:<anchorPosition>"
 * - edit:   data-id=<connectorId>,    data-part="endpoint:<source|target>"
 */
export class ConnectionAnchorEventHandler extends ControlStrategy {
	supports(event: CanvasEvent): boolean {
		if (event.targetKind !== "control") {
			return false;
		}

		const targetPart = event.targetPart;
		if (!targetPart) {
			return false;
		}

		// Support both anchor (create) and endpoint (edit) parts
		return (
			targetPart.startsWith("anchor:") || targetPart.startsWith("endpoint:")
		);
	}

	handle(
		state: CanvasControllerState,
		event: CanvasEvent,
		registries: ICanvasRegistries,
	): CanvasControllerState {
		if (!event.targetId || !event.targetPart) {
			return state;
		}

		// Handle based on the gesture type
		if (event.type === "dragStart") {
			return event.targetPart.startsWith("endpoint:")
				? this.handleEditDragStart(state, event)
				: this.handleCreateDragStart(state, event, registries);
		} else if (event.type === "drag") {
			return this.handleDrag(state, event, registries); // shared by create/edit
		} else if (event.type === "dragEnd") {
			return this.handleDragEnd(state, event, registries); // shared by create/edit
		}

		return state;
	}

	/**
	 * The extra connection points the shape's type declares, in local coordinates.
	 * Empty for a type that declares none, or for a shape whose state the calculator
	 * cannot read (a non-frame owner).
	 */
	private readExtraConnectPoints(
		obj: ObjectState | null | undefined,
		registries: ICanvasRegistries,
	): readonly ExtraConnectPoint[] {
		if (!obj || !isTransformedFrame(obj)) {
			return [];
		}
		return registries.objectExtraConnectPoints.get(obj.type)?.(obj) ?? [];
	}

	/**
	 * The geometry the drop position is snapped against: the shape's outline,
	 * anchor region and declared points, plus the zoom the px-denominated snap
	 * distances are measured in. Empty geometry for a non-frame shape, which has
	 * no anchors to snap to in the first place.
	 */
	private readAnchorSnapContext(
		obj: ObjectState | null | undefined,
		registries: ICanvasRegistries,
		zoom: number,
	): AnchorSnapContext {
		if (!obj || !isTransformedFrame(obj)) {
			return { zoom };
		}
		return {
			outline: registries.objectOutline.get(obj.type)?.(obj) ?? null,
			anchorRegion: registries.objectAnchorRegion.get(obj.type)?.(obj) ?? null,
			extraConnectPoints:
				registries.objectExtraConnectPoints.get(obj.type)?.(obj) ?? null,
			zoom,
		};
	}

	/**
	 * Handles drag start on a connection anchor (create mode).
	 * Starts creating a new connector.
	 */
	private handleCreateDragStart(
		state: CanvasControllerState,
		event: CanvasEvent,
		registries: ICanvasRegistries,
	): CanvasControllerState {
		// targetId = sourceObjectId, targetPart = "anchor:<anchorPosition>"
		const sourceObjectId = event.targetId ?? "";
		const anchorPosition = event.targetPart?.slice("anchor:".length) ?? "";
		const sourceObject = state.objects[sourceObjectId];

		if (!sourceObject) {
			return state;
		}

		// Validate anchor position: one of the universal handles, or a point this
		// shape's own type declares (an id no type declares is a stale DOM node).
		const isDeclaredExtra = this.readExtraConnectPoints(
			sourceObject,
			registries,
		).some((extraConnectPoint) => extraConnectPoint.id === anchorPosition);
		if (!isAnchorHandleId(anchorPosition) && !isDeclaredExtra) {
			return state;
		}

		// Generate unique ID for the new connector
		const connectorId = crypto.randomUUID();

		// Create a temporary connector with source anchor and free target
		const pendingConnector: ConnectorState = {
			id: connectorId,
			type: "connector",
			// features must be stamped on creation: the style-property handlers read it directly
			// to gate style updates (a connector without it silently ignores stroke changes).
			features: ConnectorFeatures,
			// points holds only intermediate waypoints (endpoints are held by source/target). Empty on new creation since it is a straight line
			points: [] as Point[],
			source: {
				owner: { id: sourceObjectId },
				anchor:
					anchorPosition === "center"
						? { kind: "center" }
						: { kind: "connectPoint", id: anchorPosition },
			},
			target: {
				anchor: { kind: "free", point: { x: event.last.x, y: event.last.y } },
			},
			// routing is omitted. When omitted, orthogonal (right-angle segments) is the default.
			// Specify "straight" explicitly only when segments at any angle are wanted.
			stroke: AUTO_COLOR,
			strokeWidth: 2,
			endArrow: "ConcaveTriangle",
		} as ConnectorState;

		return {
			...state,
			pendingConnector,
			editingEndpoint: "target", // on new creation, always edit target
			edgeScrollEnabled: true,
			// Clear any selection to avoid confusion
			selectedIds: [],
			multiSelectGroup: null,
			objectMenuOpenId: null,
			stencilLibraryOpenCategory: null,
		};
	}

	/**
	 * Handles drag start for endpoint editing.
	 * Like polyline vertex editing, edits the entity directly without using pendingConnector (overlay).
	 * Therefore objects / rootIds are left unchanged (preserving z-order), and the selection is kept
	 * so that ConnectorControls' endpoint handles follow the entity.
	 * The actual endpoint update is performed by handleDrag based on eventStartSnapshot.
	 */
	private handleEditDragStart(
		state: CanvasControllerState,
		event: CanvasEvent,
	): CanvasControllerState {
		// targetId = connectorId, targetPart = "endpoint:<source|target>"
		const connectorId = event.targetId ?? "";
		const endpoint = event.targetPart?.slice("endpoint:".length) as
			| "source"
			| "target";

		if (endpoint !== "source" && endpoint !== "target") {
			return state;
		}

		const connector = state.objects[connectorId];
		if (!connector || connector.type !== "connector") {
			return state;
		}

		return {
			...state,
			editingConnectorId: connectorId,
			editingEndpoint: endpoint,
			edgeScrollEnabled: true,
			objectMenuOpenId: null,
			stencilLibraryOpenCategory: null,
		};
	}

	/**
	 * Returns a new ConnectorState with baseConnector's edited endpoint updated
	 * according to the current cursor position and hover state.
	 * Only the hover-target resolution (which depends on state.objects / registry) is done here;
	 * the endpoint assembly is delegated to the pure function computeEditedEndpoint.
	 */
	private buildEditedConnector(
		state: CanvasControllerState,
		event: CanvasEvent,
		baseConnector: ConnectorState,
		endpointToUpdate: "source" | "target",
		registries: ICanvasRegistries,
	): ConnectorState {
		// The fixed endpoint (the one not being edited). Passed to computeEditedEndpoint
		// to avoid the same anchor on a self-loop.
		const fixedEndpoint =
			endpointToUpdate === "source"
				? baseConnector.target
				: baseConnector.source;

		// Include the same object as a hover target too (self-loops allowed).
		const hoveredTarget = findConnectableHoverTarget({
			hovered: event.getHovered(),
			objects: state.objects,
		});

		// When the edited end lands free (no hover target), snap it onto the fixed end's exit
		// axis if nearly aligned, so a near-straight connector collapses to one straight segment.
		// Snapping the coordinate itself keeps the anchor handle, line, and arrow together.
		const fixedObj = resolveEndpointOwner(state.objects, fixedEndpoint);
		const cursor = hoveredTarget
			? event.last
			: snapFreeEndpointStraight(
					event.last,
					fixedEndpoint,
					fixedObj,
					SNAP_THRESHOLD_PX / state.viewport.zoom,
					this.readExtraConnectPoints(fixedObj, registries),
				);

		return computeEditedEndpoint(
			baseConnector,
			endpointToUpdate,
			cursor,
			hoveredTarget,
			fixedEndpoint,
			this.readAnchorSnapContext(
				hoveredTarget?.object,
				registries,
				state.viewport.zoom,
			),
		);
	}

	/**
	 * Handles dragging from a connection anchor.
	 * In edit mode, updates the entity (objects) directly; in create mode, updates pendingConnector.
	 */
	private handleDrag(
		state: CanvasControllerState,
		event: CanvasEvent,
		registries: ICanvasRegistries,
	): CanvasControllerState {
		// Determine which endpoint is being edited from targetPart
		// Format: "anchor:<pos>" (create) or "endpoint:<source|target>" (edit)
		const endpointToUpdate = getEditingEndpoint(event.targetPart);
		const { editingConnectorId } = state;

		// Edit mode: rewrite the entity directly, like polyline vertex editing (no overlay).
		// The base is the original connector from eventStartSnapshot, so the fixed side and intermediate points always keep their start-time values.
		if (editingConnectorId) {
			const baseConnector =
				state.eventStartSnapshot?.objects[editingConnectorId];
			if (!baseConnector || baseConnector.type !== "connector") {
				return state;
			}

			const base = baseConnector as ConnectorState;
			const updated = this.buildEditedConnector(
				state,
				event,
				base,
				endpointToUpdate,
				registries,
			);

			// Re-anchor parity with creation: when the connector has no explicit routing and
			// the edited endpoint's anchor actually changed, derive routing from the new anchors
			// (onto a center → straight, onto an edge → orthogonal). Gating on an actual anchor
			// change keeps a no-op grab (or a wiggle back to the start) from silently rewriting
			// routing; an explicit straight/orthogonal choice is always left intact.
			const baseEndpoint =
				endpointToUpdate === "source" ? base.source : base.target;
			const updatedEndpoint =
				endpointToUpdate === "source" ? updated.source : updated.target;
			const routed =
				updated.routing === undefined &&
				!isSameEndpoint(baseEndpoint, updatedEndpoint)
					? this.withAnchorDerivedRouting(updated)
					: updated;

			// COW view over the previous frame's map (rebased internally, #213)
			const updatedObjects = createCowObjects(state.objects);
			updatedObjects[editingConnectorId] = {
				...routed,
				id: editingConnectorId,
			};

			return {
				...state,
				objects: updatedObjects,
			};
		}

		// Create mode: update pendingConnector (the entity does not exist yet).
		const { pendingConnector } = state;
		if (!pendingConnector) {
			return state;
		}

		const updated = this.buildEditedConnector(
			state,
			event,
			pendingConnector,
			endpointToUpdate,
			registries,
		);

		return {
			...state,
			pendingConnector: this.withAnchorDerivedRouting(updated),
		};
	}

	/**
	 * Derives the routing default from the endpoints' anchors (center endpoint →
	 * straight, both connectPoint → orthogonal). Applied while creating a connector,
	 * and on re-anchor only when routing was never explicitly set (the caller gates
	 * on `routing === undefined`), so an explicit straight/orthogonal choice is kept.
	 * Rebuilt each drag frame so a "straight" set on a prior frame is dropped once
	 * the endpoint moves off a center anchor (orthogonal is the field's absence).
	 */
	private withAnchorDerivedRouting(connector: ConnectorState): ConnectorState {
		const routing = defaultRoutingForAnchors(
			connector.source.anchor,
			connector.target.anchor,
		);
		const { routing: _prev, ...rest } = connector;
		return (
			routing !== undefined ? { ...rest, routing } : rest
		) as ConnectorState;
	}

	/**
	 * Handles drag end on a connection anchor.
	 * If there is a hovered object, commit the connector to it; otherwise commit as a FreeAnchor.
	 */
	private handleDragEnd(
		state: CanvasControllerState,
		event: CanvasEvent,
		registries: ICanvasRegistries,
	): CanvasControllerState {
		const { editingConnectorId } = state;

		// Edit mode: the entity has been edited directly. Apply the final state and decide whether to commit.
		if (editingConnectorId) {
			const original = state.eventStartSnapshot?.objects[editingConnectorId];

			// If the endpoint has not effectively changed since the start, it is a no-op.
			// Leaving objects as-is (during handleDrag the entity ends at final position = start position)
			// avoids handleGesture's auto-commit detection (a change in the objects reference) so nothing is pushed to history.
			const finalConnector = this.handleDrag(state, event, registries).objects[
				editingConnectorId
			];

			// Invariant guard: if committing the edit would make both ends free, discard the edit and revert.
			// Normally unreachable since the UI (ConnectorControls) hides the owned-end handle, but this
			// defensively guarantees a connector always has "at least one owned end".
			if (
				finalConnector?.type === "connector" &&
				isFreeEndpointRef((finalConnector as ConnectorState).source) &&
				isFreeEndpointRef((finalConnector as ConnectorState).target)
			) {
				return {
					...state,
					objects:
						original?.type === "connector"
							? { ...state.objects, [editingConnectorId]: original }
							: state.objects,
					editingConnectorId: null,
					editingEndpoint: null,
					edgeScrollEnabled: false,
				};
			}

			const isNoOp =
				original?.type === "connector" &&
				finalConnector?.type === "connector" &&
				isSameConnectorEndpoints(
					original as ConnectorState,
					finalConnector as ConnectorState,
				);

			if (isNoOp) {
				return {
					...state,
					editingConnectorId: null,
					editingEndpoint: null,
					edgeScrollEnabled: false,
				};
			}

			// If the endpoint changed, commit the entity update (commitVersion is auto-incremented
			// by handleGesture detecting the objects change, so it is not incremented here).
			const dragResult = this.handleDrag(state, event, registries);
			return {
				...dragResult,
				editingConnectorId: null,
				editingEndpoint: null,
				edgeScrollEnabled: false,
			};
		}

		// Create mode: commit pendingConnector.
		const { pendingConnector } = state;
		if (!pendingConnector) {
			return {
				...state,
				edgeScrollEnabled: false,
			};
		}

		const dragResult = this.handleDrag(state, event, registries);
		const finalConnector = dragResult.pendingConnector;
		if (!finalConnector) {
			return {
				...dragResult,
				edgeScrollEnabled: false,
				editingEndpoint: null,
			};
		}

		return {
			...dragResult,
			objects: {
				...dragResult.objects,
				[finalConnector.id]: finalConnector,
			},
			// Insert a new connector at the front, treated like a shape (front is the universal default for new creation).
			// rootIds is in back→front order, so append to the end.
			rootIds: [...dragResult.rootIds, finalConnector.id],
			pendingConnector: null,
			editingEndpoint: null,
			edgeScrollEnabled: false,
			commitVersion: state.commitVersion + 1,
		};
	}
}
