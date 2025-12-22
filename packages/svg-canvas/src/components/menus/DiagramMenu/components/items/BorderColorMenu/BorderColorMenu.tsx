import type React from "react";
import { memo } from "react";

import { useDiagramUpdateRecursively } from "../../../../../../hooks/useDiagramUpdateRecursively";
import type { Diagram } from "../../../../../../types/state/core/Diagram";
import { isTransparentColor } from "../../../../../../utils/core/isTransparentColor";
import { isStrokableState } from "../../../../../../utils/validation/isStrokableState";
import { DiagramMenuPositioner } from "../../../DiagramMenuStyled";
import { getFirstNonGroupDiagram } from "../../../utils/getFirstNonGroupDiagram";
import { ColorPicker } from "../../common/ColorPicker";
import { DiagramMenuButton } from "../../common/DiagramMenuButton/DiagramMenuButton";

type BorderColorMenuProps = {
	isOpen: boolean;
	onToggle: () => void;
	selectedDiagrams: Diagram[];
};

/**
 * BorderColorMenu component.
 * Displays a hollow circle icon with the current border color and opens a color picker.
 */
const BorderColorMenuComponent: React.FC<BorderColorMenuProps> = ({
	isOpen,
	onToggle,
	selectedDiagrams,
}) => {
	const applyDiagramUpdate = useDiagramUpdateRecursively();

	// Get the first non-Group diagram and check if it's strokeable
	const firstDiagram = getFirstNonGroupDiagram(selectedDiagrams);
	const strokeableDiagram =
		firstDiagram && isStrokableState(firstDiagram) ? firstDiagram : null;

	const currentColor = strokeableDiagram?.stroke || "transparent";

	const handleColorChange = (color: string) => {
		applyDiagramUpdate({
			items: selectedDiagrams,
			data: { stroke: color },
			skipHistory: true,
		});
	};

	const handleColorChangeCommit = (color: string) => {
		applyDiagramUpdate({
			items: selectedDiagrams,
			data: { stroke: color },
		});
	};

	// Check if the color is transparent
	const isTransparent = isTransparentColor(currentColor);

	// Create a hollow circle SVG icon with the current color
	const icon = (
		<svg
			width={24}
			height={24}
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
		>
			<title>Border Color</title>
			{isTransparent ? (
				<>
					{/* Background checkered pattern using stroke-dasharray */}
					<circle
						cx="12"
						cy="12"
						r="8"
						fill="none"
						stroke="#ccc"
						strokeWidth="4"
						strokeDasharray="3 2"
					/>
					<circle
						cx="12"
						cy="12"
						r="8"
						fill="none"
						stroke="#fff"
						strokeWidth="4"
						strokeDasharray="3 2"
						strokeDashoffset="3"
					/>
				</>
			) : (
				<circle
					cx="12"
					cy="12"
					r="8"
					fill="none"
					stroke={currentColor}
					strokeWidth="3"
				/>
			)}
		</svg>
	);

	return (
		<DiagramMenuPositioner>
			<DiagramMenuButton isActive={isOpen} onClick={onToggle}>
				{icon}
			</DiagramMenuButton>
			{isOpen && (
				<ColorPicker
					color={currentColor}
					onColorChange={handleColorChange}
					onColorChangeCommit={handleColorChangeCommit}
				/>
			)}
		</DiagramMenuPositioner>
	);
};

export const BorderColorMenu = memo(BorderColorMenuComponent);
