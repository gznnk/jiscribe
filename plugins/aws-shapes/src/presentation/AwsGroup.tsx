import { BODY_TEXT_SLOT_ID } from "@jiscribe/canvas";
import {
	createFrameObject,
	IconSetArt,
	IconSetArtGroup,
	readIconSetArt,
	readIconSetViewBoxSize,
	useObjectTextStyleDefaultsRegistry,
} from "@jiscribe/canvas-sdk";
import type React from "react";

import {
	AwsGroupBody,
	AwsGroupHeaderHitArea,
	AwsGroupOutline,
	AwsGroupOutlineHitArea,
} from "./AwsGroupStyled";
import { resolveAwsGroupStroke } from "./resolveAwsGroupStroke";
import { AWS_ICON_DRAWINGS } from "../drawing/iconDrawings.generated";
import {
	AWS_GROUP_CORNER_ICON_SIZE,
	AWS_GROUP_HEADER_HEIGHT,
	AWS_GROUP_PADDING,
} from "../schema/AwsGroupDoc";
import { readAwsGroupKindStyle } from "../schema/awsGroupKinds";
import { calcAwsGroupLabelRegion } from "../schema/calcAwsGroupLabelRegion";
import { awsIconCatalog } from "../schema/icon/awsIconCatalog";
import type { AwsGroupState } from "../state/AwsGroupState";

/**
 * The badge's row, grabbable out to the right edge (container's header band does
 * the same). A label taller than the row raises it, so the label is placed here
 * the way the core places its text: calcAwsGroupLabelRegion, measured with the
 * type's own body defaults.
 */
const AwsGroupHeader: React.FC<{ state: AwsGroupState }> = ({ state }) => {
	const typeDefaults = useObjectTextStyleDefaultsRegistry().get(
		state.type,
		BODY_TEXT_SLOT_ID,
	);
	const top = -state.height / 2;
	const labelRegion = calcAwsGroupLabelRegion(
		state,
		state.text?.[BODY_TEXT_SLOT_ID],
		typeDefaults,
	);
	const headerTop = Math.min(top + AWS_GROUP_PADDING, labelRegion.y);
	const headerBottom = Math.max(
		top + AWS_GROUP_HEADER_HEIGHT,
		labelRegion.y + labelRegion.height,
	);
	return (
		<AwsGroupHeaderHitArea
			x={-state.width / 2 + AWS_GROUP_PADDING}
			y={headerTop}
			width={Math.max(0, state.width - AWS_GROUP_PADDING * 2)}
			height={headerBottom - headerTop}
		/>
	);
};

/**
 * Draws awsGroup: the body, the border and the top-left corner badge, under two
 * invisible hit areas (the header row and the border itself). The label goes
 * into the band the doc definition's `labelRegion` (calcAwsGroupLabelRegion)
 * sizes from the text, drawn by createFrameObject.
 *
 * The colour and line style come from resolveAwsGroupStroke rather than from
 * `shape`: a type holds one default apiece, which cannot express nineteen kinds.
 */
export const AwsGroup = createFrameObject<AwsGroupState>((state, shape) => {
	const { width, height } = state;
	const left = -width / 2;
	const top = -height / 2;
	const { strokeColor, strokeDasharray } = resolveAwsGroupStroke(
		state.stroke,
		state.strokeDashType,
		state.kind,
		shape.strokeWidth,
	);
	const cornerIconName = readAwsGroupKindStyle(state.kind).cornerIcon;
	const cornerIcon =
		cornerIconName === undefined
			? null
			: readIconSetArt(awsIconCatalog, AWS_ICON_DRAWINGS, cornerIconName);
	const viewBox =
		cornerIcon === null
			? null
			: readIconSetViewBoxSize(cornerIcon.entry.viewBox);
	const cornerScale =
		viewBox === null || viewBox.width === 0
			? 0
			: AWS_GROUP_CORNER_ICON_SIZE / viewBox.width;

	return (
		<g
			data-kind={shape["data-kind"]}
			data-id={shape["data-id"]}
			transform={shape.transform}
		>
			<AwsGroupBody
				x={left}
				y={top}
				width={width}
				height={height}
				fillColor={shape.fillColor}
				fillAlpha={shape.fillAlpha}
			/>
			<AwsGroupHeader state={state} />
			{cornerIcon !== null && cornerScale > 0 && (
				<IconSetArtGroup
					transform={`translate(${left + AWS_GROUP_PADDING} ${top + AWS_GROUP_PADDING}) scale(${cornerScale})`}
				>
					<IconSetArt drawing={cornerIcon.drawing} />
				</IconSetArtGroup>
			)}
			<AwsGroupOutlineHitArea x={left} y={top} width={width} height={height} />
			<AwsGroupOutline
				x={left}
				y={top}
				width={width}
				height={height}
				strokeColor={strokeColor}
				strokeAlpha={shape.strokeAlpha}
				strokeWidth={shape.strokeWidth}
				strokeDasharray={strokeDasharray}
			/>
		</g>
	);
});
