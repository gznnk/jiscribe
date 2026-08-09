export const ObjectTypes = [
	"rect",
	"ellipse",
	"text",
	"polyline",
	"polygon",
	"group",
	"connector",
	"svg",
] as const;

export type ObjectType = (typeof ObjectTypes)[number] | (string & {});
