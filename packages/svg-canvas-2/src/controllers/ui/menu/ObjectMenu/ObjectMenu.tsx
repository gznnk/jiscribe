import React, { memo, useRef } from "react";

import { useMenuGroups } from "./hooks/useMenuConfig";
import { useObjectMenuPosition } from "./hooks/useObjectMenuPosition";
import {
	ObjectMenuContainer,
	ObjectMenuDivider,
	ObjectMenuWrapper,
} from "./ObjectMenuStyled";
import type { MenuSection, MenuSectionGroup, MenuSectionProps } from "./ObjectMenuTypes";
import { AlignmentMenu } from "./sections/AlignmentMenu";
import { ArrowHeadMenu } from "./sections/ArrowHeadMenu";
import { BackgroundColorMenu } from "./sections/BackgroundColorMenu";
import { BoldMenu } from "./sections/BoldMenu";
import { BorderStyleMenu } from "./sections/BorderStyleMenu";
import { FontColorMenu } from "./sections/FontColorMenu";
import { FontSizeMenu } from "./sections/FontSizeMenu";
import { GroupMenu } from "./sections/GroupMenu";
import { KeepAspectRatioMenu } from "./sections/KeepAspectRatioMenu";
import { LineColorMenu } from "./sections/LineColorMenu";
import { LineStyleMenu } from "./sections/LineStyleMenu";
import { StackOrderMenu } from "./sections/StackOrderMenu";
import { StrokeColorMenu } from "./sections/StrokeColorMenu";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { isSameGroupSelection } from "../../../utils/isSameGroupSelection";

type ObjectMenuProps = {
	canvasState: CanvasControllerState;
	onPropertyUpdate: (property: string, value: string, commit: boolean) => void;
};

const renderSection = (
	section: MenuSection,
	props: MenuSectionProps,
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
			return (
				<AlignmentMenu key="textAlignment" canvasState={canvasState} />
			);
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
): MenuSectionGroup[] => {
	const systemGroups: MenuSectionGroup[] = [];

	if (isSameGroupSelection(canvasState)) {
		systemGroups.push({
			id: "system-stack-order",
			sections: [{ type: "stackOrder" }],
		});
	}

	if (canvasState.multiSelectGroup) {
		systemGroups.push({
			id: "system-aspect-ratio",
			sections: [{ type: "aspectRatio" }],
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
			sections: [{ type: "group" }],
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

	const sectionProps: MenuSectionProps = { canvasState, onPropertyUpdate };

	const items: React.ReactNode[] = [];
	allGroups.forEach((group, gi) => {
		group.sections.forEach((section) => {
			items.push(renderSection(section, sectionProps));
		});
		if (gi < allGroups.length - 1) {
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
