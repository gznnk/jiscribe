import {
	createFrameObject,
	resolveAutoColor,
} from "@workspace/canvas/unstable";

import { calcContainerHeaderHeight } from "./calcContainerHeaderHeight";
import {
	ContainerBody,
	ContainerDivider,
	ContainerHeader,
	ContainerOutline,
} from "./ContainerStyled";
import type { ContainerState } from "../state/ContainerState";

/**
 * Container ("frame") presentation. Shared Frame logic (transform, color
 * resolution, header-band text via calcContainerTextRegion, memo) lives in
 * createFrameObject; here we draw the box as a header band + pass-through body
 * + border. The wrapping <g> carries the object's data-kind/data-id, so a click
 * on any capturing sub-part resolves to this container (getKindAndId).
 */
export const Container = createFrameObject<ContainerState>((state, shape) => {
	const {
		"data-kind": dataKind,
		"data-id": dataId,
		transform,
		strokeColor,
		fillColor,
		strokeWidth,
		strokeDasharray,
	} = shape;

	const { width, height } = state;
	const x = -width / 2;
	const y = -height / 2;
	const headerHeight = calcContainerHeaderHeight(state);

	// Header band follows the same auto/color model as fill & stroke: "auto"
	// (the default) → theme surface; a set color → that color. Independent of
	// the body `fill` — no derivation, so it is a plain resettable field.
	const headerColor = resolveAutoColor(state.headerFill, "surface");

	return (
		<g data-kind={dataKind} data-id={dataId} transform={transform}>
			<ContainerBody
				x={x}
				y={y}
				width={width}
				height={height}
				fillColor={fillColor}
			/>
			<ContainerHeader
				x={x}
				y={y}
				width={width}
				height={headerHeight}
				fillColor={headerColor}
			/>
			<ContainerDivider
				x1={x}
				y1={y + headerHeight}
				x2={x + width}
				y2={y + headerHeight}
				strokeColor={strokeColor}
				strokeWidth={strokeWidth}
				strokeDasharray={strokeDasharray}
			/>
			<ContainerOutline
				x={x}
				y={y}
				width={width}
				height={height}
				strokeColor={strokeColor}
				strokeWidth={strokeWidth}
				strokeDasharray={strokeDasharray}
			/>
		</g>
	);
});
