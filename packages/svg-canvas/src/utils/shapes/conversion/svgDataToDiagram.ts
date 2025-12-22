import { circleElementToDiagram } from "./circleElementToDiagram";
import { ellipseElementToDiagram } from "./ellipseElementToDiagram";
import { lineElementToDiagram } from "./lineElementToDiagram";
import { rectElementToDiagram } from "./rectElementToDiagram";
import type { Diagram } from "../../../types/state/core/Diagram";
import type { GroupState } from "../../../types/state/shapes/GroupState";
import { calcUnrotatedItemableBoundingBox } from "../../core/calcUnrotatedItemableBoundingBox";
import { nanToZero } from "../../math/common/nanToZero";
import { newId } from "../common/newId";

/**
 * SVG data string to Diagram data.
 *
 * @param data - SVG data string
 * @returns Converted diagram data
 */
export const svgDataToDiagram = (data: string): GroupState => {
	const parser = new DOMParser();
	const svgDoc = parser.parseFromString(data, "image/svg+xml");
	const svgElement = svgDoc.documentElement;
	const newData: Diagram[] = [];

	for (const element of svgElement.children) {
		const tagName = element.tagName;
		try {
			if (tagName === "rect") {
				newData.push(rectElementToDiagram(element as SVGRectElement));
			} else if (tagName === "ellipse") {
				newData.push(ellipseElementToDiagram(element as SVGEllipseElement));
			} else if (tagName === "circle") {
				newData.push(circleElementToDiagram(element as SVGCircleElement));
			} else if (tagName === "line") {
				newData.push(lineElementToDiagram(element as SVGLineElement));
			} else {
				// throw new Error("Unsupported SVG element was found.");
			}
		} catch (e) {
			// Ignore the error and continue processing other elements.
			console.error(e);
		}
	}

	const boundingBox = calcUnrotatedItemableBoundingBox(newData);

	const ret = {
		id: newId(),
		type: "Group",
		x: boundingBox.left + nanToZero(boundingBox.left + boundingBox.right) / 2,
		y: boundingBox.top + nanToZero(boundingBox.top + boundingBox.bottom) / 2,
		width: boundingBox.right - boundingBox.left,
		height: boundingBox.bottom - boundingBox.top,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
		keepProportion: false,
		isSelected: false,
		showOutline: false,
		items: newData,
	} as GroupState;

	// console.log("svgDataToDiagram", ret);

	return ret;
};
