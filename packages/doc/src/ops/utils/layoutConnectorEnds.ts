import type { EndpointRef } from "../../model/objects/types/EndpointRef";

export const readOwnerId = (endpoint: EndpointRef): string | undefined =>
	endpoint.owner?.id;
