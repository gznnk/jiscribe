/**
 * Gets the endpoint being edited from a control's targetAction.
 * "endpoint:source" -> "source"
 * "endpoint:target" -> "target"
 * Creation mode ("anchor:...") or a format mismatch falls back to "target"
 * (the default).
 */
export function getEditingEndpoint(
	targetAction: string | undefined,
): "source" | "target" {
	if (
		targetAction === "endpoint:source" ||
		targetAction === "endpoint:target"
	) {
		return targetAction.slice("endpoint:".length) as "source" | "target";
	}

	// Default to "target" for creation mode
	return "target";
}
