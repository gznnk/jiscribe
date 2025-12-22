// Import other libraries.
import type { OpenAI } from "openai";

export const PAGE_DESIGN_AGENT_INSTRUCTIONS = `
You are an AI agent specialized in creating sophisticated and beautiful web page designs using SVG shapes and elements.
Your role is to interpret user requirements and create production-ready, visually appealing page layouts with comprehensive detail.

Key responsibilities:
1. Analyze user requirements for web page design and create complete, detailed layouts
2. Generate multiple SVG elements to represent comprehensive page sections (header, navigation, hero sections, content areas, cards, sidebars, footer)
3. Use beautiful, modern color palettes that are harmonious and professional
4. Create detailed, pixel-perfect layouts that could be used directly in production
5. Focus on creating complete, functional designs rather than simple wireframes

Design principles to follow:
- Create comprehensive layouts with many detailed elements (buttons, cards, navigation items, content blocks, icons, etc.)
- Use modern, beautiful color palettes (consider gradients, complementary colors, professional schemes)
- Implement proper visual hierarchy with varying sizes, colors, and positioning
- Add decorative elements like shadows, borders, and subtle textures through color variations
- Create realistic content representations (multiple text blocks, image placeholders, button groups)
- Use grid-based layouts with proper spacing and alignment
- Include interactive elements like buttons, forms, cards, and navigation menus
- Apply modern design trends (cards, rounded corners, subtle shadows through overlapping shapes)
- IMPORTANT: Consider layering order - elements added later will appear on top of earlier elements
- Plan the stacking order: add background elements first, then content areas, and finally foreground elements like text and buttons
- Use strategic layering to create depth effects, shadows, and visual hierarchy
- Add background shapes before foreground details to ensure proper visual composition

Shape and text usage guidelines:
- LAYERING STRATEGY: Add elements in this order for proper visual stacking:
  1. Background shapes and containers (large rectangles for sections)
  2. Content area backgrounds (cards, panels, form backgrounds)
  3. Interactive elements with text (buttons, form fields, navigation items using add_rectangle_shape with text parameters)
  4. Standalone text elements (headings, descriptions using add_text_element)
  
TEXT PLACEMENT STRATEGY - CRITICAL:
- **Use add_rectangle_shape with text parameters for:** buttons, cards, badges, labels, form fields, navigation items, tabs, and any text that needs a background shape
- **Use add_text_element only for:** standalone headings, paragraphs, descriptions, and text that appears without a background shape
- **ALWAYS prefer add_rectangle_shape with text when creating interactive elements** like buttons, cards, or any element that combines a shape with text
- When creating buttons, navigation items, or cards, use add_rectangle_shape and specify the text, textAlign, verticalAlign, fontColor, fontSize, fontFamily, and fontWeight parameters
- This approach creates properly integrated text-shape combinations that look professional and maintain proper alignment

- Use many rectangles with text for interactive elements: buttons, navigation items, form fields, cards with titles
- Create depth with layered rectangles in different shades (darker backgrounds first, lighter overlays later)
- Use circles for avatars, icons, decorative elements, and profile buttons
- Build complete page sections with multiple interactive elements using rectangle text combinations
- Use overlapping elements strategically to create modern shadow effects and depth

Color selection:
- Choose beautiful, professional color palettes automatically
- Use complementary colors for accents and highlights
- Apply proper contrast for readability
- Consider brand-appropriate colors based on the context
- Use subtle gradients through color variations in layered shapes

Always create comprehensive, detailed designs with 15-30+ elements per page section.
Make designs that look production-ready and could be implemented directly.

CRITICAL GUIDELINES:
1. **Text Integration**: Always use add_rectangle_shape with text parameters for buttons, cards, navigation items, form fields, and interactive elements
2. **Layering Order**: Background elements first, interactive elements with text second, standalone text last
3. **Professional Appearance**: Use rectangle text combinations to create cohesive, integrated UI elements
4. **Text vs Shapes**: Reserve add_text_element only for standalone headings and descriptions without background shapes
5. **Strategic Grouping**: After creating logical UI components, use group_shapes to organize related elements:
   - Group navigation sections (nav background + menu items)
   - Group card components (card background + content + text)
   - Group form sections (form background + fields + labels + buttons)
   - Group header/footer areas (background + content)
   - Group button sets and interactive element clusters
   - Group hero sections (background + headlines + CTAs)

WORKFLOW APPROACH:
1. Create all elements for a logical UI component (e.g., navigation, card, form section)
2. Immediately group those related elements using group_shapes
3. Continue with the next logical component
4. This creates well-organized, maintainable designs with clear component boundaries

Use overlapping and layering strategically to create modern, professional designs with depth and visual hierarchy.
Always group logically related elements to create professional, organized layouts.
Respond in the same language as the user's input.
`;

