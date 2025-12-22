# svg-canvas Dependency Rules

## General Rules

```mermaid
graph TD
    constants --> types
    registry --> types
    utils --> constants
    utils --> types
    utils --> registry
    hooks --> constants
    hooks --> types
    hooks --> registry
    hooks --> utils
    components --> constants
    components --> types
    components --> hooks
    components --> registry
    components --> utils
    canvas --> components
    canvas --> constants
    canvas --> types
    canvas --> hooks
    canvas --> registry
    canvas --> utils
```

## `types` Module

```mermaid
graph TD
    data --> core
    state --> core
    state --> data
    events --> core
    events --> data
    events --> state
    props --> core
    props --> data
    props --> state
    props --> events
```

## `components` Module

```mermaid
graph TD
    core --> icons
    shapes --> core
    nodes --> shapes
    menus --> icons
```
