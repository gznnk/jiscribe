# Adding New Shapes to SVG Canvas

This document outlines the complete procedure for adding new shapes to the SVG canvas system. The architecture follows a structured pattern that ensures consistency and maintainability across all shape implementations.

## Architecture Overview

The SVG canvas shape system consists of several key components:

- **Components**: React components that render the shapes
- **Types**: TypeScript definitions for data and state
- **Constants**: Default values for data and state
- **Utils**: Utility functions for shape operations
- **Registry**: Central registration system for shape definitions

## Diagram Element Types: Shapes, Elements, Nodes vs. Diagrams

Before adding new elements, it's important to understand the distinctions:

- **Shapes**: Basic geometric elements (Rectangle, Ellipse, Path, etc.) - placed in `shapes/` folders
- **Elements**: UI elements and components (Button, Input, Frame, NodeHeader, etc.) - placed in `elements/` folders
- **Nodes**: Workflow/diagram nodes with specific business logic (LLM, Agent, Hub, etc.) - placed in `nodes/` folders
- **Diagrams**: Complete diagram templates and compositions - placed in `diagrams/` folders

All follow similar patterns but have different purposes and locations.

## Required Files Checklist

When adding a new diagram element (e.g., "MyShape", "MyElement", "MyNode", "MyDiagram"), you must create the following files:

### 1. Component Files

**For Shapes:**

```
src/features/svg-canvas/components/shapes/MyShape/
├── index.tsx                    # Export barrel
├── MyShape.tsx                  # Main component
├── MyShapeMinimap.tsx          # Minimap representation
└── MyShapeStyled.tsx           # Styled components (if needed)
```

**For Elements:**

```
src/features/svg-canvas/components/elements/MyElement/
├── index.tsx                    # Export barrel
├── MyElement.tsx               # Main component
├── MyElementMinimap.tsx        # Minimap representation
└── MyElementStyled.tsx         # Styled components (if needed)
```

**For Workflow Nodes:**

```
src/features/svg-canvas/components/nodes/MyNode/
├── index.tsx                    # Export barrel
├── MyNode.tsx                   # Main component
├── MyNodeMinimap.tsx           # Minimap representation
└── MyNodeStyled.tsx            # Styled components (if needed)
```

**For Diagrams:**

```
src/features/svg-canvas/components/diagrams/MyDiagram/
├── index.tsx                    # Export barrel
├── MyDiagram.tsx               # Main component
├── MyDiagramMinimap.tsx        # Minimap representation
└── MyDiagramStyled.tsx         # Styled components (if needed)
```

```

### 2. Type Definitions

**For Shapes:**
```

src/features/svg-canvas/types/data/shapes/MyShapeData.ts # Data type definition
src/features/svg-canvas/types/state/shapes/MyShapeState.ts # State type definition  
src/features/svg-canvas/types/props/shapes/MyShapeProps.ts # Props type definition

```

**For Elements:**
```

src/features/svg-canvas/types/data/elements/MyElementData.ts # Data type definition
src/features/svg-canvas/types/state/elements/MyElementState.ts # State type definition  
src/features/svg-canvas/types/props/elements/MyElementProps.ts # Props type definition

```

**For Workflow Nodes:**
```

src/features/svg-canvas/types/data/nodes/MyNodeData.ts # Data type definition
src/features/svg-canvas/types/state/nodes/MyNodeState.ts # State type definition  
src/features/svg-canvas/types/props/nodes/MyNodeProps.ts # Props type definition

```

**For Diagrams:**
```

src/features/svg-canvas/types/data/diagrams/MyDiagramData.ts # Data type definition
src/features/svg-canvas/types/state/diagrams/MyDiagramState.ts # State type definition  
src/features/svg-canvas/types/props/diagrams/MyDiagramProps.ts # Props type definition

```

```

### 3. Default Values

**For Shapes:**

```
src/features/svg-canvas/constants/data/shapes/MyShapeDefaultData.ts    # Default data values
src/features/svg-canvas/constants/state/shapes/MyShapeDefaultState.ts  # Default state values
```

**For Elements:**

```
src/features/svg-canvas/constants/data/elements/MyElementDefaultData.ts    # Default data values
src/features/svg-canvas/constants/state/elements/MyElementDefaultState.ts  # Default state values
```

**For Workflow Nodes:**

```
src/features/svg-canvas/constants/data/nodes/MyNodeDefaultData.ts      # Default data values
src/features/svg-canvas/constants/state/nodes/MyNodeDefaultState.ts    # Default state values
```

**For Diagrams:**

```
src/features/svg-canvas/constants/data/diagrams/MyDiagramDefaultData.ts    # Default data values
src/features/svg-canvas/constants/state/diagrams/MyDiagramDefaultState.ts  # Default state values
```

```

### 4. Menu Configuration

**For Shapes:**
```

src/features/svg-canvas/constants/menu/shapes/MyShapeMenuConfig.ts # Menu configuration

```

**For Elements:**
```

