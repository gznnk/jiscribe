import { memo } from "react";

import { ShapeLibraryItem } from "./ShapeLibraryItem";
import { ShapeLibraryContainer } from "./ShapeLibraryStyled";
import type { ObjectType } from "../../../../schemas/objects/types/ObjectType";

type ShapeLibraryItemDefinition = {
	type: ObjectType;
	label: string;
};

const SHAPE_LIBRARY_ITEMS: ShapeLibraryItemDefinition[] = [
	{ type: "rect", label: "Rectangle" },
	{ type: "ellipse", label: "Ellipse" },
	{ type: "sticky", label: "Sticky" },
];

type ShapeLibraryProps = {
	activeDrawingTool: ObjectType | null;
};

const ShapeLibraryComponent: React.FC<ShapeLibraryProps> = ({
	activeDrawingTool,
}) => {
	return (
		<ShapeLibraryContainer>
			{SHAPE_LIBRARY_ITEMS.map((item) => (
				<ShapeLibraryItem
					key={item.type}
					type={item.type}
					label={item.label}
					isActive={activeDrawingTool === item.type}
				/>
			))}
		</ShapeLibraryContainer>
	);
};

export const ShapeLibrary = memo(ShapeLibraryComponent);
