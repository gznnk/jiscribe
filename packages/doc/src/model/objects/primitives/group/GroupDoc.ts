import type { ObjectDoc } from "../../base/ObjectDoc";
import type { CreateObjectType } from "../../types/CreateObjectType";
import type { ObjectFeatures } from "../../types/ObjectFeatures";

export const GroupFeatures = {
	type: "group",
	geometry: "none",
	transform: true,
	connectable: false,
} as const satisfies ObjectFeatures;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const GroupDocBrand: unique symbol;

export type GroupDoc = CreateObjectType<
	typeof GroupFeatures,
	typeof GroupDocBrand,
	{
		children: ObjectDoc[];
	}
>;

/**
 * Doc fields group carries beyond the ones its features imply (see
 * ObjectDocDefinition.extraKeys). The child list is structure rather than a
 * property: it is built by grouping and checked recursively
 * (validateStructure), which is why doc-ops subtracts it from the names
 * `extraProps` may write (ops/utils/extraFields).
 */
export const GROUP_EXTRA_KEYS = [
	"children",
] as const satisfies readonly (keyof GroupDoc)[];