src/features/svg-canvas/constants/menu/elements/MyElementMenuConfig.ts # Menu configuration

```

**For Workflow Nodes:**
```

src/features/svg-canvas/constants/menu/nodes/MyNodeMenuConfig.ts # Menu configuration

```

**For Diagrams:**
```

src/features/svg-canvas/constants/menu/diagrams/MyDiagramMenuConfig.ts # Menu configuration

```

### 5. Utility Functions

**For Shapes:**
```

src/features/svg-canvas/utils/shapes/myShape/
├── createMyShapeState.ts # State creation function
├── mapMyShapeDataToState.ts # Data to state mapper
├── mapMyShapeStateToData.ts # State to data mapper
├── calcMyShapeConnectPointPosition.ts # Connect point calculator (if connectable)
└── createMyShapeConnectPoint.ts # Connect point creator (if connectable)

```

**For Elements:**
```

src/features/svg-canvas/utils/elements/myElement/
├── createMyElementState.ts # State creation function
├── mapMyElementDataToState.ts # Data to state mapper
├── mapMyElementStateToData.ts # State to data mapper
├── calcMyElementConnectPointPosition.ts # Connect point calculator (if connectable)
└── createMyElementConnectPoint.ts # Connect point creator (if connectable)

```

**For Workflow Nodes:**
```

src/features/svg-canvas/utils/nodes/myNode/
├── createMyNodeState.ts # State creation function
├── mapMyNodeDataToState.ts # Data to state mapper
├── mapMyNodeStateToData.ts # State to data mapper
├── calcMyNodeConnectPointPosition.ts # Connect point calculator (if connectable)
└── createMyNodeConnectPoint.ts # Connect point creator (if connectable)

```

**For Diagrams:**
```

src/features/svg-canvas/utils/diagrams/myDiagram/
├── createMyDiagramState.ts # State creation function
├── mapMyDiagramDataToState.ts # Data to state mapper
├── mapMyDiagramStateToData.ts # State to data mapper
├── calcMyDiagramConnectPointPosition.ts # Connect point calculator (if connectable)
└── createMyDiagramConnectPoint.ts # Connect point creator (if connectable)

```

```

## Step-by-Step Implementation Guide

**Note**: This guide uses "MyShape" as an example for basic shapes. For elements, replace with "MyElement" and use `elements/`. For workflow nodes, replace with "MyNode" and use `nodes/`. For diagrams, replace with "MyDiagram" and use `diagrams/`.

**Important**: The catalog union types (DiagramData and Diagram) have been simplified and no longer require manual updates. They now export the base types directly, so you don't need to add your new types to union lists.

### Step 1: Define Shape Features and Data Type

Create `src/features/svg-canvas/types/data/shapes/MyShapeData.ts`:

```typescript
import type { DiagramFeatures } from "../../core/DiagramFeatures";
import type { CreateDataType } from "./CreateDataType";

/**
 * Diagram features for MyShape shapes.
 */
export const MyShapeFeatures = {
	frameable: true, // Frame properties (position, size, rotation, scale)
	selectable: true, // Basic selection capability
	transformative: true, // Position, size, and rotation transformation
	itemable: false, // Container for other diagram items
	connectable: true, // Connection points and lines
	strokable: true, // Stroke/border styling
	fillable: true, // Fill/background styling
	cornerRoundable: true, // Corner radius styling
	textable: true, // Text content and styling
	executable: false, // Executable/clickable functionality
	fileDroppable: false, // File drop handling
} as const satisfies DiagramFeatures;

/**
 * Data type for MyShape shapes.
 * Contains properties specific to MyShape diagram elements.
 */
export type MyShapeData = CreateDataType<typeof MyShapeFeatures> & {
	// Add shape-specific properties here
	customProperty: number;
};
```

### Step 2: Define State Type

Create `src/features/svg-canvas/types/state/shapes/MyShapeState.ts`:

```typescript
import type {
	MyShapeData,
	MyShapeFeatures,
} from "../../data/shapes/MyShapeData";
import type { CreateStateType } from "./CreateStateType";

/**
 * State type for MyShape shapes.
 * Contains properties specific to MyShape diagram elements.
 */
export type MyShapeState = CreateStateType<MyShapeData, typeof MyShapeFeatures>;
```

### Step 3: Define Props Type

Create `src/features/svg-canvas/types/props/shapes/MyShapeProps.ts`:

```typescript
import type { MyShapeFeatures } from "../../data/shapes/MyShapeData";
import type { MyShapeState } from "../../state/shapes/MyShapeState";
import type { CreateDiagramProps } from "./CreateDiagramProps";

/**
 * Props for MyShape component
 */
export type MyShapeProps = CreateDiagramProps<
	MyShapeState,
	typeof MyShapeFeatures
>;
```

### Step 4: Create Default Data Values

Create `src/features/svg-canvas/constants/data/shapes/MyShapeDefaultData.ts`:

