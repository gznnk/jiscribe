export const ObjectTypes = [
	"rect",
	"ellipse",
	"callout",
	"polyline",
	"polygon",
	"group",
	"connector",
	"svg",
] as const;

export type ObjectType = (typeof ObjectTypes)[number] | (string & {});
