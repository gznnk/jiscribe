import { memo } from "react";

import type { ObjectType } from "../../../../schemas/objects/types/ObjectType";
import { EllipseIcon } from "../../icons/EllipseIcon";
import { RectIcon } from "../../icons/RectIcon";

type ShapeLibraryItemProps = {
	type: ObjectType;
	label: string;
};

const ICON_SIZE = 20;

const getIcon = (type: ObjectType) => {
	switch (type) {
		case "rect":
			return <RectIcon width={ICON_SIZE} height={ICON_SIZE} />;
		case "ellipse":
			return <EllipseIcon width={ICON_SIZE} height={ICON_SIZE} />;
		default:
			return null;
	}
};

const ShapeLibraryItemComponent: React.FC<ShapeLibraryItemProps> = ({
	type,
	label,
}) => {
	return (
		<div
			data-kind="menu-item"
			data-id={`menu-item:${type}`}
			style={{
				display: "flex",
				alignItems: "center",
				gap: 8,
				padding: "6px 10px",
				cursor: "grab",
				borderRadius: 6,
				userSelect: "none",
				pointerEvents: "auto",
			}}
		>
			{getIcon(type)}
			<span style={{ fontSize: 13, color: "#374151" }}>{label}</span>
		</div>
	);
};

export const ShapeLibraryItem = memo(ShapeLibraryItemComponent);
