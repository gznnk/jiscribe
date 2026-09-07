import { BelowLabelHitArea, createFrameObject } from "@jiscribe/canvas-sdk";

import { AwsIconArt } from "./AwsIconArt";
import {
	AwsArtGroup,
	AwsIconHitArea,
	AwsIconPlaceholderRect,
} from "./AwsIconStyled";
import {
	calcAwsIconArtPlacement,
	readViewBoxSize,
} from "./calcAwsIconArtPlacement";
import { DEFAULT_AWS_ICON_NAME } from "../schema/AwsIconDoc";
import { readAwsIcon } from "../schema/icon/resolveAwsIconName";
import type { AwsIconState } from "../state/AwsIconState";

/**
 * Draws awsIcon: the asset's viewBox scaled uniformly onto the box's shorter
 * side and centred, over a transparent hit area filling the box. The label hangs
 * outside the box (below it), so it needs a hit area of its own.
 *
 * A name that resolves to nothing draws a dashed frame instead. The parser
 * rejects those, so this only shows for a state assembled in memory.
 */
export const AwsIcon = createFrameObject<AwsIconState>((state, shape) => {
	const entry = readAwsIcon(state.icon ?? DEFAULT_AWS_ICON_NAME);
	const viewBox = entry === null ? null : readViewBoxSize(entry.viewBox);
	const { scale, offsetX, offsetY } = calcAwsIconArtPlacement(
		state.width,
		state.height,
		viewBox?.width ?? 0,
		viewBox?.height ?? 0,
	);

	return (
		<g
			data-kind={shape["data-kind"]}
			data-id={shape["data-id"]}
			transform={shape.transform}
		>
			<AwsIconHitArea
				x={-state.width / 2}
				y={-state.height / 2}
				width={state.width}
				height={state.height}
			/>
			{/* The label sits outside the box, past the reach of the area above. */}
			<BelowLabelHitArea state={state} />
			{entry !== null && scale > 0 && (
				<AwsArtGroup
					transform={`translate(${offsetX} ${offsetY}) scale(${scale})`}
				>
					<AwsIconArt entry={entry} />
				</AwsArtGroup>
			)}
			{entry === null && (
				<AwsIconPlaceholderRect
					x={-state.width / 2}
					y={-state.height / 2}
					width={state.width}
					height={state.height}
				/>
			)}
		</g>
	);
});
