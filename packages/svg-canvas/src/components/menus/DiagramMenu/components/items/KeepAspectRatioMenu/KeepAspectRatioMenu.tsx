import type React from "react";
import { memo } from "react";

import { MULTI_SELECT_GROUP } from "../../../../../../canvas/SvgCanvasConstants";
import { useKeepProportionChange } from "../../../../../../hooks/useKeepProportionChange";
import type { Diagram } from "../../../../../../types/state/core/Diagram";
import type { GroupState } from "../../../../../../types/state/shapes/GroupState";
import { newEventId } from "../../../../../../utils/core/newEventId";
import { isTransformativeState } from "../../../../../../utils/validation/isTransformativeState";
import { AspectRatio } from "../../../../../icons/AspectRatio";
import { DiagramMenuButton } from "../../common/DiagramMenuButton/DiagramMenuButton";

type KeepAspectRatioMenuProps = {
	multiSelectGroup: GroupState | undefined;
	selectedDiagrams: Diagram[];
};

const KeepAspectRatioMenuComponent: React.FC<KeepAspectRatioMenuProps> = ({
	multiSelectGroup,
	selectedDiagrams,
}) => {
	const onKeepProportionChange = useKeepProportionChange();

	// Get single selected item from selectedDiagrams
	const singleSelectedItem =
		selectedDiagrams.length === 1 ? selectedDiagrams[0] : undefined;

	const isActive = Boolean(
		multiSelectGroup
			? multiSelectGroup.keepProportion
			: isTransformativeState(singleSelectedItem) &&
					singleSelectedItem.keepProportion,
	);

	const handleClick = () => {
		const eventId = newEventId();
		if (multiSelectGroup) {
			onKeepProportionChange({
				eventId,
				id: MULTI_SELECT_GROUP,
				keepProportion: !isActive,
			});
		} else {
			for (const item of selectedDiagrams) {
				onKeepProportionChange({
					eventId,
					id: item.id,
					keepProportion: !isActive,
				});
			}
		}
	};

	return (
		<DiagramMenuButton isActive={isActive} onClick={handleClick}>
			<AspectRatio width={22} height={22} title="Keep Aspect Ratio" />
		</DiagramMenuButton>
	);
};

export const KeepAspectRatioMenu = memo(KeepAspectRatioMenuComponent);
