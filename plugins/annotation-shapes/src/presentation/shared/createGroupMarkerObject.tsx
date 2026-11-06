import { BODY_TEXT_SLOT_ID } from "@jiscribe/canvas";
import {
	createFrameObject,
	readTextSlot,
	useObjectTextStyleDefaultsRegistry,
} from "@jiscribe/canvas-sdk";
import type React from "react";

import { GroupMarkerHitArea, GroupMarkerPath } from "./GroupMarkerStyled";
import { calcGroupMarkerLabelRegion } from "../../schema/shared/calcGroupMarkerLabelRegion";
import type { GroupMarkerDirection } from "../../schema/shared/GroupMarkerFields";
import {
	resolveGroupMarkerDirection,
	resolveGroupMarkerTipPosition,
} from "../../schema/shared/groupMarkerGeometry";
import type { BraceState } from "../../state/brace/BraceState";
import type { BracketState } from "../../state/bracket/BracketState";
import type { BracketWithStemState } from "../../state/bracketWithStem/BracketWithStemState";

/** Every state this renderer draws; a marker without a movable tip simply has no `tipPosition`. */
type GroupMarkerState = BraceState | BracketState | BracketWithStemState;

/**
 * Builds one marker's path for a box whose top-left corner is at (x, y). A
 * builder whose shape has no movable tip declares fewer parameters and ignores
 * the position it is handed.
 */
type GroupMarkerPathBuilder = (
	x: number,
	y: number,
	width: number,
	height: number,
	direction: GroupMarkerDirection,
	tipPosition: number,
) => string;

/**
 * The grab area over the label, placed where the core places the label's text
 * (calcGroupMarkerLabelRegion, measured with the type's own body defaults). An
 * empty label draws nothing, so it gets no area.
 */
const GroupMarkerLabelHitArea: React.FC<{ state: GroupMarkerState }> = ({
	state,
}) => {
	const typeDefaults = useObjectTextStyleDefaultsRegistry().get(
		state.type,
		BODY_TEXT_SLOT_ID,
	);
	if (readTextSlot(state.text, BODY_TEXT_SLOT_ID) === "") {
		return null;
	}
	const label = calcGroupMarkerLabelRegion(
		state,
		state.text?.[BODY_TEXT_SLOT_ID],
		typeDefaults,
	);
	return (
		<GroupMarkerHitArea
			x={label.x}
			y={label.y}
			width={label.width}
			height={label.height}
		/>
	);
};

/**
 * Creates a group marker's renderer from its path builder (Frame-family shared
 * logic lives in createFrameObject; only the shape is swapped in). It draws its
 * own group rather than going through the default single-path renderer, because
 * the marker needs two grab areas beside it: the box, since the line alone is a
 * few px wide, and the label, which hangs outside the box entirely
 * (calcGroupMarkerLabelRegion).
 *
 * @param buildPath The type's own path, in local coordinates with the shape's center as origin.
 * @returns The component to register as the type's `component`.
 */
export const createGroupMarkerObject = (buildPath: GroupMarkerPathBuilder) =>
	createFrameObject<GroupMarkerState>((state, shape) => (
		<g
			data-kind={shape["data-kind"]}
			data-id={shape["data-id"]}
			transform={shape.transform}
		>
			<GroupMarkerHitArea
				x={-state.width / 2}
				y={-state.height / 2}
				width={state.width}
				height={state.height}
			/>
			<GroupMarkerLabelHitArea state={state} />
			<GroupMarkerPath
				d={buildPath(
					-state.width / 2,
					-state.height / 2,
					state.width,
					state.height,
					resolveGroupMarkerDirection(state),
					resolveGroupMarkerTipPosition(state),
				)}
				strokeColor={shape.strokeColor}
				strokeAlpha={shape.strokeAlpha}
				strokeWidth={shape.strokeWidth}
				strokeDasharray={shape.strokeDasharray}
			/>
		</g>
	));
