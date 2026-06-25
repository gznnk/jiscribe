export const ObjectTypes = [
	"rect",
	"ellipse",
	"diamond",
	"polyline",
	"polygon",
	"group",
	"connector",
	"sticky",
	"svg",
] as const;

export type ObjectType = (typeof ObjectTypes)[number] | (string & {});