```typescript
import type { MyShapeData } from "../../../types/data/shapes/MyShapeData";
import { MyShapeFeatures } from "../../../types/data/shapes/MyShapeData";
import { CreateDefaultData } from "./CreateDefaultData";

/**
 * Default data values for MyShape
 */
export const MyShapeDefaultData: MyShapeData = CreateDefaultData<MyShapeData>({
	type: "MyShape",
	options: MyShapeFeatures,
	properties: {
		// Add shape-specific default properties here
		width: 100,
		height: 100,
		fill: "#ffffff",
		stroke: "#000000",
		strokeWidth: "1px",
		text: "MyShape",
		fontSize: 14,
		fontColor: "#000000",
		fontWeight: "normal",
		textAlign: "center",
		verticalAlign: "center",
		customProperty: 0, // your custom properties
	},
});
```

### Step 5: Create Menu Configuration

Menu configuration controls which menu items are displayed when your shape is selected. The `createMenuConfig()` utility automatically generates menu configuration based on your shape's features.

Create `src/features/svg-canvas/constants/menu/shapes/MyShapeMenuConfig.ts`:

```typescript
import { createMenuConfig } from "../core/createMenuConfig";
import { MyShapeFeatures } from "../../../types/data/shapes/MyShapeData";
import type { DiagramMenuConfig } from "../../../types/menu/DiagramMenuConfig";

/**
 * Menu configuration for MyShape.
 *
 * The createMenuConfig() utility automatically generates menu items based on features:
 * - fillable: true → backgroundColor menu
 * - strokable: true → borderColor and borderStyle menus
 * - cornerRoundable: true → borderStyle.radius control
 * - textable: true → fontStyle and textAlignment menus
 * - transformative: true → aspectRatio menu
 *
 * You can override specific properties or add additional menu items:
 */
export const MyShapeMenuConfig: DiagramMenuConfig =
	createMenuConfig(MyShapeFeatures);

// Example with overrides:
// export const MyShapeMenuConfig: DiagramMenuConfig = {
//   ...createMenuConfig(MyShapeFeatures),
//   aspectRatio: false,  // Disable aspect ratio lock
//   borderStyle: {
//     radius: false,     // Disable corner radius control
//   },
// };

// Example for connectable shapes (like Path or ConnectLine):
// export const MyShapeMenuConfig: DiagramMenuConfig = {
//   ...createMenuConfig(MyShapeFeatures),
//   arrowHead: true,      // Enable arrow head controls
//   lineStyle: true,      // Enable line style (width, dash pattern)
//   lineColor: true,      // Enable line color picker
//   borderColor: false,   // Disable border color (use lineColor instead)
//   borderStyle: undefined, // Remove border style menu
// };
```

**Available Menu Configuration Properties:**

| Property             | Type                   | Description                                                                               |
| -------------------- | ---------------------- | ----------------------------------------------------------------------------------------- |
| `backgroundColor`    | `boolean`              | Show/hide background color picker (auto-enabled if `fillable: true`)                      |
| `borderColor`        | `boolean`              | Show/hide border/stroke color picker (auto-enabled if `strokable: true`)                  |
| `lineColor`          | `boolean`              | Show/hide line color picker (for connectors and paths)                                    |
| `borderStyle`        | `{ radius?: boolean }` | Show/hide border styling with optional radius control (auto-enabled if `strokable: true`) |
| `borderStyle.radius` | `boolean`              | Show/hide corner radius control (auto-enabled if `cornerRoundable: true`)                 |
| `arrowHead`          | `boolean`              | Show/hide arrow head controls (for connectors and paths)                                  |
| `lineStyle`          | `boolean`              | Show/hide line style options - width, dash pattern (for connectors and paths)             |
| `fontStyle`          | `boolean`              | Show/hide font controls - size, color, bold (auto-enabled if `textable: true`)            |
| `textAlignment`      | `boolean`              | Show/hide text alignment controls (auto-enabled if `textable: true`)                      |
| `aspectRatio`        | `boolean`              | Show/hide aspect ratio lock control (auto-enabled if `transformative: true`)              |

**Menu Configuration Examples:**

```typescript
// Simple shape with automatic configuration
export const RectangleMenuConfig: DiagramMenuConfig =
	createMenuConfig(RectangleFeatures);

// Connector with line-specific controls
export const ConnectLineMenuConfig: DiagramMenuConfig = {
	...createMenuConfig(ConnectLineFeatures),
	aspectRatio: false, // Disable aspect ratio
	arrowHead: true, // Enable arrow controls
	lineStyle: true, // Enable line width/dash
	lineColor: true, // Enable line color
	borderColor: false, // Disable border color
	borderStyle: undefined, // Remove border style menu
};

// Path with custom overrides
export const PathMenuConfig: DiagramMenuConfig = {
	...createMenuConfig(PathFeatures),
	arrowHead: true, // Enable arrow controls
	lineStyle: true, // Enable line width/dash
	lineColor: true, // Enable line color
	borderColor: false, // Disable border color
	borderStyle: undefined, // Remove border style menu
};
```

### Step 6: Create Default State Values

