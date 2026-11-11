import { DocOperationError } from "@jiscribe/doc/ops/errors";
import { routeConnectors } from "@jiscribe/doc/ops/routing";
import { builtinObjectDocDefinitions } from "@jiscribe/doc/plugin/builtinObjectDocDefinitions";
import { resolveDocDefinitions } from "@jiscribe/doc/plugin/resolveDocDefinitions";

import { MIN_LAYOUT_NODES, hasLayoutScope } from "./resolveLayoutScope";
import type { CanvasPlugin } from "../../../../plugin/CanvasPlugin";
import {
	canvasToDoc,
	canvasToStateReusing,
} from "../../../../states/canvas/CanvasMapper";
import { isSameJsonValue } from "../../../../states/canvas/utils/isSameJsonValue";
import { isConnectorState } from "../../../../states/objects/connector/ConnectorState";
import {
	type GroupState,
	isGroupState,
} from "../../../../states/objects/primitives/group/GroupState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import type { CanvasRegistries } from "../../../registries/CanvasRegistries";
import type { ICanvasRegistries } from "../../../registries/ICanvasRegistries";
import { createMultiSelectGroup } from "../../../selection/readers/createMultiSelectGroup";
import { reconcileConnectorVertices } from "../../../utils/reconcileConnectorVertices";
import type { ExecutableCommand } from "../../CommandTypes";

export const ROUTE_CONNECTORS_COMMAND_ID = "routeConnectors";

type ReadDocDefinitions = () => ReturnType<typeof resolveDocDefinitions>;

/**
 * Whether there may be a connector to redraw, answered without measuring or routing
 * anything, since the sidebar asks on every frame of a drag: a selected connector, or
 * what hasLayoutScope accepts. A selection is answered at its first connector or at the
 * count of other objects hasLayoutScope settles for, so a large one costs no more than
 * a small one. A stand-in for what routeConnectors finds, so `execute` can still find
 * nothing (a selection of two shapes no connector joins).
 */
const hasRouteScope = (
	state: CanvasControllerState,
	registries: ICanvasRegistries,
): boolean => {
	let selectedShapeCount = 0;
	for (const id of state.selection.objectIds) {
		const object = state.objects[id];
		if (object === undefined) {
			continue;
		}
		if (isConnectorState(object)) {
			return true;
		}
		selectedShapeCount += 1;
		if (selectedShapeCount === MIN_LAYOUT_NODES) {
			return true;
		}
	}
	return hasLayoutScope(state, registries);
};

/**
 * Run routeConnectors over the document form of the state and commit what it wrote
 * in one commit, or return `state` itself when it wrote nothing that shows, so running
 * it twice leaves no empty history entry and asks for no save. A connector the op
 * could not route stays as it is, the others being redrawn; a DocOperationError from the
 * op cancels the whole run instead: nothing in scope is redrawn, `state` comes back and
 * the error's message goes to console.warn.
 */
const executeRouteConnectors = (
	state: CanvasControllerState,
	registries: ICanvasRegistries,
	readDocDefinitions: ReadDocDefinitions,
): CanvasControllerState => {
	const selectedIds = state.selection.objectIds;
	const referenceDoc = canvasToDoc(state, registries.objectMapper);
	// The mappers share `label` by reference and the op writes into it, which would
	// reach `state.objects` and the undo history.
	const routedDoc = structuredClone(referenceDoc);
	let connectorIds: string[];
	try {
		({ connectorIds } = routeConnectors(
			routedDoc,
			selectedIds.length > 0 ? selectedIds : undefined,
			readDocDefinitions(),
		));
	} catch (error) {
		// Thrown while building an end (an auto-height shape read as height 0), before
		// the op writes anything; executeCommand has no catch.
		if (error instanceof DocOperationError) {
			console.warn(
				`Command ${ROUTE_CONNECTORS_COMMAND_ID} changed nothing: ${error.message}`,
			);
			return state;
		}
		throw error;
	}

	const { state: routedCanvas } = canvasToStateReusing(
		routedDoc,
		registries.objectMapper,
		registries.objectContentResizer,
		{
			referenceDoc,
			committedObjects: state.objects,
			liveObjects: state.objects,
			remeasure: false,
		},
	);
	// Compared after the vertex pass the reducer runs on every commit, and only over
	// what the op wrote: that pass walks every connector, and the op stores `points: []`
	// where the reference has no key.
	const routed = reconcileConnectorVertices(
		{
			...state,
			objects: routedCanvas.objects,
			rootIds: routedCanvas.rootIds,
			opaqueObjects: routedCanvas.opaqueObjects,
		},
		registries,
	);
	if (
		isSameJsonValue(routed.rootIds, state.rootIds) &&
		connectorIds.every((id) =>
			isSameJsonValue(routed.objects[id], state.objects[id]),
		) &&
		Object.values(routed.objects).every(
			(object) =>
				!isGroupState(object) ||
				isSameJsonValue(
					object.childIds,
					(state.objects[object.id] as GroupState).childIds,
				),
		)
	) {
		return state;
	}

	const isSoleSelectionRedrawn =
		selectedIds.length === 1 && connectorIds.includes(selectedIds[0]);
	return {
		...routed,
		// A vertex part id is a position, so a surviving one would address another corner.
		selection: isSoleSelectionRedrawn
			? { ...state.selection, part: null }
			: state.selection,
		multiSelectGroup:
			state.multiSelectGroup === null
				? null
				: createMultiSelectGroup(
						selectedIds,
						routed.objects,
						registries,
						state.multiSelectGroup,
					),
		commitVersion: state.commitVersion + 1,
	};
};

/**
 * The command redrawing connectors around shapes that stay put: every connector with
 * nothing selected, or what the selection stands for (routeConnectors' `ids`).
 *
 * Per-canvas, as the op needs a document type table the registries do not hold.
 * Called before the plugins' object types are applied, so `objectMapper` carries the
 * built-ins this canvas maps and nothing else: a built-in it leaves out may be supplied
 * by a plugin, and listing it as well would be a duplicate type. The table is resolved
 * on the first run, so that a colliding plugin is still reported by
 * createCanvasRegistries' own check.
 *
 * @param registries - `objectMapper` is read here, once
 * @param plugins - The canvas's plugins, whose object types join the table
 */
export const createRouteConnectorsCommand = (
	registries: Pick<CanvasRegistries, "objectMapper">,
	plugins: readonly CanvasPlugin[] | undefined,
): ExecutableCommand => {
	const presetDefinitions = Object.fromEntries(
		Object.entries(builtinObjectDocDefinitions).filter(([type]) =>
			registries.objectMapper.hasType(type),
		),
	);
	let docDefinitions: ReturnType<ReadDocDefinitions> | undefined;
	const readDocDefinitions: ReadDocDefinitions = () => {
		docDefinitions ??= resolveDocDefinitions({ presetDefinitions, plugins });
		return docDefinitions;
	};
	return {
		id: ROUTE_CONNECTORS_COMMAND_ID,
		label: {
			en: "Redraw lines only (shapes stay put)",
			ja: "線だけ引き直す（図形は動かしません）",
		},
		busyLabel: { en: "Redrawing lines…", ja: "線を引き直しています…" },
		category: "arrange",
		canExecute: (state, canvasRegistries) =>
			state.mode.kind !== "textEdit" && hasRouteScope(state, canvasRegistries),
		execute: (state, canvasRegistries) =>
			executeRouteConnectors(state, canvasRegistries, readDocDefinitions),
	};
};
