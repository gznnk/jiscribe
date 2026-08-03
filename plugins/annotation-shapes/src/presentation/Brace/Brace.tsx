import { BODY_TEXT_SLOT_ID } from "@workspace/canvas";
import { createFrameObject, readTextSlot } from "@workspace/canvas/unstable";

import {
	resolveBraceDirection,
	resolveBraceTipPosition,
} from "./braceGeometry";
import { BraceCurve, BraceHitArea } from "./BraceStyled";
import { buildBracePath } from "./buildBracePath";
import { calcBraceTextRegion } from "./calcBraceTextRegion";
import type { BraceState } from "../../state/brace/BraceState";

/**
 * Renders a brace (Frame-family shared logic lives in createFrameObject; only
 * the shape is swapped in). It draws its own group rather than going through the
 * default single-path renderer, because the bracket needs two grab areas beside
 * it: the box, since the curve alone is a few px wide, and the label, which
 * hangs outside the box entirely (calcBraceTextRegion).
 */
export const Brace = createFrameObject<BraceState>((state, shape) => {
	const label =
		readTextSlot(state.text, BODY_TEXT_SLOT_ID) === ""
			? null
			: calcBraceTextRegion(state, BODY_TEXT_SLOT_ID);
	return (
		<g
			data-kind={shape["data-kind"]}
			data-id={shape["data-id"]}
			transform={shape.transform}
		>
			<BraceHitArea
				x={-state.width / 2}
				y={-state.height / 2}
				width={state.width}
				height={state.height}
			/>
			{label !== null && (
				<BraceHitArea
					x={label.x}
					y={label.y}
					width={label.width}
					height={label.height}
				/>
			)}
			<BraceCurve
				d={buildBracePath(
					-state.width / 2,
					-state.height / 2,
					state.width,
					state.height,
					resolveBraceDirection(state),
					resolveBraceTipPosition(state),
				)}
				strokeColor={shape.strokeColor}
				strokeWidth={shape.strokeWidth}
				strokeDasharray={shape.strokeDasharray}
			/>
		</g>
	);
});
