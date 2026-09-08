import type { TransformedFrame } from "@jiscribe/geometry";
import {
	calcAffineTransformedPoint,
	calcFrameKeyPoints,
	calcInverseAffineTransformedPoint,
	degreesToRadians,
	isTransformedFrame,
} from "@jiscribe/geometry";

import { MIN_GROUP_DIMENSION } from "../../../constants/groupDimensions";
import type { TransformState } from "../../../states/objects/base/TransformState";
import { isTransformState } from "../../../states/objects/base/TransformState";
import type { GroupState } from "../../../states/objects/primitives/group/GroupState";
import {
	rotateChildren,
	transformChildren,
} from "../../behaviors/primitives/GroupController";
import type { CanvasControllerState } from "../../CanvasTypes";
import { calcAnchorResize } from "../../gestures/handlers/controls/transform/utils/calcAnchorResize";
import { calcMultiSelectGroupBounds } from "../../gestures/handlers/controls/transform/utils/calcMultiSelectGroupBounds";
import { dropAutoHeightOnResize } from "../../gestures/handlers/controls/transform/utils/dropAutoHeightOnResize";
import {
	calcHeightWithAspectRatio,
	calcWidthWithAspectRatio,
} from "../../gestures/handlers/controls/transform/utils/enforceResizeDimensions";
import type { ICanvasRegistries } from "../../registries/ICanvasRegistries";
import { createCowObjects } from "../../utils/cowObjects";
import { moveSelection } from "../../utils/moveSelection";
import { normalizeRotation } from "../../utils/normalizeRotation";
import { updateAffectedGroupBounds } from "../../utils/updateAffectedGroupBounds";
import { updateGroupBoundsForSelection } from "../../utils/updateGroupBoundsForSelection";
import type { TransformProperty } from "../CanvasActions";

/** The frame the transform handles are drawn around, and how it is reached. */
type TransformTarget = {
	/** The selected object's own frame, or the multiSelectGroup's for a multi-selection. */
	frame: TransformedFrame & TransformState;
	/** The id in `state.objects` to write back to; null when the frame is the multiSelectGroup. */
	selectedId: string | null;
	/** Whether the children to carry along are the multi-selection rather than one object's. */
	isMultiSelect: boolean;
	/** Whether the frame scales children when it resizes (a group, or the multiSelectGroup). */
	isGroupTarget: boolean;
};

/**
 * The resize a stated size stands in for, as far as the drag utilities read it:
 * a size typed into a field holds no modifier, so only `lockAspectRatio` can
 * couple the two axes.
 */
const STATED_RESIZE_INTENT = {
	mods: { shift: false, alt: false, ctrl: false, meta: false },
} as const;

/**
 * The anchor whose drag each size edit stands in for. Both resize about the
 * top-left, but they differ in what a height following the text survives: a
 * width edit re-wraps that text (`dropAutoHeightOnResize` leaves the flag on a
 * left/right handle), a height edit states the height outright.
 */
const RESIZE_INTENT_ANCHOR = {
	width: "rightCenter",
	height: "bottomRight",
} as const;

/**
 * Resolves the frame the transform handles show for the current selection.
 * Returns null for the selections that carry no such frame: nothing selected, a
 * connector (its shape is its vertices, not a frame), and a single object whose
 * type has no frame.
 */
const resolveTransformTarget = (
	state: CanvasControllerState,
): TransformTarget | null => {
	if (state.selectedConnectorId != null) {
		return null;
	}
	if (state.selectedIds.length > 1) {
		const multiSelectGroup = state.multiSelectGroup;
		if (
			!multiSelectGroup ||
			!isTransformedFrame(multiSelectGroup) ||
			!isTransformState(multiSelectGroup)
		) {
			return null;
		}
		return {
			frame: multiSelectGroup,
			selectedId: null,
			isMultiSelect: true,
			isGroupTarget: true,
		};
	}
	if (state.selectedIds.length !== 1) {
		return null;
	}
	const selectedId = state.selectedIds[0];
	const selectedObject = state.objects[selectedId];
	if (
		!selectedObject ||
		!isTransformedFrame(selectedObject) ||
		!isTransformState(selectedObject)
	) {
		return null;
	}
	return {
		frame: selectedObject,
		selectedId,
		isMultiSelect: false,
		isGroupTarget: selectedObject.type === "group",
	};
};

