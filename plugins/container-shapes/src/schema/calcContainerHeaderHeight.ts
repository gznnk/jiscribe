import type { ContainerDoc } from "./ContainerDoc";
import { CONTAINER_HEADER_HEIGHT } from "./ContainerDoc";

/**
 * Effective header band height for rendering: the per-object value
 * (absent = default), clamped so it never exceeds the box height.
 *
 * @param shape - The container's `headerHeight` (absent = CONTAINER_HEADER_HEIGHT) and its untransformed box height
 * @returns The band height in local pixels, never above `shape.height`
 */
export const calcContainerHeaderHeight = (
	shape: Pick<ContainerDoc, "headerHeight" | "height">,
): number =>
	Math.min(shape.headerHeight ?? CONTAINER_HEADER_HEIGHT, shape.height);