Create `src/features/svg-canvas/constants/state/shapes/MyShapeDefaultState.ts`:

```typescript
import { MyShapeFeatures } from "../../../types/data/shapes/MyShapeData";
import type { MyShapeState } from "../../../types/state/shapes/MyShapeState";
import { MyShapeDefaultData } from "../../data/shapes/MyShapeDefaultData";
import { CreateDefaultState } from "./CreateDefaultState";

/**
 * Default state values for MyShape
 */
export const MyShapeDefaultState: MyShapeState =
	CreateDefaultState<MyShapeState>({
		type: "MyShape",
		options: MyShapeFeatures,
		baseData: MyShapeDefaultData,
	});
```

### Step 7: Implement Utility Functions

Create the state creation function in `src/features/svg-canvas/utils/shapes/myShape/createMyShapeState.ts`:

```typescript
import type { MyShapeState } from "../../../types/state/shapes/MyShapeState";
import { MyShapeDefaultState } from "../../../constants/state/shapes/MyShapeDefaultState";
import { newId } from "../common/newId";

/**
 * Create MyShape state
 */
export const createMyShapeState = ({
	x,
	y,
}: {
	x: number;
	y: number;
}): MyShapeState => ({
	...MyShapeDefaultState,
	id: newId(),
	x,
	y,
});
```

Create data-to-state mapper in `src/features/svg-canvas/utils/shapes/myShape/mapMyShapeDataToState.ts`:

```typescript
import { MyShapeDefaultState } from "../../../constants/state/shapes/MyShapeDefaultState";
import type { DiagramData } from "../../../types/data/core/DiagramData";
import type { Diagram } from "../../../types/state/core/Diagram";
import type { MyShapeState } from "../../../types/state/shapes/MyShapeState";
import { createDataToStateMapper } from "../../core/createDataToStateMapper";

/**
 * Maps MyShape data to state
 */
export const mapMyShapeDataToState =
	createDataToStateMapper<MyShapeState>(MyShapeDefaultState);

export const myShapeDataToState = (data: DiagramData): Diagram =>
	mapMyShapeDataToState(data);
```

Create state-to-data mapper in `src/features/svg-canvas/utils/shapes/myShape/mapMyShapeStateToData.ts`:

```typescript
import { MyShapeDefaultData } from "../../../constants/data/shapes/MyShapeDefaultData";
import type { DiagramData } from "../../../types/data/core/DiagramData";
import type { MyShapeData } from "../../../types/data/shapes/MyShapeData";
import type { Diagram } from "../../../types/state/core/Diagram";
import type { MyShapeState } from "../../../types/state/shapes/MyShapeState";
import { createStateToDataMapper } from "../../core/createStateToDataMapper";

/**
 * Maps MyShape state to data
 */
export const mapMyShapeStateToData =
	createStateToDataMapper<MyShapeData>(MyShapeDefaultData);

export const myShapeStateToData = (state: Diagram): DiagramData =>
	mapMyShapeStateToData(state as MyShapeState);
```

### Step 8: Implement Connect Point Functions (if connectable)

If your shape supports connections, create connect point calculator in `src/features/svg-canvas/utils/shapes/myShape/calcMyShapeConnectPointPosition.ts`:

```typescript
import type { Diagram } from "../../../types/state/catalog/Diagram";
import type { ConnectPointState } from "../../../types/state/shapes/ConnectPointState";
import type { MyShapeState } from "../../../types/state/shapes/MyShapeState";
import { createMyShapeConnectPoint } from "./createMyShapeConnectPoint";

/**
 * Calculate connect point positions for MyShape
 */
export const calcMyShapeConnectPointPosition = (
	diagram: Diagram,
): ConnectPointState[] => {
	const shape = diagram as MyShapeState;
	return [
		createMyShapeConnectPoint(shape, "top"),
		createMyShapeConnectPoint(shape, "right"),
		createMyShapeConnectPoint(shape, "bottom"),
		createMyShapeConnectPoint(shape, "left"),
	];
};
```

Create connect point creator in `src/features/svg-canvas/utils/shapes/myShape/createMyShapeConnectPoint.ts`:

```typescript
import type { ConnectPointState } from "../../../types/state/shapes/ConnectPointState";
import type { MyShapeState } from "../../../types/state/shapes/MyShapeState";
import { ConnectPointDefaultState } from "../../../constants/state/shapes/ConnectPointDefaultState";
import { newId } from "../common/newId";

/**
 * Create connect point for MyShape
 */
export const createMyShapeConnectPoint = (
	shape: MyShapeState,
	position: "top" | "right" | "bottom" | "left",
): ConnectPointState => {
	// Calculate position based on shape dimensions and position
	let x = shape.x;
	let y = shape.y;

	switch (position) {
		case "top":
			y = shape.y - shape.height / 2;
			break;
		case "right":
			x = shape.x + shape.width / 2;
			break;
		case "bottom":
			y = shape.y + shape.height / 2;
			break;
		case "left":
			x = shape.x - shape.width / 2;
			break;
	}

	return {
		...ConnectPointDefaultState,
		id: newId(),
		x,
		y,
		ownerId: shape.id,
	};
};
```

