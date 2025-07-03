## *DEPRECATED!*

This repo is for academic purposes only. This lib was successfully used in a 2D action shooter that has since been ported to Unity's DOTS ECS. It served that project well, but is untested here. I also created a companion netcode lib with client prediction and lag compensation. If anybody is interested, let me know and I can extract that too.

# Entity Component System for TypeScript Foundation

A lightweight, performant Entity Component System (ECS) framework for TypeScript. This framework provides a solid foundation for building games, simulations, and other entity-based applications.

## Features

- **Type-safe component access** - Full TypeScript support with compile-time type checking
- **Optimized query caching** - Automatic caching of entity queries for performance
- **Automatic query invalidation** - Queries are automatically refreshed when components change
- **Teardown callbacks** - Clean resource management with automatic cleanup
- **Low dependency** - Only requires `nanoid` for unique ID generation

## Quick Start

```typescript
// Define a component
class PositionComponent implements Component<{x: number, y: number}> {
  private state = { x: 0, y: 0 };
  
  constructor(props: {x: number, y: number}) {
    this.state = props;
  }
  
  get<K extends keyof {x: number, y: number}>(key: K): {x: number, y: number}[K] {
    return this.state[key];
  }
  
  set<K extends keyof {x: number, y: number}>(key: K, value: {x: number, y: number}[K]): void {
    this.state[key] = value;
  }
}

// Create entities
const entities = new Entities();
const player = new Entity([new PositionComponent({x: 10, y: 20})]);
entities.add(player);

// Query entities
const positionedEntities = entities.get({ in: [PositionComponent] });
```

## Core Concepts

### Entities

Entities are id based containers used to bundle components.

```typescript
const entity = new Entity([
  new PositionComponent({ x: 0, y: 0 }),
  new VelocityComponent({ vx: 10, vy: 5 })
]);
```

### Components

Components store data and provide a type-safe interface for accessing that data.

```typescript
class HealthComponent implements Component<{current: number, max: number}> {
  private state: {current: number, max: number};

  constructor(props: {current: number, max: number}) {
    this.state = props;
  }

  get<K extends keyof {current: number, max: number}>(key: K): {current: number, max: number}[K] {
    return this.state[key];
  }

  set<K extends keyof {current: number, max: number}>(key: K, value: {current: number, max: number}[K]): void {
    this.state[key] = value;
  }
}
```

### Systems

Systems query for entities based on their component makeup, and modify data stored in those components.

```typescript
class MovementSystem implements System {
  private entities: Entities;

  constructor(entities: Entities) {
    this.entities = entities;
  }

  update(dt: number): void {
    const movingEntities = this.entities.get({
      in: [PositionComponent, VelocityComponent]
    });

    movingEntities.forEach(entity => {
      const position = entity.getComponent(PositionComponent);
      const velocity = entity.getComponent(VelocityComponent);

      const newX = position.get('x') + velocity.get('vx') * (dt / 1000);
      const newY = position.get('y') + velocity.get('vy') * (dt / 1000);

      position.set('x', newX);
      position.set('y', newY);
    });
  }
}
```

### Game Loops

Systems can be called sequentially in a a game loop that will provide delta and elapsed times frame to frame. A game loop with proper accumulating time and death spiraling protection is out of the scope of this lib.

## API Reference

### Entities

The main entity manager that handles entity storage, queries, and lifecycle.

#### Methods

- `add(entity: Entity): void` - Add an entity to the manager
- `remove(entity: Entity | null): void` - Remove an entity and trigger teardown
- `find(entityId: string): Entity | null` - Find an entity by ID
- `get(query: Query): Entity[]` - Query entities by components
- `getAll(): Entity[]` - Get all entities
- `getCount(): number` - Get total entity count
- `clear(): void` - Remove all entities and clear caches
- `addComponentToEntity(entity: Entity, component: Component): void` - Add component to existing entity
- `addComponentsToEntity(entity: Entity, components: Component[]): void` - Add multiple components
- `onTeardown(entities: Entity[], callback: () => void): void` - Register teardown callback

### Entity

Container for components with unique identification.

#### Methods

- `getId(): string` - Get unique entity ID
- `getComponent<T>(componentClass: ComponentConstructor<T>): T` - Get component by type
- `hasComponent<T>(componentClass: ComponentConstructor<T>): boolean` - Check if entity has component
- `addComponent(component: Component): void` - Add a component
- `addComponents(components: Component[]): void` - Add multiple components
- `removeComponent<T>(componentClass: ComponentConstructor<T>): void` - Remove a component
- `getAge(): number` - Get entity age in milliseconds

### Query

Query interface for filtering entities:

```typescript
type Query = {
  in?: ComponentConstructor[];     // Components that entities must have
  notIn?: ComponentConstructor[];  // Components that entities must NOT have
};
```

## Performance Features

### Query Caching
The framework automatically caches query results for optimal performance. When components are added or removed from entities, affected queries are automatically invalidated.

### Optimized Iteration
Queries use efficient filtering algorithms and avoid unnecessary object creation.

### Memory Management
Automatic cleanup with teardown callbacks ensures proper resource management.
