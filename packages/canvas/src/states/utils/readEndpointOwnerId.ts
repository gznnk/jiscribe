import { isObject } from "@jiscribe/basic-validators";

/**
 * The owner id an endpoint of a connector doc names, read from the fields alone so
 * that a connector held as an opaque object can be asked too.
 *
 * @param endpoint - A connector's `source` or `target`, as written
 * @returns Undefined for a free endpoint or anything not shaped like one
 */
export const readEndpointOwnerId = (endpoint: unknown): string | undefined => {
	if (!isObject(endpoint) || !isObject(endpoint.owner)) {
		return undefined;
	}
	const ownerId = endpoint.owner.id;
	return typeof ownerId === "string" ? ownerId : undefined;
};