export const ADD_RECTANGLE_SHAPE_DESCRIPTION = `
Adds a rectangle shape to the canvas at the specified position with optional text content.
PREFERRED METHOD for creating buttons, cards, navigation items, form fields, badges, and any interactive element that combines a shape with text.
Use this extensively to create detailed page layouts including: content areas, headers, footers, cards, buttons, navigation items, form fields, sidebars, hero sections, and background elements.

TEXT INTEGRATION: Always use the text parameters (text, textAlign, verticalAlign, fontColor, fontSize, fontFamily, fontWeight) when creating:
- Buttons with labels
- Navigation menu items
- Card titles and content
- Form field labels
- Badges and tags
- Interactive elements

Create layered designs with multiple rectangles to achieve depth and modern visual appeal.
IMPORTANT: Consider stacking order - add background rectangles first, then interactive elements with text.
Specify the top-left corner position (x, y) - the system will automatically calculate the center position.
Returns a JSON object containing the shape ID, type, and dimensions.
`;

export const ADD_CIRCLE_SHAPE_DESCRIPTION = `
Adds a circle shape to the canvas at the specified position.
Use circles for: user avatars, icons, decorative elements, buttons, badges, profile pictures, logo placeholders, and accent elements.
Combine with rectangles to create sophisticated layouts with visual interest.
IMPORTANT: Add circles after background rectangles but before text elements for proper layering.
Returns a JSON object containing the shape ID, type, and dimensions.
`;

export const ADD_TEXT_ELEMENT_DESCRIPTION = `
Adds a standalone text element to the canvas at the specified position.
USE ONLY FOR: standalone headings, paragraphs, descriptions, and text that appears WITHOUT a background shape.
DO NOT USE FOR: button text, navigation items, card titles, or any text that should have a background - use add_rectangle_shape with text parameters instead.

Appropriate use cases:
- Page headings and titles
- Standalone paragraphs and descriptions  
- Copyright notices and footnotes
- Standalone labels that don't need backgrounds

IMPORTANT: Always add text elements LAST to ensure they appear on top of all other elements.
Specify the top-left corner position (x, y) - the system will automatically calculate the center position for text alignment.
Returns a JSON object containing the text element ID, content, and positioning.
`;

export const GROUP_SHAPES_DESCRIPTION = `
Groups multiple shapes together by their IDs to create logical UI components.
Use this tool to organize related elements into cohesive units for better design structure and management.

STRATEGIC GROUPING - Group elements that form logical UI components:
- **Navigation sections**: Group navigation background, menu items, and navigation text together
- **Card components**: Group card background, content areas, and card text elements
- **Button sets**: Group multiple related buttons (like CTA button groups, form buttons)
- **Header/Footer sections**: Group background areas with their content elements
- **Form sections**: Group form background, input fields, labels, and submit buttons
- **Hero sections**: Group hero background, headline text, and CTA elements
- **Content blocks**: Group content background with related text and interactive elements

TIMING: Use group_shapes AFTER creating all related elements for a component section.
This ensures proper organization and makes the design more maintainable.

BENEFITS:
- Creates logical design structure
- Enables easier manipulation of component sections
- Improves design organization and maintainability
- Allows users to move entire UI sections as units

Use this tool strategically to create well-organized, professional layouts with clear component boundaries.
Returns a JSON object confirming the grouping operation with the affected shape IDs.
`;

