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
];

const ShapeLibraryComponent: React.FC = () => {
	return (
		<ShapeLibraryContainer>
			{SHAPE_LIBRARY_ITEMS.map((item) => (
				<ShapeLibraryItem key={item.type} type={item.type} label={item.label} />
			))}
		</ShapeLibraryContainer>
	);
};

export const ShapeLibrary = memo(ShapeLibraryComponent);