### Step 9: Implement React Components

Create the main component in `src/features/svg-canvas/components/shapes/MyShape/MyShape.tsx`:

```typescript
// Import React.
import type React from "react";
import { memo, useMemo, useRef } from "react";
import type { MyShapeProps } from "../../../types/props/shapes/MyShapeProps";
import { Outline } from "../../core/Outline";
import { PositionLabel } from "../../core/PositionLabel";
import { Textable } from "../../core/Textable";
import { Transformative } from "../../core/Transformative";
import { ConnectPoints } from "../ConnectPoints";
import { useClick } from "../../../hooks/useClick";
import { useDrag } from "../../../hooks/useDrag";
import { useFileDrop } from "../../../hooks/useFileDrop";
import { useHover } from "../../../hooks/useHover";
import { useSelect } from "../../../hooks/useSelect";
import { useText } from "../../../hooks/useText";
import { mergeProps } from "../../../utils/core/mergeProps";
import { degreesToRadians } from "../../../utils/math/common/degreesToRadians";
import { createSvgTransform } from "../../../utils/shapes/common/createSvgTransform";

/**
 * MyShape component
 */
const MyShapeComponent: React.FC<MyShapeProps> = ({
	// Extract all required props here
	id,
	x,
	y,
	width,
	height,
	// ... other props
}) => {
	// Reference to the SVG element to be transformed
	const svgRef = useRef<SVGElement>({} as SVGElement);

	// Implement hooks for interaction (drag, click, select, etc.)
	const { onDoubleClick } = useText({
		id,
		isSelected,
		isTextEditEnabled,
		onTextChange,
	});

	const dragProps = useDrag({
		id,
		type: "MyShape",
		x,
		y,
		ref: svgRef,
		onDrag,
		onDragOver,
		onDragLeave,
	});

	// ... other hooks

	// Merge all interaction props
	const composedProps = mergeProps(
		dragProps,
		clickProps,
		selectProps,
		hoverProps,
		fileDropProps,
	);

	// Memoize owner shape for connect points
	const ownerShape = useMemo(
		() => ({
			x,
			y,
			width,
			height,
			rotation,
			scaleX,
			scaleY,
		}),
		[x, y, width, height, rotation, scaleX, scaleY],
	);

	// Generate transform attribute
	const transform = createSvgTransform(
		scaleX,
		scaleY,
		degreesToRadians(rotation),
		x,
		y,
	);

	return (
		<>
			{/* Main SVG element - implement your shape here */}
			{/* Example: <rect>, <circle>, <path>, etc. */}

			{/* Text support */}
			{isTextEditEnabled && (
				<Textable
					x={-width / 2}
					y={-height / 2}
					width={width}
					height={height}
					transform={transform}
					text={text}
					textType={textType}
					fontColor={fontColor}
					fontSize={fontSize}
					fontFamily={fontFamily}
					fontWeight={fontWeight}
					textAlign={textAlign}
					verticalAlign={verticalAlign}
					isTextEditing={isTextEditing}
				/>
			)}

			{/* Selection outline */}
			<Outline
				x={x}
				y={y}
				width={width}
				height={height}
				rotation={rotation}
				scaleX={scaleX}
				scaleY={scaleY}
				showOutline={showOutline}
			/>

			{/* Connect points */}
			<ConnectPoints
				ownerId={id}
				ownerShape={ownerShape}
				connectPoints={connectPoints}
				showConnectPoints={showConnectPoints}
				shouldRender={!isDragging && !isTransforming && !isSelected}
				onConnect={onConnect}
				onPreviewConnectLine={onPreviewConnectLine}
			/>

			{/* Position label during drag */}
			{isSelected && isDragging && (
				<PositionLabel
					x={x}
					y={y}
					width={width}
					height={height}
					rotation={rotation}
					scaleX={scaleX}
					scaleY={scaleY}
				/>
			)}
		</>
	);
};

export const MyShape = memo(MyShapeComponent);
```

Create the minimap component in `src/features/svg-canvas/components/shapes/MyShape/MyShapeMinimap.tsx`:

```typescript
import type React from "react";
import { memo } from "react";
import type { MyShapeProps } from "../../../types/props/shapes/MyShapeProps";
import { degreesToRadians } from "../../../utils/math/common/degreesToRadians";
import { createSvgTransform } from "../../../utils/shapes/common/createSvgTransform";

/**
 * MyShape minimap component (simplified version for minimap)
 */
const MyShapeMinimapComponent: React.FC<MyShapeProps> = ({
	x,
	y,
	width,
	height,
	rotation,
	scaleX,
	scaleY,
	fill,
	stroke,
	strokeWidth,
}) => {
	// Generate transform attribute
	const transform = createSvgTransform(
		scaleX,
		scaleY,
		degreesToRadians(rotation),
		x,
		y,
	);

	return (
		<>
			{/* Simplified version of your shape for minimap */}
			{/* Remove interactivity, text, and complex features */}
		</>
	);
};

export const MyShapeMinimap = memo(MyShapeMinimapComponent);
```