/**
 * Writes a frame that has already been resized back over the selection, scaling
 * the children it carries. Mirrors the transform drag's own application of a
 * resize result, sourcing from the live objects rather than the drag snapshot.
 */
const applyResizedFrame = (
	state: CanvasControllerState,
	target: TransformTarget,
	startFrame: TransformedFrame & TransformState,
	updatedFrame: TransformedFrame & TransformState,
	registries: ICanvasRegistries,
): CanvasControllerState => {
	const srcObjects = state.objects;
	const updatedObjects = createCowObjects(srcObjects);

	if (target.isMultiSelect) {
		const startGroup = startFrame as GroupState;
		const updatedGroup: GroupState = { ...startGroup, ...updatedFrame };
		Object.assign(
			updatedObjects,
			transformChildren(
				startGroup,
				updatedGroup,
				startGroup,
				srcObjects,
				registries.objectBehavior,
			),
		);
		const nextState: CanvasControllerState = {
			...state,
			objects: updatedObjects,
			multiSelectGroup: updatedGroup,
		};
		// The multiSelectGroup wraps what the children now occupy, which a scale
		// about the top-left does not leave proportional to the frame it was asked
		// for (a rotated leaf sticks out further than its own box).
		const recalculatedBounds = calcMultiSelectGroupBounds(
			state.selectedIds,
			nextState.objects,
			updatedGroup,
		);
		if (!recalculatedBounds) {
			return nextState;
		}
		return {
			...nextState,
			multiSelectGroup: { ...updatedGroup, ...recalculatedBounds },
		};
	}

	const selectedId = target.selectedId;
	if (selectedId === null) {
		return state;
	}
	const startObject = srcObjects[selectedId];
	if (!startObject) {
		return state;
	}
	const updatedObject = { ...startObject, ...updatedFrame };
	updatedObjects[selectedId] = updatedObject;
	if (updatedObject.type === "group") {
		Object.assign(
			updatedObjects,
			transformChildren(
				startObject as GroupState,
				updatedObject as GroupState,
				updatedObject as GroupState,
				srcObjects,
				registries.objectBehavior,
			),
		);
	}
	return { ...state, objects: updatedObjects };
};

/** Moves the whole selection so the frame's top-left corner lands on the stated coordinate. */
const applyStatedPosition = (
	state: CanvasControllerState,
	target: TransformTarget,
	property: "x" | "y",
	value: number,
	registries: ICanvasRegistries,
): CanvasControllerState => {
	const topLeft = calcFrameKeyPoints(target.frame).topLeft;
	const currentValue = property === "x" ? topLeft.x : topLeft.y;
	if (value === currentValue) {
		return state;
	}
	const offset = value - currentValue;
	const { objects, multiSelectGroup } = moveSelection({
		selectedIds: state.selectedIds,
		srcObjects: state.objects,
		srcMultiSelectGroup: state.multiSelectGroup,
		delta: property === "x" ? { x: offset, y: 0 } : { x: 0, y: offset },
		objectBehavior: registries.objectBehavior,
	});
	// A moved selection carries its own groups along, so only the ancestors it
	// hangs from are left to re-derive (the nudge commands settle the same set).
	return updateAffectedGroupBounds(
		{ ...state, objects, multiSelectGroup },
		state.selectedIds,
	);
};

