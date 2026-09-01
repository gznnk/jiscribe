import { createFrameObject } from "@jiscribe/canvas-sdk";
import { createElement } from "react";

import { calcIconArtPlacement } from "./calcIconArtPlacement";
import { IconArtGroup, IconHitArea, IconPlaceholderRect } from "./IconStyled";
import { readIconNodes } from "../schema/icon/resolveIconName";
import { DEFAULT_ICON_NAME, ICON_GRID_SIZE } from "../schema/IconDoc";
import type { IconState } from "../state/IconState";

/**
 * Icon presentation: the line art scaled uniformly to the smaller side of the box
 * and centred in it, over a transparent grab area covering the whole box (the art's
 * own strokes are far too thin to hit).
 *
 * A name that resolves to nothing draws a dashed stand-in. The parser rejects such a
 * name, so this only shows for a state assembled in memory — but drawing nothing at
 * all would leave an invisible, still-selectable object.
 */
export const Icon = createFrameObject<IconState>((state, shape) => {
	const { scale, offset, artStrokeWidth } = calcIconArtPlacement(
		state.width,
		state.height,
		shape.strokeWidth,
	);
	const artSize = ICON_GRID_SIZE * scale;
	const nodes = readIconNodes(state.icon ?? DEFAULT_ICON_NAME);

	return (
		<g
			data-kind={shape["data-kind"]}
			data-id={shape["data-id"]}
			transform={shape.transform}
		>
			<IconHitArea
				x={-state.width / 2}
				y={-state.height / 2}
				width={state.width}
				height={state.height}
			/>
			{scale > 0 && nodes !== null && (
				<IconArtGroup
					transform={`translate(${offset} ${offset}) scale(${scale})`}
					strokeColor={shape.strokeColor}
					strokeWidth={artStrokeWidth}
					strokeDasharray={shape.strokeDasharray}
				>
					{nodes.map(([tag, attrs], index) =>
						createElement(tag, { key: index, ...attrs }),
					)}
				</IconArtGroup>
			)}
			{scale > 0 && nodes === null && (
				<IconPlaceholderRect
					x={offset}
					y={offset}
					width={artSize}
					height={artSize}
					strokeColor={shape.strokeColor}
					strokeWidth={shape.strokeWidth}
				/>
			)}
		</g>
	);
});
