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
	ObjectMenuDivider,
	ObjectMenuWrapper,
} from "./ObjectMenuStyled";
import type { MenuItem, MenuSection, MenuItemProps } from "./ObjectMenuTypes";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { isSameGroupSelection } from "../../../utils/isSameGroupSelection";

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
			return <LineColorMenu key="lineColor" canvasState={canvasState} />;
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
				<BackgroundColorMenu key="backgroundColor" canvasState={canvasState} />
			);
		case "borderColor":
			return <StrokeColorMenu key="borderColor" canvasState={canvasState} />;
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
					<FontColorMenu canvasState={canvasState} />
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

	if (isSameGroupSelection(canvasState)) {
		systemGroups.push({
			id: "system-stack-order",
			items: [{ type: "stackOrder" }],
		});
	}

	if (canvasState.multiSelectGroup) {
		systemGroups.push({
			id: "system-aspect-ratio",
			items: [{ type: "aspectRatio" }],
		});
	}

	const { selectedIds, objects } = canvasState;
	const singleSelected =
		selectedIds.length === 1 ? objects[selectedIds[0]] : undefined;
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
 * 選択中オブジェクトの下に表示されるフローティングメニュー。
 * ScrollSyncedOverlay 内に配置され、キャンバススクロールに追従する。
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

	if (!shouldRender || allGroups.length === 0) return null;

	const itemProps: MenuItemProps = { canvasState, onPropertyUpdate };

	// objectGroups と systemGroups の両方に同じアイテムタイプが含まれる場合があるため、
	// 先に出現したものを優先し、重複レンダリングを防ぐ
	const renderedItemKeys = new Set<string>();
	const items: React.ReactNode[] = [];

	allGroups.forEach((group, gi) => {
		// 未レンダリングのアイテムのみ抽出する
		const groupItems: React.ReactNode[] = [];
		group.items.forEach((item) => {
			const key = item.type === "custom" ? item.id : item.type;
			if (renderedItemKeys.has(key)) return;
			renderedItemKeys.add(key);
			groupItems.push(renderItem(item, itemProps));
		});

		items.push(...groupItems);

		// グループ間にセパレータを挿入（最終グループ、または全アイテムが重複スキップされたグループの後ろには挿入しない）
		if (gi < allGroups.length - 1 && groupItems.length > 0) {
			items.push(<ObjectMenuDivider key={`sep-${gi}`} />);
		}
	});

	return (
		<ObjectMenuWrapper left={x} top={y}>
			<ObjectMenuContainer ref={menuRef}>{items}</ObjectMenuContainer>
		</ObjectMenuWrapper>
	);
};

export const ObjectMenu = memo(ObjectMenuComponent);
