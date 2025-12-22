import type React from "react";
import { memo } from "react";

import { StackOrderMenuWrapper } from "./StackOrderMenuStyled";
import { useStackOrderChange } from "../../../../../../hooks/useStackOrderChange";
import type { StackOrderChangeType } from "../../../../../../types/events/StackOrderChangeType";
import type { Diagram } from "../../../../../../types/state/core/Diagram";
import { newEventId } from "../../../../../../utils/core/newEventId";
import { BringForward } from "../../../../../icons/BringForward";
import { BringToFront } from "../../../../../icons/BringToFront";
import { SendBackward } from "../../../../../icons/SendBackward";
import { SendToBack } from "../../../../../icons/SendToBack";
import { StackOrder as StackOrderIcon } from "../../../../../icons/StackOrder";
import { DiagramMenuPositioner } from "../../../DiagramMenuStyled";
import { DiagramMenuButton } from "../../common/DiagramMenuButton/DiagramMenuButton";
import { DiagramMenuControl } from "../../common/DiagramMenuControl";

type StackOrderMenuProps = {
	isOpen: boolean;
	onToggle: () => void;
	selectedDiagrams: Diagram[];
};

const StackOrderMenuComponent: React.FC<StackOrderMenuProps> = ({
	isOpen,
	onToggle,
	selectedDiagrams,
}) => {
	const onStackOrderChange = useStackOrderChange();

	// Show menu when at least one item is selected
	if (selectedDiagrams.length === 0) {
		return null;
	}

	const handleStackOrderChange = (changeType: StackOrderChangeType) => {
		const eventId = newEventId();
		// Apply the same operation to all selected diagrams with the same event ID
		selectedDiagrams.forEach((diagram) => {
			onStackOrderChange({
				eventId,
				changeType,
				id: diagram.id,
			});
		});
	};

	return (
		<DiagramMenuPositioner>
			<DiagramMenuButton isActive={isOpen} onClick={onToggle}>
				<StackOrderIcon title="Stack Order" />
			</DiagramMenuButton>
			{isOpen && (
				<DiagramMenuControl>
					<StackOrderMenuWrapper>
						<DiagramMenuButton
							isActive={false}
							onClick={() => handleStackOrderChange("bringToFront")}
						>
							<BringToFront title="Bring to Front" />
						</DiagramMenuButton>
						<DiagramMenuButton
							isActive={false}
							onClick={() => handleStackOrderChange("bringForward")}
						>
							<BringForward title="Bring Forward" />
						</DiagramMenuButton>
						<DiagramMenuButton
							isActive={false}
							onClick={() => handleStackOrderChange("sendBackward")}
						>
							<SendBackward title="Send Backward" />
						</DiagramMenuButton>
						<DiagramMenuButton
							isActive={false}
							onClick={() => handleStackOrderChange("sendToBack")}
						>
							<SendToBack title="Send to Back" />
						</DiagramMenuButton>
					</StackOrderMenuWrapper>
				</DiagramMenuControl>
			)}
		</DiagramMenuPositioner>
	);
};

export const StackOrderMenu = memo(StackOrderMenuComponent);
