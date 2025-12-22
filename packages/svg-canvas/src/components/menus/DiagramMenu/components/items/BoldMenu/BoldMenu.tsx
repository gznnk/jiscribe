import type React from "react";
import { memo } from "react";

import { useDiagramUpdateRecursively } from "../../../../../../hooks/useDiagramUpdateRecursively";
import type { Diagram } from "../../../../../../types/state/core/Diagram";
import { isTextableState } from "../../../../../../utils/validation/isTextableState";
import { Bold as BoldIcon } from "../../../../../icons/Bold";
import { getFirstNonGroupDiagram } from "../../../utils/getFirstNonGroupDiagram";
import { DiagramMenuButton } from "../../common/DiagramMenuButton/DiagramMenuButton";

type BoldMenuProps = {
	selectedDiagrams: Diagram[];
};

const BoldMenuComponent: React.FC<BoldMenuProps> = ({ selectedDiagrams }) => {
	const applyDiagramUpdate = useDiagramUpdateRecursively();

	// Get the first non-Group diagram and check if it's textable
	const firstDiagram = getFirstNonGroupDiagram(selectedDiagrams);
	const textableDiagram =
		firstDiagram && isTextableState(firstDiagram) ? firstDiagram : null;

	// Return null if no textable diagram is selected
	if (!textableDiagram) {
		return null;
	}

	const isActive = textableDiagram.fontWeight === "bold";

	const handleClick = () => {
		applyDiagramUpdate({
			items: selectedDiagrams,
			data: {
				fontWeight: isActive ? "normal" : "bold",
			},
		});
	};

	return (
		<DiagramMenuButton isActive={isActive} onClick={handleClick}>
			<BoldIcon title="Bold" />
		</DiagramMenuButton>
	);
};

export const BoldMenu = memo(BoldMenuComponent);
