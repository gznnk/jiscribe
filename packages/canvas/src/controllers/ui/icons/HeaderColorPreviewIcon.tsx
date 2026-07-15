import { memo } from "react";

type HeaderColorPreviewIconProps = {
	color: string;
	size?: number;
	title?: string;
};

const FRAME_STROKE = "rgba(128, 128, 128, 0.75)";

/**
 * Header-color preview: a container glyph whose top band is filled with `color`
 * and separated from the body by an underline — so it reads as "header" (not a
 * plain colored square) and sits distinctly beside the body-fill / border
 * swatches. Sized to roughly match the body-fill circle icon.
 */
const HeaderColorPreviewIconComponent: React.FC<
	HeaderColorPreviewIconProps
> = ({ color, size = 24, title = "Header Color" }) => {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
		>
			<title>{title}</title>
			{/* Colored header band, top corners rounded to match the frame. */}
			<path
				d="M3 5.5 Q3 3.5 5 3.5 H19 Q21 3.5 21 5.5 V10 H3 Z"
				style={{ fill: color }}
			/>
			{/* Underline dividing header from body — the key affordance. Inset to the
			    band width so it does not poke past the frame walls. */}
			<line
				x1="3"
				y1="10"
				x2="21"
				y2="10"
				stroke={FRAME_STROKE}
				strokeWidth="1.5"
			/>
			{/* Container outline, drawn last so it caps the band edges cleanly. */}
			<rect
				x="2.5"
				y="3"
				width="19"
				height="18"
				rx="2.5"
				fill="none"
				stroke={FRAME_STROKE}
				strokeWidth="1.5"
			/>
		</svg>
	);
};

export const HeaderColorPreviewIcon = memo(HeaderColorPreviewIconComponent);