Create the export barrel in `src/features/svg-canvas/components/shapes/MyShape/index.tsx`:

```typescript
export { MyShape } from "./MyShape";
export { MyShapeMinimap } from "./MyShapeMinimap";
```

### Step 10: Create Atlas Object

Create an Atlas object for your shape/node.

**For Shapes**, create in `src/features/svg-canvas/atlas/shapes/MyShapeAtlas.ts`:  
**For Workflow Nodes**, create in `src/features/svg-canvas/atlas/nodes/MyNodeAtlas.ts`:

```typescript
import type {
	DiagramAtlas,
	DataToStateMapper,
	StateToDataMapper,
} from "../DiagramAtlas";
import type { MyShapeData } from "../../types/data/shapes/MyShapeData";
import type { MyShapeState } from "../../types/state/shapes/MyShapeState";
import type { MyShapeProps } from "../../types/props/shapes/MyShapeProps";
import { MyShapeFeatures } from "../../types/data/shapes/MyShapeData";
import { MyShapeDefaultData } from "../../constants/data/shapes/MyShapeDefaultData";
import { MyShapeDefaultState } from "../../constants/state/shapes/MyShapeDefaultState";
import { MyShapeMenuConfig } from "../../constants/menu/shapes/MyShapeMenuConfig";
import { MyShape, MyShapeMinimap } from "../../components/shapes/MyShape";
import { createMyShapeState } from "../../utils/shapes/myShape/createMyShapeState";
import { calcMyShapeConnectPointPosition } from "../../utils/shapes/myShape/calcMyShapeConnectPointPosition";
import { mapMyShapeDataToState } from "../../utils/shapes/myShape/mapMyShapeDataToState";
import { mapMyShapeStateToData } from "../../utils/shapes/myShape/mapMyShapeStateToData";

/**
 * MyShape Atlas (or MyNode Atlas for workflow nodes)
 *
 * Complete index and registry for MyShape-related components.
 * This atlas provides centralized access to all MyShape-related types,
 * default values, components, and utility functions.
 */

/**
 * MyShape Atlas Type Definition
 */
type MyShapeAtlas = DiagramAtlas<MyShapeData, MyShapeState, MyShapeProps>;

/**
 * MyShape Atlas Implementation
 */
export const MyShapeAtlas: MyShapeAtlas = {
	// ============================================================================
	// Types
	// ============================================================================

	type: "MyShape",
	features: MyShapeFeatures,

	// ============================================================================
	// Defaults
	// ============================================================================

	defaultData: MyShapeDefaultData,
	defaultState: MyShapeDefaultState,

	// ============================================================================
	// Menu Configuration
	// ============================================================================

	menuConfig: MyShapeMenuConfig,

	// ============================================================================
	// Components
	// ============================================================================

	component: MyShape,
	minimapComponent: MyShapeMinimap,

	// ============================================================================
	// Utility Functions
	// ============================================================================

	createState: createMyShapeState,
	export: undefined, // Optional: implement if shape can be exported
	calcConnectPointPosition: calcMyShapeConnectPointPosition,
	transformItems: undefined, // Optional: implement if shape can transform child items
	dataToState: mapMyShapeDataToState as DataToStateMapper,
	stateToData: mapMyShapeStateToData as StateToDataMapper,
};
```

**Note for Workflow Nodes**: Replace `shapes/` paths with `nodes/` and use appropriate node-specific imports (e.g., `calcRectangleConnectPointPosition` for most nodes).

**Important**: The `menuConfig` property in the Atlas defines which menu items are shown when the shape is selected. Use `createMenuConfig(MyShapeFeatures)` for automatic configuration based on features, or customize it with overrides for specific menu items.

### Step 11: Register the Atlas

Add your Atlas to the registry in `src/features/svg-canvas/canvas/SvgCanvasRegistry.ts`:

