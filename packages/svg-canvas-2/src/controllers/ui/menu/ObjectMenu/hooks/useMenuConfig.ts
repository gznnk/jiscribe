import { useMemo } from "react";

import type { CanvasControllerState } from "../../../../CanvasTypes";
import { collectDescendantIds } from "../../../../utils/collectDescendantIds";
import { objectMenuRegistry } from "../ObjectMenuRegistry";
import type { MenuSection, MenuSectionGroup } from "../ObjectMenuTypes";

const sectionKey = (section: MenuSection): string =>
	section.type === "custom" ? section.id : section.type;

/**
 * 複数オブジェクト型のセクションリストを AND 結合する。
 * 全型に共通するセクションのみを残す。
 * borderStyle は全型が radius: true の場合のみ radius を有効にする。
 */
const mergeSections = (arrays: MenuSection[][]): MenuSection[] => {
	if (arrays.length === 1) return arrays[0];

	return arrays[0]
		.filter((section) => {
			const key = sectionKey(section);
			return arrays.slice(1).every((arr) => arr.some((s) => sectionKey(s) === key));
		})
		.map((section) => {
			if (section.type !== "borderStyle") return section;
			// radius は全型が true の場合のみ表示する
			const allRadius = arrays.every((arr) => {
				const found = arr.find((s) => s.type === "borderStyle");
				return found?.type === "borderStyle" && found.radius === true;
			});
			return { type: "borderStyle" as const, radius: allRadius };
		});
};

/**
 * 複数オブジェクト型のグループリストを AND 結合する。
 * 全型に共通する id のグループのみを残し、各グループ内のセクションも AND 結合する。
 */
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

/**
 * 選択中オブジェクトから表示すべきメニューグループを計算する。
 *
 * Connector が選択されている場合（selectedConnectorId != null）はその型のグループを返す。
 * グループオブジェクトが選択されている場合は子孫の実オブジェクト型を展開し、
 * 複数の型が混在する場合は共通するグループ・セクションのみを表示する（AND 結合）。
 */
export const getMenuGroups = (
	state: CanvasControllerState,
): MenuSectionGroup[] => {
	const { selectedIds, selectedConnectorId, objects } = state;

	// Connector 選択時は selectedIds の代わりに connector のグループを返す
	if (selectedConnectorId !== null) {
		const connector = objects[selectedConnectorId];
		if (!connector) return [];
		return objectMenuRegistry.getGroups(connector.type, connector);
	}

	if (selectedIds.length === 0) return [];

	// 選択中オブジェクトに含まれる実オブジェクト型を収集する。
	// group型は子孫の実オブジェクト型に展開する。
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

	// 各型の代表インスタンスでメニューグループを取得し、AND 結合する
	const groupArrays = [...types].map((type) => {
		const representative = Object.values(objects).find((o) => o?.type === type);
		return representative ? objectMenuRegistry.getGroups(type, representative) : [];
	});

	return mergeGroups(groupArrays);
};

export const useMenuGroups = (
	state: CanvasControllerState,
): MenuSectionGroup[] => {
	const { selectedIds, selectedConnectorId, objects } = state;
	// eslint-disable-next-line react-hooks/exhaustive-deps
	return useMemo(() => getMenuGroups(state), [selectedIds, selectedConnectorId, objects]);
};
