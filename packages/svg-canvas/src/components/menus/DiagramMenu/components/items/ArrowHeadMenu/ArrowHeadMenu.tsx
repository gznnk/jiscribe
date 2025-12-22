import type React from "react";
import { memo } from "react";

import { ArrowHeadIconPreview } from "./ArrowHeadIconPreview";
import { ArrowHeadSelector } from "./ArrowHeadSelector";
import { useDiagramUpdateRecursively } from "../../../../../../hooks/useDiagramUpdateRecursively";
import type { ArrowHeadType } from "../../../../../../types/core/ArrowHeadType";
import type { Diagram } from "../../../../../../types/state/core/Diagram";
import { ArrowSwap } from "../../../../../icons/ArrowSwap";
import { DiagramMenuPositioner } from "../../../DiagramMenuStyled";
import { getFirstNonGroupDiagram } from "../../../utils/getFirstNonGroupDiagram";
import { DiagramMenuButton } from "../../common/DiagramMenuButton/DiagramMenuButton";
import { DiagramMenuControl } from "../../common/DiagramMenuControl";

type ArrowHeadMenuProps = {
	isStartOpen: boolean;
	isEndOpen: boolean;
	onToggleStart: () => void;
	onToggleEnd: () => void;
	selectedDiagrams: Diagram[];
};

const ArrowHeadMenuComponent: React.FC<ArrowHeadMenuProps> = ({
	isStartOpen,
	isEndOpen,
	onToggleStart,
	onToggleEnd,
	selectedDiagrams,
}) => {
	const applyDiagramUpdate = useDiagramUpdateRecursively();

	// Get the first non-Group diagram's arrow settings
	const firstDiagram = getFirstNonGroupDiagram(selectedDiagrams);
	const startArrowHead = (
		firstDiagram as { startArrowHead?: ArrowHeadType } | undefined
	)?.startArrowHead;
	const endArrowHead = (
		firstDiagram as { endArrowHead?: ArrowHeadType } | undefined
	)?.endArrowHead;

	const handleStartArrowChange = (arrowType: ArrowHeadType) => {
		applyDiagramUpdate({
			items: selectedDiagrams,
			data: { startArrowHead: arrowType },
		});
		// Don't close the selector when selecting arrow type
	};

	const handleEndArrowChange = (arrowType: ArrowHeadType) => {
		applyDiagramUpdate({
			items: selectedDiagrams,
			data: { endArrowHead: arrowType },
		});
		// Don't close the selector when selecting arrow type
	};

	const handleSwapArrows = () => {
		applyDiagramUpdate({
			items: selectedDiagrams,
			data: {
				startArrowHead: endArrowHead || "None",
				endArrowHead: startArrowHead || "None",
			},
		});
	};

	return (
		<>
			{/* Start Arrow Button */}
			<DiagramMenuPositioner>
				<DiagramMenuButton isActive={isStartOpen} onClick={onToggleStart}>
					<ArrowHeadIconPreview arrowType={startArrowHead} direction="start" />
				</DiagramMenuButton>
				{isStartOpen && (
					<DiagramMenuControl>
						<ArrowHeadSelector
							selectedArrowHead={startArrowHead}
							onSelect={handleStartArrowChange}
							direction="start"
						/>
					</DiagramMenuControl>
				)}
			</DiagramMenuPositioner>

			{/* Swap Arrows Button */}
			<DiagramMenuButton onClick={handleSwapArrows}>
				<ArrowSwap fill="#333333" width={24} height={24} title="Swap arrows" />
			</DiagramMenuButton>

			{/* End Arrow Button */}
			<DiagramMenuPositioner>
				<DiagramMenuButton isActive={isEndOpen} onClick={onToggleEnd}>
					<ArrowHeadIconPreview arrowType={endArrowHead} direction="end" />
				</DiagramMenuButton>
				{isEndOpen && (
					<DiagramMenuControl>
						<ArrowHeadSelector
							selectedArrowHead={endArrowHead}
							onSelect={handleEndArrowChange}
							direction="end"
						/>
					</DiagramMenuControl>
				)}
			</DiagramMenuPositioner>
		</>
	);
};

export const ArrowHeadMenu = memo(ArrowHeadMenuComponent);
