import { BODY_TEXT_SLOT_ID } from "@workspace/canvas";
import { createFrameObject, readTextSlot } from "@workspace/canvas-sdk";

import { calcGroupMarkerTextRegion } from "./calcGroupMarkerTextRegion";
import {
	resolveGroupMarkerDirection,
	resolveGroupMarkerTipPosition,
} from "./groupMarkerGeometry";
import { GroupMarkerHitArea, GroupMarkerPath } from "./GroupMarkerStyled";
import type { GroupMarkerDirection } from "../../schema/shared/GroupMarkerFields";
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
 * Creates a group marker's renderer from its path builder (Frame-family shared
 * logic lives in createFrameObject; only the shape is swapped in). It draws its
 * own group rather than going through the default single-path renderer, because
 * the marker needs two grab areas beside it: the box, since the line alone is a
 * few px wide, and the label, which hangs outside the box entirely
 * (calcGroupMarkerTextRegion).
 *
 * @param buildPath The type's own path, in local coordinates with the shape's center as origin.
 * @returns The component to register as the type's `component`.
 */
export const createGroupMarkerObject = (buildPath: GroupMarkerPathBuilder) =>
	createFrameObject<GroupMarkerState>((state, shape) => {
		const label =
			readTextSlot(state.text, BODY_TEXT_SLOT_ID) === ""
				? null
				: calcGroupMarkerTextRegion(state, BODY_TEXT_SLOT_ID);
		return (
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
				{label !== null && (
					<GroupMarkerHitArea
						x={label.x}
						y={label.y}
						width={label.width}
						height={label.height}
					/>
				)}
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
					strokeWidth={shape.strokeWidth}
					strokeDasharray={shape.strokeDasharray}
				/>
			</g>
		);
	});
