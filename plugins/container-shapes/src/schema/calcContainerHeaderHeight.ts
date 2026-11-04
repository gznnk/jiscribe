import { isNumber } from "@jiscribe/basic-validators";

import type { ContainerDoc } from "./ContainerDoc";
import { CONTAINER_HEADER_HEIGHT } from "./ContainerDoc";

/** Least `headerHeight` a document may state, in local px; the validator and the JSON schema refuse less. */
export const CONTAINER_HEADER_HEIGHT_MIN = 1;

/** Whether a value is a `headerHeight` the document may state: a finite number of {@link CONTAINER_HEADER_HEIGHT_MIN} or more. */
export const isContainerHeaderHeight = (value: unknown): value is number =>
	isNumber(value) && value >= CONTAINER_HEADER_HEIGHT_MIN;

/**
 * The header band height a document states, or CONTAINER_HEADER_HEIGHT when it states
 * none or one the validator would refuse; not capped at the box, so it may exceed it.
 *
 * @param doc - The container as the document holds it; only `headerHeight` is read, as an unknown
 */
export const readContainerHeaderHeight = (
	doc: Readonly<Record<string, unknown>>,
): number =>
	isContainerHeaderHeight(doc.headerHeight)
		? doc.headerHeight
		: CONTAINER_HEADER_HEIGHT;

/**
 * Effective header band height for rendering: the per-object value
 * (absent = default), clamped so it never exceeds the box height.
 *
 * @param shape - The container's `headerHeight` (absent or invalid = CONTAINER_HEADER_HEIGHT) and its untransformed box height
 * @returns The band height in local pixels, never above `shape.height`
 */
export const calcContainerHeaderHeight = (
	shape: Pick<ContainerDoc, "headerHeight" | "height">,
): number => Math.min(readContainerHeaderHeight(shape), shape.height);
