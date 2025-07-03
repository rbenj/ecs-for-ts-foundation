import { nanoid } from 'nanoid';
import { UID_LENGTH } from './constants';
import Component, { ComponentConstructor } from './component';
import './types';

/**
 * The entity in an entity component system. Entities are containers that hold components and
 * provide a unique identifier. They don't contain any logic themselves - all behavior comes
 * from components and systems.
 */
class Entity {
  private components: { [key: string]: Component<unknown> } = {};
  private dob: number;
  private id: string;

  /**
   * Constructor.
   * @param components - Components to add on creation.
   * @param id - Provide an id instead of randomly generating one
   */
  public constructor(components: Component<unknown>[] = [], id = '') {
    this.dob = performance.now();
    this.id = id || nanoid(UID_LENGTH);

    components.forEach(this.addComponent.bind(this));
  }

  /**
   * Get the entity id.
   * @returns The unique identifier for this entity
   */
  public getId(): string {
    return this.id;
  }

  /**
   * Get a single component from the entity.
   * @param componentClass - The constructor of the requested component
   * @returns The component instance
   * @throws When component is missing or does not match the class it's stored as
   */
  public getComponent<ComponentType>(componentClass: ComponentConstructor<ComponentType>): ComponentType {
    const component = this.components[componentClass.name];

    if (!component) {
      throw new Error(`Entity component not found: ${componentClass.name}`);
    }

    if (!(component instanceof componentClass)) {
      throw new Error(`Entity component does not match provided constructor: ${componentClass.name}`);
    }

    return component;
  }

  /**
   * Get the classes for all components stored (they are often used in maps as keys).
   * @returns All of the component constructors
   */
  public getAllComponentConstructors(): ComponentConstructor[] {
    return Object.values(this.components).map((component: Component<unknown>): ComponentConstructor => {
      return component.constructor as ComponentConstructor;
    });
  }

  /**
   * Get the age of the entity in milliseconds.
   * @returns The age since creation
   */
  public getAge(): number {
    return Math.floor(performance.now() - this.dob);
  }

  /**
   * Check if an entity has a component. Should be called before getComponent to avoid a throw.
   * @param componentClass - The constructor of the component
   * @returns Has it or doesn't have it
   */
  public hasComponent<ComponentType>(componentClass: ComponentConstructor<ComponentType>): boolean {
    return !!this.components[componentClass.name];
  }

  /**
   * Add a component to the entity.
   * @param component - The component to add
   */
  public addComponent(component: Component<unknown>): void {
    this.components[component.constructor.name] = component;
  }

  /**
   * Add multiple components to the entity.
   * @param components - The components to add
   */
  public addComponents(components: Component<unknown>[]): void {
    for (let i = 0; i < components.length; i++) {
      this.addComponent(components[i]);
    }
  }

  /**
   * Remove a component from the entity.
   * @param componentClass - The constructor of the component to remove
   */
  public removeComponent<ComponentType>(componentClass: ComponentConstructor<ComponentType>): void {
    delete this.components[componentClass.name];
  }
}

export default Entity; 
