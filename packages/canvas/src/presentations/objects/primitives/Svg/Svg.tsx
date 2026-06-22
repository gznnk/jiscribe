import DOMPurify from "dompurify";
import type React from "react";
import { memo, useEffect, useRef } from "react";

import { isValidSvgString } from "./isValidSvgString";
import { ERROR_SVG_ICON_STRING, SVG_NAMESPACE } from "./SvgConstants";
import { SvgContentGroup, SvgHitRect } from "./SvgStyled";
import type { SvgState } from "../../../../states/objects/primitives/svg/SvgState";
import { createSvgTransform } from "../../utils/createSvgTransform";

type SvgProps = SvgState;

const SvgComponent: React.FC<SvgProps> = ({
	id,
	cx,
	cy,
	width,
	height,
	scaleX,
	scaleY,
	rotation,
	svgText,
	naturalWidth,
	naturalHeight,
}) => {
	const contentRef = useRef<SVGGElement>(null);

	// 中身（外部から渡される SVG マークアップ）をサニタイズして注入する。
	// svgText/原寸が変わったときだけ再パースする。
	useEffect(() => {
		const group = contentRef.current;
		if (!group) {
			return;
		}

		let sanitized = DOMPurify.sanitize(svgText, { NAMESPACE: SVG_NAMESPACE });
		if (!isValidSvgString(sanitized)) {
			sanitized = ERROR_SVG_ICON_STRING;
		}

		const parser = new DOMParser();
		const svgElement = parser.parseFromString(
			sanitized,
			"image/svg+xml",
		).documentElement;
		// 内側スケールの基準を原寸に揃える。
		svgElement.setAttribute("width", `${naturalWidth}`);
		svgElement.setAttribute("height", `${naturalHeight}`);

		group.replaceChildren(svgElement);
	}, [svgText, naturalWidth, naturalHeight]);

	const transformAttr = createSvgTransform(scaleX, scaleY, rotation, cx, cy);
	// 原寸 0 でのゼロ除算を防ぐ。
	const sx = width / Math.max(naturalWidth, 1);
	const sy = height / Math.max(naturalHeight, 1);

	return (
		<g transform={transformAttr}>
			<SvgContentGroup
				ref={contentRef}
				transform={`translate(${-width / 2}, ${-height / 2}) scale(${sx}, ${sy})`}
			/>
			<SvgHitRect
				data-kind="object"
				data-id={id}
				x={-width / 2}
				y={-height / 2}
				width={width}
				height={height}
				tabIndex={0}
			/>
		</g>
	);
};

export const Svg = memo(SvgComponent);