export const PAGE_DESIGN_TOOLS = [
	{
		type: "function",
		name: "add_rectangle_shape",
		description: ADD_RECTANGLE_SHAPE_DESCRIPTION,
		parameters: {
			type: "object",
			properties: {
				x: {
					type: "number",
					description:
						"The X coordinate of the top-left corner of the rectangle.",
				},
				y: {
					type: "number",
					description:
						"The Y coordinate of the top-left corner of the rectangle.",
				},
				width: {
					type: "number",
					description: "The width of the rectangle in pixels.",
				},
				height: {
					type: "number",
					description: "The height of the rectangle in pixels.",
				},
				fill: {
					type: "string",
					description: "The fill color of the rectangle (hex color code).",
				},
				stroke: {
					type: "string",
					description: "The stroke color of the rectangle (hex color code).",
				},
				strokeWidth: {
					type: "number",
					description: "The width of the stroke in pixels.",
				},
				rx: {
					type: "number",
					description: "The border radius for rounded corners.",
				},
				text: {
					type: "string",
					description: "The text content to display inside the rectangle.",
				},
				textAlign: {
					type: "string",
					enum: ["left", "center", "right"],
					description: "Horizontal text alignment within the rectangle.",
				},
				verticalAlign: {
					type: "string",
					enum: ["top", "center", "bottom"],
					description: "Vertical text alignment within the rectangle.",
				},
				fontColor: {
					type: "string",
					description: "The color of the text (hex color code).",
				},
				fontSize: {
					type: "number",
					description: "The font size of the text in pixels.",
				},
				fontFamily: {
					type: "string",
					description: "The font family for the text.",
				},
				fontWeight: {
					type: "string",
					description: "The font weight (normal, bold, etc.).",
				},
			},
			additionalProperties: false,
			required: [
				"x",
				"y",
				"width",
				"height",
				"fill",
				"stroke",
				"strokeWidth",
				"rx",
				"text",
				"textAlign",
				"verticalAlign",
				"fontColor",
				"fontSize",
				"fontFamily",
				"fontWeight",
			],
		},
		strict: true,
	},
	{
		type: "function",
		name: "add_circle_shape",
		description: ADD_CIRCLE_SHAPE_DESCRIPTION,
		parameters: {
			type: "object",
			properties: {
				cx: {
					type: "number",
					description: "The X coordinate of the center of the circle.",
				},
				cy: {
					type: "number",
					description: "The Y coordinate of the center of the circle.",
				},
				r: {
					type: "number",
					description: "The radius of the circle in pixels.",
				},
				fill: {
					type: "string",
					description: "The fill color of the circle (hex color code).",
				},
				stroke: {
					type: "string",
					description: "The stroke color of the circle (hex color code).",
				},
				strokeWidth: {
					type: "number",
					description: "The width of the stroke in pixels.",
				},
			},
			additionalProperties: false,
			required: ["cx", "cy", "r", "fill", "stroke", "strokeWidth"],
		},
		strict: true,
	},
	{
		type: "function",
		name: "add_text_element",
		description: ADD_TEXT_ELEMENT_DESCRIPTION,
		parameters: {
			type: "object",
			properties: {
				x: {
					type: "number",
					description:
						"The X coordinate of the top-left corner position for the text.",
				},
				y: {
					type: "number",
					description:
						"The Y coordinate of the top-left corner position for the text.",
				},
				width: {
					type: "number",
					description: "The width of the text box in pixels.",
				},
				height: {
					type: "number",
					description: "The height of the text box in pixels.",
				},
				text: {
					type: "string",
					description: "The text content to display.",
				},
				fontSize: {
					type: "number",
					description: "The font size in pixels.",
				},
				fill: {
					type: "string",
					description: "The text color (hex color code).",
				},
				fontFamily: {
					type: "string",
					description: "The font family for the text.",
				},
				textAlign: {
					type: "string",
					description:
						"Text horizontal alignment: 'left', 'center', or 'right'.",
					enum: ["left", "center", "right"],
				},
				verticalAlign: {
					type: "string",
					description: "Text vertical alignment: 'top', 'center', or 'bottom'.",
					enum: ["top", "center", "bottom"],
				},
			},
			additionalProperties: false,
			required: [
				"x",
				"y",
				"width",
				"height",
				"text",
				"fontSize",
				"fill",
				"fontFamily",
				"textAlign",
				"verticalAlign",
			],
		},
		strict: true,
	},
	{
		type: "function",
		name: "group_shapes",
		description: GROUP_SHAPES_DESCRIPTION,
		parameters: {
			type: "object",
			properties: {
				shapeIds: {
					type: "array",
					items: {
						type: "string",
					},
					description:
						"Array of shape IDs to be grouped together. Must contain at least 2 shape IDs that represent a logical UI component.",
				},
			},
			additionalProperties: false,
			required: ["shapeIds"],
		},
		strict: true,
	},
] as const satisfies OpenAI.Responses.Tool[];
