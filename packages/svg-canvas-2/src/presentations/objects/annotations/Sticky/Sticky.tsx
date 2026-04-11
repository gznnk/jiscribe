import type React from "react";
import { memo } from "react";

import type { StickyState } from "../../../../states/objects/annotations/sticky/StickyState";
import { createSvgTransform } from "../../utils/createSvgTransform";

type StickyProps = StickyState;

const FOLD_SIZE = 12;

const StickyComponent: React.FC<StickyProps> = ({
	id,
	cx,
	cy,
	width,
	height,
	scaleX,
	scaleY,
	rotation,
	fill,
	stroke,
	strokeWidth,
}) => {
	const transformAttr = createSvgTransform(scaleX, scaleY, rotation, cx, cy);
	const x = -width / 2;
	const y = -height / 2;
	const foldX = x + width - FOLD_SIZE;
	const foldY = y + FOLD_SIZE;
	const resolvedFill = fill ?? "#fef08a";

	const bodyPath = [
		`M ${x} ${y}`,
		`L ${foldX} ${y}`,
		`L ${x + width} ${foldY}`,
		`L ${x + width} ${y + height}`,
		`L ${x} ${y + height}`,
		`Z`,
	].join(" ");

	const foldPath = [
		`M ${foldX} ${y}`,
		`L ${foldX} ${foldY}`,
		`L ${x + width} ${foldY}`,
		`Z`,
	].join(" ");

	return (
		<g
			data-kind="object"
			data-id={id}
			transform={transformAttr}
			style={{ cursor: "grab" }}
		>
			<path
				d={bodyPath}
				fill={resolvedFill}
				stroke={stroke}
				strokeWidth={strokeWidth}
				strokeLinejoin="round"
			/>
			<path
				d={foldPath}
				fill={resolvedFill}
				stroke={stroke}
				strokeWidth={strokeWidth}
				strokeLinejoin="round"
				opacity={0.6}
			/>
		</g>
	);
};

export const Sticky = memo(StickyComponent);
