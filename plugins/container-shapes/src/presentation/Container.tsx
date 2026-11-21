import { createFrameObject } from "@jiscribe/canvas-sdk";

import { calcContainerHeaderBand } from "./calcContainerHeaderBand";
import {
	ContainerBody,
	ContainerDivider,
	ContainerHeader,
	ContainerOutline,
	ContainerOutlineHitArea,
} from "./ContainerStyled";
import type { ContainerState } from "../state/ContainerState";

/**
 * Container ("frame") presentation. Shared Frame logic (transform, color
 * resolution, header-band text via calcContainerTextRegion, memo) lives in
 * createFrameObject; here we draw the box as a header band + pass-through body
 * + border. The wrapping <g> carries the object's data-kind/data-id, so a click
 * on any capturing sub-part resolves to this container (getGestureTarget).
 */
export const Container = createFrameObject<ContainerState>((state, shape) => {
	const {
		"data-kind": dataKind,
		"data-id": dataId,
		transform,
		strokeColor,
		strokeAlpha,
		fillColor,
		fillAlpha,
		strokeWidth,
		strokeDasharray,
	} = shape;

	const { width, height } = state;
	const x = -width / 2;
	const y = -height / 2;
	const headerBand = calcContainerHeaderBand(state, fillAlpha);
	const headerHeight = headerBand.rect.height;

	return (
		<g data-kind={dataKind} data-id={dataId} transform={transform}>
			<ContainerBody
				x={x}
				y={y}
				width={width}
				height={height}
				fillColor={fillColor}
				fillAlpha={fillAlpha}
			/>
			<ContainerHeader
				x={headerBand.rect.x}
				y={headerBand.rect.y}
				width={headerBand.rect.width}
				height={headerBand.rect.height}
				fillColor={headerBand.fill}
				fillAlpha={headerBand.fillOpacity}
			/>
			<ContainerDivider
				x1={x}
				y1={y + headerHeight}
				x2={x + width}
				y2={y + headerHeight}
				strokeColor={strokeColor}
				strokeAlpha={strokeAlpha}
				strokeWidth={strokeWidth}
				strokeDasharray={strokeDasharray}
			/>
			<ContainerOutlineHitArea x={x} y={y} width={width} height={height} />
			<ContainerOutline
				x={x}
				y={y}
				width={width}
				height={height}
				strokeColor={strokeColor}
				strokeAlpha={strokeAlpha}
				strokeWidth={strokeWidth}
				strokeDasharray={strokeDasharray}
			/>
		</g>
	);
});