```typescript
// Import your Atlas object
import { MyShapeAtlas } from "../atlas/shapes/MyShapeAtlas";
// OR for elements: import { MyElementAtlas } from "../atlas/elements/MyElementAtlas";
// OR for nodes: import { MyNodeAtlas } from "../atlas/nodes/MyNodeAtlas";
// OR for diagrams: import { MyDiagramAtlas } from "../atlas/diagrams/MyDiagramAtlas";

// Register your Atlas in the appropriate category (maintain alphabetical order)
export const initializeSvgCanvasDiagrams = (): void => {
	// Clear existing registrations to avoid duplicates
	DiagramRegistry.clear();

	// ============================================================================
	// Shape Atlas Registration
	// ============================================================================
	DiagramRegistry.register(ConnectLineAtlas);
	DiagramRegistry.register(EllipseAtlas);
	DiagramRegistry.register(GroupAtlas);
	DiagramRegistry.register(ImageAtlas);
	DiagramRegistry.register(MyShapeAtlas); // Add your shape Atlas here (alphabetical order)
	DiagramRegistry.register(PathAtlas);
	DiagramRegistry.register(PathPointAtlas);
	DiagramRegistry.register(RectangleAtlas);
	DiagramRegistry.register(SvgAtlas);

	// ============================================================================
	// Element Atlas Registration
	// ============================================================================
	DiagramRegistry.register(ButtonAtlas);
	DiagramRegistry.register(InputAtlas);
	DiagramRegistry.register(MyElementAtlas); // OR add your element Atlas here (alphabetical order)

	// ============================================================================
	// Diagram Atlas Registration
	// ============================================================================
	DiagramRegistry.register(MyDiagramAtlas); // OR add your diagram Atlas here

	// ============================================================================
	// Node Atlas Registration
	// ============================================================================
	DiagramRegistry.register(AgentNodeAtlas);
	DiagramRegistry.register(HubNodeAtlas);
	DiagramRegistry.register(ImageGenNodeAtlas);
	DiagramRegistry.register(LLMNodeAtlas);
	DiagramRegistry.register(MyNodeAtlas); // OR add your node Atlas here (alphabetical order)
	DiagramRegistry.register(PageDesignNodeAtlas);
	DiagramRegistry.register(SvgToDiagramNodeAtlas);
	DiagramRegistry.register(TextAreaNodeAtlas);
	DiagramRegistry.register(VectorStoreNodeAtlas);
	DiagramRegistry.register(WebSearchNodeAtlas);
};
```

### Step 12: Update Type Definitions

Add your shape type to the DiagramType union in `src/features/svg-canvas/types/core/DiagramType.ts`:

```typescript
export type DiagramType = "Rectangle" | "Ellipse" | "MyShape"; // Add your shape here
// ... other types
```

### Step 13: Update Default Data Constants

Add your element's default data to the appropriate CreateDefaultData file:

**For Shapes** - `src/features/svg-canvas/constants/data/shapes/CreateDefaultData.ts`:
**For Elements** - `src/features/svg-canvas/constants/data/elements/CreateDefaultData.ts`:
**For Nodes** - `src/features/svg-canvas/constants/data/nodes/CreateDefaultData.ts`:
**For Diagrams** - `src/features/svg-canvas/constants/data/diagrams/CreateDefaultData.ts`:

```typescript
export const CreateDefaultData = {
	// ... existing items
	MyShape: {
		// or MyElement, MyNode, MyDiagram
		// Define default values based on your features
		...DiagramBaseDefaultData,
		...FrameableDefaultData, // if frameable: true
		...TransformativeDefaultData, // if transformative: true
		...StrokableDefaultData, // if strokable: true
		...FillableDefaultData, // if fillable: true
		...CornerRoundableDefaultData, // if cornerRoundable: true
		...TextableDefaultData, // if textable: true
		...ExecutableDefaultData, // if executable: true
		customProperty: 0, // your custom properties
	},
} as const;
```

Add your element's default state to the appropriate CreateDefaultState file:

**For Shapes** - `src/features/svg-canvas/constants/state/shapes/CreateDefaultState.ts`:
**For Elements** - `src/features/svg-canvas/constants/state/elements/CreateDefaultState.ts`:
**For Nodes** - `src/features/svg-canvas/constants/state/nodes/CreateDefaultState.ts`:
**For Diagrams** - `src/features/svg-canvas/constants/state/diagrams/CreateDefaultState.ts`:

```typescript
export const CreateDefaultState = {
	// ... existing items
	MyShape: {
		// or MyElement, MyNode, MyDiagram
		...DiagramBaseDefaultState,
		...FrameableDefaultState, // if frameable: true
		...SelectableDefaultState, // if selectable: true
		...TransformativeDefaultState, // if transformative: true
		...ItemableDefaultState, // if itemable: true
		...StrokableDefaultState, // if strokable: true
		...FillableDefaultState, // if fillable: true
		...CornerRoundableDefaultState, // if cornerRoundable: true
		...TextableDefaultState, // if textable: true
		...ExecutableDefaultState, // if executable: true
		customProperty: 0, // your custom properties
	},
} as const;
```

## Important Design Patterns

### 1. Feature Composition

- Use the feature system to compose capabilities (transformative, connectable, etc.)
- Only include features your shape actually needs
- Features determine which props and state properties are available

### 2. Memoization

- Always wrap components with `memo()` for performance
- Use `useMemo()` for expensive calculations and object creation
- Memoize the `ownerShape` object for connect points

### 3. Hook Integration

- Use the provided interaction hooks (useDrag, useClick, useSelect, etc.)
- Merge hook properties using `mergeProps()`
- Follow the established pattern for hook composition

### 4. Transform System

- Use `createSvgTransform()` for consistent transformation
- Apply transforms to the main SVG element
- Remember that shapes are positioned from their center point

### 5. Connect Point System

- Implement connect points if your shape should support connections
- Calculate positions relative to the shape's center and dimensions
- Use the established connect point creation pattern

## Testing Your Shape

