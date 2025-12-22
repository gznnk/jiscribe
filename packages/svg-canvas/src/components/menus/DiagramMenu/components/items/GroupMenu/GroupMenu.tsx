import type React from "react";
import { memo } from "react";

import { useGroup } from "../../../../../../hooks/useGroup";
import { useUngroup } from "../../../../../../hooks/useUngroup";
import type { Diagram } from "../../../../../../types/state/core/Diagram";
import { Group } from "../../../../../icons/Group";
import { DiagramMenuButton } from "../../common/DiagramMenuButton/DiagramMenuButton";

type GroupMenuProps = {
	selectedDiagrams: Diagram[];
};

const GroupMenuComponent: React.FC<GroupMenuProps> = ({ selectedDiagrams }) => {
	const onGroup = useGroup();
	const onUngroup = useUngroup();

	// Get single selected item from selectedDiagrams
	const singleSelectedItem =
		selectedDiagrams.length === 1 ? selectedDiagrams[0] : undefined;

	const isActive = Boolean(
		singleSelectedItem && singleSelectedItem.type === "Group",
	);

	const handleClick = () => {
		if (isActive) {
			onUngroup();
		} else {
			onGroup();
		}
	};

	return (
		<DiagramMenuButton isActive={isActive} onClick={handleClick}>
			<Group width={24} height={24} title={isActive ? "Ungroup" : "Group"} />
		</DiagramMenuButton>
	);
};

export const GroupMenu = memo(GroupMenuComponent);
