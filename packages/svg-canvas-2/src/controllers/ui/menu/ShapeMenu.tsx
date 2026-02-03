import { memo } from "react";

import { ShapeMenuItem } from "./ShapeMenuItem";
import { ShapeMenuContainer } from "./ShapeMenuStyled";
import type { ObjectType } from "../../../schemas/objects/types/ObjectType";

type ShapeMenuItemDefinition = {
	type: ObjectType;
	label: string;
};

const SHAPE_MENU_ITEMS: ShapeMenuItemDefinition[] = [
	{ type: "rect", label: "Rectangle" },
	{ type: "ellipse", label: "Ellipse" },
];

const ShapeMenuComponent: React.FC = () => {
	return (
		<ShapeMenuContainer>
			{SHAPE_MENU_ITEMS.map((item) => (
				<ShapeMenuItem key={item.type} type={item.type} label={item.label} />
			))}
		</ShapeMenuContainer>
	);
};

export const ShapeMenu = memo(ShapeMenuComponent);
