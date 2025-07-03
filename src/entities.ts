import Component, { ComponentConstructor } from './component';
import Entity from './entity';

/**
 * Query interface for filtering entities by their components.
 */
export type Query = {
  /** Components that entities must have */
  in?: ComponentConstructor[];
  /** Components that entities must NOT have */
  notIn?: ComponentConstructor[];
};

/**
 * Warehouse for Entity instances. Store, search, and provide a common interface for managing
 * entity components. This is the core of the ECS framework.
 * 
 * Features:
 * - Optimized query caching for performance
 * - Automatic query invalidation when components change
 * - Teardown callbacks for cleanup
 * - Type-safe component access
 */
class Entities {
  private allEntities: Entity[] = [];
  private entitiesByQueryString: Map<string, Entity[]> = new Map();
  private entityById: Map<string, Entity> = new Map();
  private queryStringsByComponentClass: Map<ComponentConstructor, string[]> = new Map();
  private setupQueryFlags: { [key: string]: boolean } = {};
  private teardownCallbacks: Map<Entity, (() => void)[]> = new Map();

  /**
   * Register an entity and perform any setup needed.
   * @param entity - The entity to add.
   */
  public add(entity: Entity): void {
    if (this.entityById.has(entity.getId())) {
      throw new Error(`Entity with ID ${entity.getId()} already exists`);
    }

    this.entityById.set(entity.getId(), entity);
    this.flushQueriesForEntity(entity);
    this.updateCachedValues();
  }

  /**
   * Lookup an entity by its id.
   * @param entityId - Id of the entity to find.
   * @returns The entity if found, null otherwise.
   */
  public find(entityId: string): Entity | null {
    return this.entityById.get(entityId) || null;
  }

  /**
   * Get entities with and without specific components (all relationships are AND).
   * Uses optimized caching for repeated queries.
   * @param query - Parameters to search by.
   * @returns The found entities.
   */
  public get(query: Query): Entity[] {
    const queryString = JSON.stringify({
      in: (query.in) ? query.in.map((v: ComponentConstructor) => v.name) : [],
      notIn: (query.notIn) ? query.notIn.map((v: ComponentConstructor) => v.name) : [],
    });

    // Check for a cache hit on the query string
    let entities = this.entitiesByQueryString.get(queryString);
    if (entities) {
      return entities;
    }

    // Optimize query
    this.setupQuery(query, queryString);

    // Get fresh entities for this query
    entities = this.allEntities.filter((entity) => {
      let i = 0;

      if (query.in) {
        i = query.in.length;
        while (i--) {
          if (!entity.hasComponent(query.in[i])) {
            return false;
          }
        }
      }

      if (query.notIn) {
        i = query.notIn.length;
        while (i--) {
          if (entity.hasComponent(query.notIn[i])) {
            return false;
          }
        }
      }

      return true;
    });

    // Cache fresh entities for this query
    this.entitiesByQueryString.set(queryString, entities);

    // yield fresh entities
    return entities;
  }

  /**
   * Get all entities.
   * @returns All registered entities.
   */
  public getAll(): Entity[] {
    return this.allEntities;
  }

  /**
   * Get the total count of entities.
   * @returns Number of registered entities.
   */
  public getCount(): number {
    return this.allEntities.length;
  }

  /**
   * Unregister an entity and perform any teardown needed.
   * @param entity - The entity, which can be null so result of find() can be passed directly.
   */
  public remove(entity: Entity | null): void {
    if (entity) {
      // Call teardown functions and toss
      const callbacks = this.teardownCallbacks.get(entity);
      if (callbacks) {
        this.teardownCallbacks.delete(entity);

        if (callbacks.length) {
          callbacks.reverse();
          while (callbacks.length) {
            (callbacks.pop() as () => void)();
          }
        }
      }

      // Unregister it
      this.entityById.delete(entity.getId());

      // Flush anything that was using it
      this.flushQueriesForEntity(entity);
      this.updateCachedValues();
    }
  }

  /**
   * Remove all entities and clear all caches.
   */
  public clear(): void {
    // Call teardown for all entities
    this.allEntities.forEach(entity => {
      const callbacks = this.teardownCallbacks.get(entity);
      if (callbacks) {
        callbacks.reverse();
        while (callbacks.length) {
          (callbacks.pop() as () => void)();
        }
      }
    });

    // Clear all collections
    this.allEntities = [];
    this.entitiesByQueryString.clear();
    this.entityById.clear();
    this.queryStringsByComponentClass.clear();
    this.setupQueryFlags = {};
    this.teardownCallbacks.clear();
  }

  /**
   * Properly add a component to an already registered entity.
   * @param entity - The entity.
   * @param component - The component.
   */
  public addComponentToEntity(entity: Entity, component: Component<unknown>): void {
    entity.addComponent(component);
    this.flushQueriesForComponentClasses([component.constructor as ComponentConstructor]);
  }

  /**
   * Properly add multiple components to an already registered entity.
   * @param entity - The entity.
   * @param components - The components.
   */
  public addComponentsToEntity(entity: Entity, components: Component<unknown>[]): void {
    entity.addComponents(components);
    this.flushQueriesForComponentClasses(components.map((component) => component.constructor as ComponentConstructor));
  }

  /**
   * Run a callback when a specific entity is removed.
   * @param entities - The entities to apply the callback to.
   * @param callback - The callback to execute on teardown.
   */
  public onTeardown(entities: Entity[], callback: () => void): void {
    let i = entities.length;
    while (i--) {
      if (this.entityById.has(entities[i].getId())) {
        let callbacks = this.teardownCallbacks.get(entities[i]);

        if (!callbacks) {
          callbacks = [];
          this.teardownCallbacks.set(entities[i], callbacks);
        }

        callbacks.push(callback);
      }
    }
  }

  /**
   * Flush any cached results for queries that include any of the provided components.
   */
  private flushQueriesForComponentClasses(componentClasses: ComponentConstructor[]): void {
    let i = componentClasses.length;
    while (i--) {
      // Get all query strings that reference each component
      const queryStrings = this.queryStringsByComponentClass.get(componentClasses[i]);

      // Flush results for each query string
      if (queryStrings) {
        let j = queryStrings.length;
        while (j--) {
          this.entitiesByQueryString.delete(queryStrings[j]);
        }
      }
    }
  }

  /**
   * Flush any cached results for queries that include any component in the provided entity.
   */
  private flushQueriesForEntity(entity: Entity): void {
    this.flushQueriesForComponentClasses(entity.getAllComponentConstructors());
  }

  /**
   * Perform some one time setup tasks to optimize queries.
   * @param query - The query object.
   * @param queryString - Stringified version of the query.
   */
  private setupQuery(query: Query, queryString: string): void {
    // This is a one time setup
    if (this.setupQueryFlags[queryString]) {
      return;
    }

    this.setupQueryFlags[queryString] = true;

    // Go through all components referenced in the query
    ([] as ComponentConstructor[]).concat(query.in || [], query.notIn || []).forEach((componentClass) => {
      // Get list of query strings that reference component
      let queries = this.queryStringsByComponentClass.get(componentClass);

      // Initialize list of query strings if not set yet
      if (!queries) {
        queries = [];
        this.queryStringsByComponentClass.set(componentClass, queries);
      }

      // Add query string to list of query strings if not already there
      if (queries.indexOf(queryString) === -1) {
        queries.push(queryString);
      }
    });
  }

  /**
   * Refresh stored values that need quick access.
   */
  private updateCachedValues(): void {
    // Simple array of all entities
    this.allEntities = [...this.entityById.values()];
  }
}

export default Entities; 
