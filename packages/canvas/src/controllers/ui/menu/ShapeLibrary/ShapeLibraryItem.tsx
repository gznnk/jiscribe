import { memo } from "react";

import { ShapeLibraryButton } from "./ShapeLibraryStyled";
import type { ShapePreset } from "../../../../schemas/objects/types/ShapePreset";

type ShapeLibraryItemProps = {
	preset: ShapePreset;
	isActive?: boolean;
};

const ICON_SIZE = 24;

const ShapeLibraryItemComponent: React.FC<ShapeLibraryItemProps> = ({
	preset,
	isActive = false,
}) => {
	const Icon = preset.icon;
	return (
		<ShapeLibraryButton
			data-kind="menu-item"
			data-id={`menu-item:${preset.id}`}
			title={preset.label}
			isActive={isActive}
		>
			{Icon ? <Icon width={ICON_SIZE} height={ICON_SIZE} /> : null}
		</ShapeLibraryButton>
	);
};

export const ShapeLibraryItem = memo(ShapeLibraryItemComponent);
