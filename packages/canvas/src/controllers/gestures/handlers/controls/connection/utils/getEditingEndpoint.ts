/**
 * Gets the endpoint being edited from a control's targetId.
 * "connection-anchor:edit:connectorId:source" -> "source"
 * "connection-anchor:edit:connectorId:target" -> "target"
 * Creation mode ("connection-anchor:create:...") or a format mismatch falls back
 * to "target" (the default).
 */
export function getEditingEndpoint(
	targetId: string | undefined,
): "source" | "target" {
	if (!targetId) {
		return "target";
	}

	const parts = targetId.split(":");
	// Format: "connection-anchor:edit:connectorId:endpoint"
	if (parts.length === 4 && parts[1] === "edit") {
		const endpoint = parts[3];
		if (endpoint === "source" || endpoint === "target") {
			return endpoint;
		}
	}

	// Default to "target" for creation mode
	return "target";
}
