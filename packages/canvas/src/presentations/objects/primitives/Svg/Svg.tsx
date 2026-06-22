import DOMPurify from "dompurify";
import type React from "react";
import { memo, useEffect, useMemo, useRef } from "react";

import { isValidSvgString } from "./isValidSvgString";
import { ERROR_SVG_ICON_STRING, SVG_NAMESPACE } from "./SvgConstants";
import { SvgContentGroup, SvgHitRect } from "./SvgStyled";
import type { SvgState } from "../../../../states/objects/primitives/svg/SvgState";
import { createSvgTransform } from "../../utils/createSvgTransform";

type SvgProps = SvgState;

/**
 * 長さ属性を数値として読む。単位なし / px のみ受け付け、% や em などは undefined。
 */
const parseLength = (value: string | null): number | undefined => {
	if (value === null || /%\s*$/.test(value)) {
		return undefined;
	}
	const parsed = Number.parseFloat(value);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

/**
 * 注入する SVG 要素をサニタイズして生成する。
 * viewBox が無ければ width/height 属性（無ければ既定値 100）から viewBox を合成し、
 * preserveAspectRatio="none" で box にぴったり伸縮させる。
 */
const buildSvgElement = (svgText: string): SVGElement => {
	let sanitized = DOMPurify.sanitize(svgText, { NAMESPACE: SVG_NAMESPACE });
	if (!isValidSvgString(sanitized)) {
		sanitized = ERROR_SVG_ICON_STRING;
	}

	const element = new DOMParser().parseFromString(sanitized, "image/svg+xml")
		.documentElement as unknown as SVGElement;

	if (!element.getAttribute("viewBox")) {
		const intrinsicWidth = parseLength(element.getAttribute("width")) ?? 100;
		const intrinsicHeight = parseLength(element.getAttribute("height")) ?? 100;
		element.setAttribute("viewBox", `0 0 ${intrinsicWidth} ${intrinsicHeight}`);
	}
	element.setAttribute("preserveAspectRatio", "none");

	return element;
};

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
}) => {
	const contentRef = useRef<SVGGElement>(null);

	// 中身のパース・サニタイズは svgText が変わったときだけ行う（リサイズでは再パースしない）。
	const svgElement = useMemo(() => buildSvgElement(svgText), [svgText]);

	// box ジオメトリ（位置・サイズ）を注入要素へ反映する。リサイズ時は属性更新のみ。
	useEffect(() => {
		const group = contentRef.current;
		if (!group) {
			return;
		}
		svgElement.setAttribute("x", `${-width / 2}`);
		svgElement.setAttribute("y", `${-height / 2}`);
		svgElement.setAttribute("width", `${width}`);
		svgElement.setAttribute("height", `${height}`);
		group.replaceChildren(svgElement);
	}, [svgElement, width, height]);

	const transformAttr = createSvgTransform(scaleX, scaleY, rotation, cx, cy);

	return (
		<g transform={transformAttr}>
			<SvgContentGroup ref={contentRef} />
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
