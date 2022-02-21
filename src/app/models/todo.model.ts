import { StoreEntity } from "./store-entity.model";

export class Todo implements StoreEntity {
  uniqueId(): number {
    return this.id;
  }
  id: number;
  completed: boolean;
  text: string;

  constructor() {
    this.completed = false;
    this.text = '';
  }
}
