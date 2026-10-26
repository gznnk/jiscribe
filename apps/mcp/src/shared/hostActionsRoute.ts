// The actions a viewer can ask the process owning the canvas host to carry out,
// and the route it asks through. A browser viewer has none: the stdio server
// owns no window and no file dialog. The desktop app offers what its native
// menu used to: putting a file open dialog up, and quitting.
//
// Which actions exist is announced with the session token (GET /api/session,
// see ./fileApiRoute), so a viewer draws a menu only when there is something
// behind it. Asking is a POST to HOST_ACTION_API_PATHNAME carrying the session
// token, guarded as a write is. What answers it — the callbacks the owner hands
// the host — is the host's alone (HostActions in ../host/canvasHostTypes).

/** The endpoint an action is asked through, on both the host's router and the viewer's fetch */
export const HOST_ACTION_API_PATHNAME = "/api/action";

/** Every action a host may offer, in the order a menu lists them */
export const HOST_ACTION_NAMES = ["openFile", "quit"] as const;

/**
 * One action: `openFile` puts the owner's file open dialog up and opens what is
 * chosen; `quit` ends the owning process, windows included
 */
export type HostActionName = (typeof HOST_ACTION_NAMES)[number];

/**
 * Whether `value` names an action, which is what the host checks a request body
 * against before looking the action up.
 *
 * @param value Anything parsed out of a request body
 */
export const isHostActionName = (value: unknown): value is HostActionName =>
	typeof value === "string" &&
	(HOST_ACTION_NAMES as readonly string[]).includes(value);

/**
 * What GET /api/session answers. `actions` lists what this host offers, empty
 * for a host whose owner offers nothing (a viewer from before this field reads
 * only `token`)
 */
export type SessionApiResponse = {
	token: string;
	actions: readonly HostActionName[];
};

/** The body of a POST to HOST_ACTION_API_PATHNAME */
export type HostActionRequestBody = {
	action: HostActionName;
};

/**
 * The status an action request gets once the owner's callback has settled. The
 * viewer takes any other status for a refusal, so both sides spell it out
 */
export const HOST_ACTION_DONE_STATUS = 204;
