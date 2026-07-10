export const ObjectTypes = [
	"rect",
	"ellipse",
	"diamond",
	"db",
	"polyline",
	"polygon",
	"group",
	"connector",
	"sticky",
	"svg",
] as const;

export type ObjectType = (typeof ObjectTypes)[number] | (string & {});
