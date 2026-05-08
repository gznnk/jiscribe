import { memo } from "react";

import type { ObjectType } from "../../../../schemas/objects/types/ObjectType";
import { EllipseIcon } from "../../icons/EllipseIcon";
import { RectIcon } from "../../icons/RectIcon";
import { StickyIcon } from "../../icons/StickyIcon";
import { ShapeLibraryButton } from "./ShapeLibraryStyled";

type ShapeLibraryItemProps = {
	type: ObjectType;
	label: string;
	isActive?: boolean;
};

const ICON_SIZE = 20;

const getIcon = (type: ObjectType) => {
	switch (type) {
		case "rect":
			return <RectIcon width={ICON_SIZE} height={ICON_SIZE} />;
		case "ellipse":
			return <EllipseIcon width={ICON_SIZE} height={ICON_SIZE} />;
		case "sticky":
			return <StickyIcon width={ICON_SIZE} height={ICON_SIZE} />;
		default:
			return null;
	}
};

const ShapeLibraryItemComponent: React.FC<ShapeLibraryItemProps> = ({
	type,
	label,
	isActive = false,
}) => {
	return (
		<ShapeLibraryButton
			data-kind="menu-item"
			data-id={`menu-item:${type}`}
			title={label}
			isActive={isActive}
		>
			{getIcon(type)}
			</ShapeLibraryButton>
	);
};

export const ShapeLibraryItem = memo(ShapeLibraryItemComponent);
