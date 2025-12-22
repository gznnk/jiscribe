import type React from "react";
import { memo } from "react";

import { ArrowHeadIconPreview } from "./ArrowHeadIconPreview";
import { ArrowHeadSelectorGrid } from "./ArrowHeadMenuStyled";
import type { ArrowHeadType } from "../../../../../../types/core/ArrowHeadType";
import { DiagramMenuButton } from "../../common/DiagramMenuButton/DiagramMenuButton";

const arrowHeadTypes: ArrowHeadType[] = [
	"None",
	"FilledTriangle",
	"ConcaveTriangle",
	"OpenArrow",
	"HollowTriangle",
	"FilledDiamond",
	"HollowDiamond",
	"Circle",
];

type ArrowHeadSelectorProps = {
	selectedArrowHead: ArrowHeadType | undefined;
	direction: "start" | "end";
	onSelect: (arrowType: ArrowHeadType) => void;
};

const ArrowHeadSelectorComponent: React.FC<ArrowHeadSelectorProps> = ({
	selectedArrowHead,
	direction,
	onSelect,
}) => {
	return (
		<ArrowHeadSelectorGrid>
			{arrowHeadTypes.map((type) => (
				<DiagramMenuButton
					key={type}
					isActive={selectedArrowHead === type}
					onClick={() => onSelect(type)}
				>
					<ArrowHeadIconPreview arrowType={type} direction={direction} />
				</DiagramMenuButton>
			))}
		</ArrowHeadSelectorGrid>
	);
};

export const ArrowHeadSelector = memo(ArrowHeadSelectorComponent);
