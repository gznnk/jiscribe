import { COMMENT_AVATAR_COLORS } from "../CommentsConstants";

/**
 * Picks the avatar background of a writer, so the same name always draws the
 * same color without anything being stored alongside the comment.
 *
 * @param author - The comment's `author`, compared as written; an empty string is a valid input and maps to the first color
 * @returns One of {@link COMMENT_AVATAR_COLORS} as a CSS color
 */
export const pickAvatarColor = (author: string): string => {
	let hash = 0;
	for (let index = 0; index < author.length; index++) {
		// Keep the running value inside the 32-bit range `|` operates on, so a long
		// name cannot drift into the float space where the low bits stop changing.
		hash = (hash * 31 + author.charCodeAt(index)) | 0;
	}
	return COMMENT_AVATAR_COLORS[Math.abs(hash) % COMMENT_AVATAR_COLORS.length];
};

/**
 * The single character drawn on the avatar.
 *
 * @param author - The comment's `author`; leading whitespace is skipped, and a blank name gives `"?"`
 * @returns One upper-cased character, or `"?"`; astral characters (an emoji as a name) come back whole
 */
export const pickAvatarInitial = (author: string): string => {
	const trimmed = author.trim();
	if (trimmed === "") {
		return "?";
	}
	return [...trimmed][0].toUpperCase();
};