/** Resizes the frame about its top-left corner to the stated width or height. */
const applyStatedSize = (
	state: CanvasControllerState,
	target: TransformTarget,
	property: "width" | "height",
	value: number,
	registries: ICanvasRegistries,
): CanvasControllerState => {
	if (value <= 0) {
		return state;
	}
	const currentValue =
		property === "width" ? target.frame.width : target.frame.height;
	if (value === currentValue) {
		return state;
	}

	// A stated height is the user stating it, exactly as a handle drag is; the
	// flag has to go before the frame below is read, since the derivation would
	// otherwise put the old height straight back.
	const settledState = dropAutoHeightOnResize(
		state,
		STATED_RESIZE_INTENT,
		RESIZE_INTENT_ANCHOR[property],
	);
	const settledTarget = resolveTransformTarget(settledState);
	if (!settledTarget) {
		return state;
	}

	// GroupState invariant: a group's size divides when its children scale, so it
	// may never be driven to 0 — the same floor the transform drag applies.
	const startFrame: TransformedFrame & TransformState =
		settledTarget.isGroupTarget
			? {
					...settledTarget.frame,
					minWidth: Math.max(
						settledTarget.frame.minWidth ?? 0,
						MIN_GROUP_DIMENSION,
					),
					minHeight: Math.max(
						settledTarget.frame.minHeight ?? 0,
						MIN_GROUP_DIMENSION,
					),
				}
			: settledTarget.frame;

	const aspectRatio =
		startFrame.width !== 0 && startFrame.height !== 0
			? startFrame.width / startFrame.height
			: undefined;
	const doKeepProportion =
		(startFrame.lockAspectRatio ?? false) && aspectRatio !== undefined;

	// The axis that was not stated follows the ratio when it is locked, and holds
	// still otherwise.
	let statedWidth = startFrame.width;
	let statedHeight = startFrame.height;
	if (property === "width") {
		statedWidth = value;
		statedHeight =
			doKeepProportion && aspectRatio !== undefined
				? calcHeightWithAspectRatio(value, aspectRatio)
				: startFrame.height;
	} else {
		statedHeight = value;
		statedWidth =
			doKeepProportion && aspectRatio !== undefined
				? calcWidthWithAspectRatio(value, aspectRatio)
				: startFrame.width;
	}

	const radians = degreesToRadians(startFrame.rotation);
	const startFrameKeyPoints = calcFrameKeyPoints(startFrame);
	const localTopLeft = calcInverseAffineTransformedPoint(
		startFrameKeyPoints.topLeft.x,
		startFrameKeyPoints.topLeft.y,
		1,
		1,
		radians,
		startFrame.cx,
		startFrame.cy,
	);
	// Where a bottomRight drag would have to end for the frame to come out at the
	// stated size: the corner opposite the fixed top-left. Signed by the flip, so
	// a mirrored shape stays mirrored instead of the sign being read as a fold.
	const statedCorner = calcAffineTransformedPoint(
		localTopLeft.x + startFrame.scaleX * statedWidth,
		localTopLeft.y + startFrame.scaleY * statedHeight,
		1,
		1,
		radians,
		startFrame.cx,
		startFrame.cy,
	);

	const resizeResult = calcAnchorResize(
		"bottomRight",
		startFrame,
		statedCorner.x,
		statedCorner.y,
		startFrameKeyPoints,
		radians,
		aspectRatio,
		doKeepProportion,
	);
	if (!resizeResult) {
		return state;
	}

	const newCenter = calcAffineTransformedPoint(
		resizeResult.inversedCenterX,
		resizeResult.inversedCenterY,
		1,
		1,
		radians,
		startFrame.cx,
		startFrame.cy,
	);
	const updatedFrame: TransformedFrame & TransformState = {
		...startFrame,
		width: Math.abs(resizeResult.width),
		height: Math.abs(resizeResult.height),
		cx: newCenter.x,
		cy: newCenter.y,
		scaleX: resizeResult.scaleX,
		scaleY: resizeResult.scaleY,
	};

	return applyResizedFrame(
		settledState,
		settledTarget,
		startFrame,
		updatedFrame,
		registries,
	);
};