1. **Build the application**: Run `npm run build` to ensure no TypeScript errors
2. **Visual testing**: Add your shape to a test diagram and verify:
   - Rendering appears correct
   - Selection works properly
   - Dragging functions correctly
   - Transform controls work (if transformative)
   - Connect points appear and function (if connectable)
   - Text editing works (if textable)
3. **Minimap testing**: Verify your shape appears correctly in the minimap

## Common Pitfalls

1. **Missing Menu Configuration**: Don't forget to create the menuConfig file for your shape
2. **Missing menuConfig in Atlas**: Ensure your Atlas includes the `menuConfig` property
3. **Menu configuration mismatches**: Verify menuConfig properties match your shape's features
4. **Missing Atlas creation**: Don't forget to create the Atlas object for your shape/node
5. **Missing Atlas registration**: Ensure your Atlas is registered in SvgCanvasRegistry
6. **Atlas organization**: Put shape Atlas in `atlas/shapes/`, node Atlas in `atlas/nodes/`
7. **Alphabetical ordering**: Maintain alphabetical order in registry and import statements
8. **Missing exports**: Ensure all new files are properly exported through index files
9. **Type mismatches**: Verify that your data, state, and props types align correctly
10. **Catalog union types**: Must add your types to both `DiagramData.ts` and `Diagram.ts` unions
11. **DiagramType union**: Must add your type string to the `DiagramType` union
12. **Default value consistency**: Ensure default data and state values are consistent
13. **Transform center**: Remember that shapes are positioned from their center, not top-left
14. **Feature consistency**: Make sure your component implementation matches declared features
15. **Folder structure**: Use `shapes/` for basic elements, `nodes/` for workflow nodes
16. **Atlas imports**: Use proper import paths in your Atlas files (../../types/, ../../components/, etc.)
17. **createMenuConfig usage**: Use `createMenuConfig()` for automatic menu generation based on features

By following this guide, you'll create a shape that integrates seamlessly with the existing SVG canvas architecture while maintaining consistency and performance.

## Atlas System Benefits

The new Atlas system provides several advantages:

1. **Centralized Organization**: All shape/node-related code is organized in one place
2. **Type Safety**: Atlas objects ensure consistent type definitions across all components
3. **Developer Reference**: Atlas files serve as comprehensive documentation
4. **Maintainability**: Changes to a diagram type only require updating the Atlas file
5. **Consistency**: Uniform structure across all diagram types
6. **Discovery**: Easy to find all components, utilities, and types for a diagram type

Each Atlas object consolidates:

- Type definitions (Data, State, Props, Features)
- Default values (DefaultData, DefaultState)
- Menu configuration (menuConfig)
- React components (Component, MinimapComponent)
- Utility functions (createState, mappers, calculators)
- Export functions (if applicable)

This makes the system more maintainable and easier to understand for developers working with the SVG canvas.

## Menu Configuration System

The menu configuration system controls which menu items are displayed when a diagram element is selected. It uses a declarative approach where menu items are automatically generated based on the shape's features.

### How Menu Configuration Works

1. **Feature-based generation**: The `createMenuConfig()` utility automatically generates appropriate menu items based on your shape's `DiagramFeatures`:
   - `fillable: true` → Adds `backgroundColor` menu
   - `strokable: true` → Adds `borderColor` and `borderStyle` menus
   - `cornerRoundable: true` → Adds `borderStyle.radius` control
   - `textable: true` → Adds `fontStyle` and `textAlignment` menus
   - `transformative: true` → Adds `aspectRatio` menu

2. **Custom overrides**: You can override auto-generated settings or add additional menu items like `arrowHead` and `lineStyle` for connectors.

3. **Multi-selection support**: When multiple elements are selected, only menu items that are enabled for ALL selected types are shown (intersection of configs).

4. **Nested configuration**: Some menu items like `borderStyle` support nested options (e.g., `borderStyle.radius`).

### Example Usage Patterns

**Basic shape (auto-generated):**

```typescript
export const RectangleMenuConfig: DiagramMenuConfig =
	createMenuConfig(RectangleFeatures);
// Automatically includes: backgroundColor, borderColor, borderStyle.radius,
// fontStyle, textAlignment, aspectRatio based on features
```

**Connector with overrides:**

```typescript
export const ConnectLineMenuConfig: DiagramMenuConfig = {
	...createMenuConfig(ConnectLineFeatures),
	aspectRatio: false, // Disable auto-generated aspectRatio
	arrowHead: true, // Add connector-specific control
	lineStyle: true, // Add line styling
	lineColor: true, // Use lineColor instead of borderColor
	borderColor: false, // Disable borderColor
	borderStyle: undefined, // Remove border style menu
};
```

**Custom node with selective features:**

```typescript
export const MyNodeMenuConfig: DiagramMenuConfig = {
	...createMenuConfig(MyNodeFeatures),
	borderStyle: {
		radius: false, // Disable only the radius control, keep other border style options
	},
};
```

This approach ensures consistency across all diagram types while allowing flexibility for specialized elements.
