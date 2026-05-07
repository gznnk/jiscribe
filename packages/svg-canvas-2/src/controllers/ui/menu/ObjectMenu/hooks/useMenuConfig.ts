import { useMemo } from "react";

import type { CanvasControllerState } from "../../../../CanvasTypes";
import { collectDescendantIds } from "../../../../utils/collectDescendantIds";
import { menuRegistry } from "../ObjectMenuRegistry";
import type { MenuSection, MenuSectionGroup } from "../ObjectMenuTypes";

const sectionKey = (section: MenuSection): string =>
	section.type === "custom" ? section.id : section.type;

const mergeSections = (arrays: MenuSection[][]): MenuSection[] => {
	if (arrays.length === 1) return arrays[0];

	return arrays[0]
		.filter((section) => {
			const key = sectionKey(section);
			return arrays.slice(1).every((arr) => arr.some((s) => sectionKey(s) === key));
		})
		.map((section) => {
			if (section.type !== "borderStyle") return section;
			const allRadius = arrays.every((arr) => {
				const found = arr.find((s) => s.type === "borderStyle");
				return found?.type === "borderStyle" && found.radius === true;
			});
			return { type: "borderStyle" as const, radius: allRadius };
		});
};

const mergeGroups = (arrays: MenuSectionGroup[][]): MenuSectionGroup[] => {
	if (arrays.length === 0) return [];
	if (arrays.length === 1) return arrays[0];

	return arrays[0]
		.filter((group) =>
			arrays.slice(1).every((arr) => arr.some((g) => g.id === group.id)),
		)
		.map((group) => ({
			id: group.id,
			sections: mergeSections(
				arrays.map((arr) => arr.find((g) => g.id === group.id)!.sections),
			),
		}))
		.filter((group) => group.sections.length > 0);
};

export const getMenuGroups = (
	state: CanvasControllerState,
): MenuSectionGroup[] => {
	const { selectedIds, objects } = state;
	if (selectedIds.length === 0) return [];

	const types = new Set<string>();
	for (const id of selectedIds) {
		const obj = objects[id];
		if (!obj) continue;
		if (obj.type !== "group") {
			types.add(obj.type);
		} else {
			for (const descId of collectDescendantIds(id, objects)) {
				const desc = objects[descId];
				if (desc && desc.type !== "group") types.add(desc.type);
			}
		}
	}

	if (types.size === 0) return [];

	const groupArrays = [...types].map((type) => {
		const representative = Object.values(objects).find((o) => o?.type === type);
		return representative ? menuRegistry.getGroups(type, representative) : [];
	});

	return mergeGroups(groupArrays);
};

export const useMenuGroups = (
	state: CanvasControllerState,
): MenuSectionGroup[] => {
	const { selectedIds, objects } = state;
	// eslint-disable-next-line react-hooks/exhaustive-deps
	return useMemo(() => getMenuGroups(state), [selectedIds, objects]);
};
