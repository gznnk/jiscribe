import React, { memo, useRef } from "react";

import { useMenuSections } from "./hooks/useMenuSections";
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

const renderItem = (item: MenuItem, props: MenuItemProps): React.ReactNode => {
	const { canvasState, onPropertyUpdate } = props;
	switch (item.type) {
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
					showRadius={item.radius}
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
				<item.component
					key={item.id}
					canvasState={canvasState}
					onPropertyUpdate={onPropertyUpdate}
				/>
			);
	}
};

const buildSystemSections = (
	canvasState: CanvasControllerState,
): MenuSection[] => {
	const systemSections: MenuSection[] = [];

	// To show StackOrder including connector selection (selectedConnectorId), use
	// isArrangeableSelection, which judges by the effective selection rather than selectedIds alone.
	if (isArrangeableSelection(canvasState)) {
		systemSections.push({
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
		systemSections.push({
			id: "system-aspect-ratio",
			items: [{ type: "aspectRatio" }],
		});
	}

	const shouldShowGroup =
		selectedIds.length > 1 || singleSelected?.type === "group";
	if (shouldShowGroup) {
		systemSections.push({
			id: "system-group",
			items: [{ type: "group" }],
		});
	}

	return systemSections;
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
	// Skip the section computations while the menu is hidden (e.g. during a drag, where
	// canvasState.objects churns every frame) — the result would not be shown anyway.
	const objectSections = useMenuSections(canvasState, shouldRender);
	const systemSections = shouldRender ? buildSystemSections(canvasState) : [];
	const allSections = [...objectSections, ...systemSections];

	if (!shouldRender || allSections.length === 0) {
		return null;
	}

	const itemProps: MenuItemProps = { canvasState, onPropertyUpdate };

	// Since both objectSections and systemSections may contain the same item type,
	// prefer the first occurrence and prevent duplicate rendering
	const renderedItemKeys = new Set<string>();

	// Wrap each section in an ObjectMenuSection. Dividers are drawn in CSS (::before), and
	// empty sections (custom returns null / all items skipped as duplicates) are
	// automatically collapsed along with their divider via `:empty`.
	const sections = allSections.map((section) => {
		const sectionItems: React.ReactNode[] = [];
		section.items.forEach((item) => {
			const key = item.type === "custom" ? item.id : item.type;
			if (renderedItemKeys.has(key)) {
				return;
			}
			renderedItemKeys.add(key);
			sectionItems.push(renderItem(item, itemProps));
		});
		return (
			<ObjectMenuSection key={section.id}>{sectionItems}</ObjectMenuSection>
		);
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
