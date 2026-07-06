import React, { memo, useRef } from "react";

import { useMenuGroups } from "./hooks/useMenuConfig";
import { useObjectMenuPosition } from "./hooks/useObjectMenuPosition";
import { AlignmentMenu } from "./items/AlignmentMenu";
import { ArrowHeadMenu } from "./items/ArrowHeadMenu";
import { BackgroundColorMenu } from "./items/BackgroundColorMenu";
import { BoldMenu } from "./items/BoldMenu";
import { BorderStyleMenu } from "./items/BorderStyleMenu";
import { FontColorMenu } from "./items/FontColorMenu";
import { FontSizeMenu } from "./items/FontSizeMenu";
import { GroupMenu } from "./items/GroupMenu";
import { KeepAspectRatioMenu } from "./items/KeepAspectRatioMenu";
import { LineColorMenu } from "./items/LineColorMenu";
import { LineStyleMenu } from "./items/LineStyleMenu";
import { StackOrderMenu } from "./items/StackOrderMenu";
import { StrokeColorMenu } from "./items/StrokeColorMenu";
import {
	ObjectMenuContainer,
	ObjectMenuSection,
	ObjectMenuWrapper,
} from "./ObjectMenuStyled";
import type { MenuItem, MenuSection, MenuItemProps } from "./ObjectMenuTypes";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { isArrangeableSelection } from "../../../utils/isArrangeableSelection";

type ObjectMenuProps = {
	canvasState: CanvasControllerState;
	onPropertyUpdate: (property: string, value: string, commit: boolean) => void;
};

const renderItem = (
	section: MenuItem,
	props: MenuItemProps,
): React.ReactNode => {
	const { canvasState, onPropertyUpdate } = props;
	switch (section.type) {
		case "arrowHead":
			return <ArrowHeadMenu key="arrowHead" canvasState={canvasState} />;
		case "lineColor":
			return (
				<LineColorMenu
					key="lineColor"
					canvasState={canvasState}
					onPropertyUpdate={onPropertyUpdate}
				/>
			);
		case "lineStyle":
			return (
				<LineStyleMenu
					key="lineStyle"
					canvasState={canvasState}
					onPropertyUpdate={onPropertyUpdate}
				/>
			);
		case "backgroundColor":
			return (
				<BackgroundColorMenu
					key="backgroundColor"
					canvasState={canvasState}
					onPropertyUpdate={onPropertyUpdate}
				/>
			);
		case "borderColor":
			return (
				<StrokeColorMenu
					key="borderColor"
					canvasState={canvasState}
					onPropertyUpdate={onPropertyUpdate}
				/>
			);
		case "borderStyle":
			return (
				<BorderStyleMenu
					key="borderStyle"
					canvasState={canvasState}
					showRadius={section.radius}
					onPropertyUpdate={onPropertyUpdate}
				/>
			);
		case "fontStyle":
			return (
				<React.Fragment key="fontStyle">
					<FontSizeMenu
						canvasState={canvasState}
						onPropertyUpdate={onPropertyUpdate}
					/>
					<FontColorMenu
						canvasState={canvasState}
						onPropertyUpdate={onPropertyUpdate}
					/>
					<BoldMenu canvasState={canvasState} />
				</React.Fragment>
			);
		case "textAlignment":
			return <AlignmentMenu key="textAlignment" canvasState={canvasState} />;
		case "aspectRatio":
			return (
				<KeepAspectRatioMenu key="aspectRatio" canvasState={canvasState} />
			);
		case "stackOrder":
			return <StackOrderMenu key="stackOrder" canvasState={canvasState} />;
		case "group":
			return <GroupMenu key="group" canvasState={canvasState} />;
		case "custom":
			return (
				<section.component
					key={section.id}
					canvasState={canvasState}
					onPropertyUpdate={onPropertyUpdate}
				/>
			);
	}
};

const buildSystemGroups = (
	canvasState: CanvasControllerState,
): MenuSection[] => {
	const systemGroups: MenuSection[] = [];

	// To show StackOrder including connector selection (selectedConnectorId), use
	// isArrangeableSelection, which judges by the effective selection rather than selectedIds alone.
	if (isArrangeableSelection(canvasState)) {
		systemGroups.push({
			id: "system-stack-order",
			items: [{ type: "stackOrder" }],
		});
	}

	const { selectedIds, objects } = canvasState;
	const singleSelected =
		selectedIds.length === 1 ? objects[selectedIds[0]] : undefined;

	// Like multiSelectGroup, a group holds its own lockAspectRatio, so show the
	// aspect-ratio menu regardless of the type composition of its descendants
	if (canvasState.multiSelectGroup || singleSelected?.type === "group") {
		systemGroups.push({
			id: "system-aspect-ratio",
			items: [{ type: "aspectRatio" }],
		});
	}

	const shouldShowGroup =
		selectedIds.length > 1 || singleSelected?.type === "group";
	if (shouldShowGroup) {
		systemGroups.push({
			id: "system-group",
			items: [{ type: "group" }],
		});
	}

	return systemGroups;
};

/**
 * Floating menu displayed below the selected object.
 * Placed inside ScrollSyncedOverlay and follows canvas scrolling.
 */
const ObjectMenuComponent: React.FC<ObjectMenuProps> = ({
	canvasState,
	onPropertyUpdate,
}) => {
	const menuRef = useRef<HTMLDivElement>(null);
	const { shouldRender, x, y } = useObjectMenuPosition(canvasState, menuRef);
	const objectGroups = useMenuGroups(canvasState);
	const systemGroups = buildSystemGroups(canvasState);
	const allGroups = [...objectGroups, ...systemGroups];

	if (!shouldRender || allGroups.length === 0) {
		return null;
	}

	const itemProps: MenuItemProps = { canvasState, onPropertyUpdate };

	// Since both objectGroups and systemGroups may contain the same item type,
	// prefer the first occurrence and prevent duplicate rendering
	const renderedItemKeys = new Set<string>();

	// Wrap each group in an ObjectMenuSection. Dividers are drawn in CSS (::before), and
	// empty sections (custom returns null / all items skipped as duplicates) are
	// automatically collapsed along with their divider via `:empty`.
	const sections = allGroups.map((group) => {
		const groupItems: React.ReactNode[] = [];
		group.items.forEach((item) => {
			const key = item.type === "custom" ? item.id : item.type;
			if (renderedItemKeys.has(key)) {
				return;
			}
			renderedItemKeys.add(key);
			groupItems.push(renderItem(item, itemProps));
		});
		return <ObjectMenuSection key={group.id}>{groupItems}</ObjectMenuSection>;
	});

	return (
		<ObjectMenuWrapper style={{ left: x, top: y }}>
			<ObjectMenuContainer ref={menuRef} data-kind="menu" data-id="object-menu">
				{sections}
			</ObjectMenuContainer>
		</ObjectMenuWrapper>
	);
};

export const ObjectMenu = memo(ObjectMenuComponent);