/** Turns the frame to the stated angle, carrying the children it rotates with it. */
const applyStatedRotation = (
	state: CanvasControllerState,
	target: TransformTarget,
	value: number,
	registries: ICanvasRegistries,
): CanvasControllerState => {
	const newRotation = normalizeRotation(value);
	if (newRotation === target.frame.rotation) {
		return state;
	}
	const updatedObjects = createCowObjects(state.objects);

	if (target.isMultiSelect) {
		const startGroup = target.frame as GroupState;
		const updatedGroup: GroupState = { ...startGroup, rotation: newRotation };
		Object.assign(
			updatedObjects,
			rotateChildren(
				startGroup,
				newRotation,
				updatedGroup,
				updatedObjects,
				registries.objectBehavior,
			),
		);
		return {
			...state,
			objects: updatedObjects,
			multiSelectGroup: updatedGroup,
		};
	}

	const selectedId = target.selectedId;
	if (selectedId === null) {
		return state;
	}
	const startObject = state.objects[selectedId];
	if (!startObject) {
		return state;
	}
	const updatedObject = { ...startObject, rotation: newRotation };
	updatedObjects[selectedId] = updatedObject;
	if (updatedObject.type === "group") {
		Object.assign(
			updatedObjects,
			rotateChildren(
				startObject as GroupState,
				newRotation,
				updatedObject as GroupState,
				state.objects,
				registries.objectBehavior,
			),
		);
	}
	return { ...state, objects: updatedObjects };
};

/**
 * Whether a stated value could be applied at all: the selection carries a frame
 * and the value is one the property takes. Says nothing about whether the frame
 * already holds the value — which is what the reducer needs to tell apart: a
 * commit of a value the frame holds is the normal end of a typed edit (the
 * preview applied it already) and is recorded, while a value nothing could take
 * is a no-op whether previewed or committed.
 *
 * @param state - The state whose selection names the frame
 * @param property - Which of the frame's five numbers is being stated
 * @param value - World units, `rotation` in degrees; sizes must be finite and above 0, the rest finite
 */
export const canApplyTransformProperty = (
	state: CanvasControllerState,
	property: TransformProperty,
	value: number,
): boolean => {
	if (!Number.isFinite(value)) {
		return false;
	}
	if ((property === "width" || property === "height") && value <= 0) {
		return false;
	}
	return resolveTransformTarget(state) !== null;
};

/**
 * States one number of the selection's transform frame outright, landing the
 * selection where the matching handle drag would have left it.
 *
 * The frame is the selected object's, or the multiSelectGroup's for a
 * multi-selection — the one the transform handles are drawn around. `x` / `y`
 * name its top-left corner in world coordinates and move the whole selection by
 * the difference; `width` / `height` resize it about that corner, honouring
 * `lockAspectRatio` and the minimum dimensions; `rotation` turns it about its
 * center.
 *
 * @param state - The state to edit; its selection names the frame, and nothing else is read
 * @param property - Which of the frame's five numbers is being stated
 * @param value - World units, `rotation` in degrees; sizes must be finite and above 0
 * @param registries - Per-canvas registries, for the per-shape move / transform / rotate behaviors
 * @returns `state` itself when the selection carries no frame (nothing, or a connector), when the
 *   value is not usable, and when it is the one the frame already has
 */
export const handleTransformPropertyUpdate = (
	state: CanvasControllerState,
	property: TransformProperty,
	value: number,
	registries: ICanvasRegistries,
): CanvasControllerState => {
	if (!canApplyTransformProperty(state, property, value)) {
		return state;
	}
	const target = resolveTransformTarget(state);
	if (!target) {
		return state;
	}

	let updatedState: CanvasControllerState;
	switch (property) {
		case "x":
		case "y":
			updatedState = applyStatedPosition(
				state,
				target,
				property,
				value,
				registries,
			);
			break;
		case "width":
		case "height":
			updatedState = applyStatedSize(
				state,
				target,
				property,
				value,
				registries,
			);
			break;
		case "rotation":
			updatedState = applyStatedRotation(state, target, value, registries);
			break;
	}

	if (updatedState === state) {
		return state;
	}
	return updateGroupBoundsForSelection(updatedState);
};
