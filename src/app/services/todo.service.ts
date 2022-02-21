import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '@script-bytes/env/environment';
import { Todo } from '@script-bytes/models/todo.model';
import { StoreService } from './store.service';

@Injectable({
  providedIn: 'root'
})
export class TodoService extends StoreService<Todo> {
  nextId = 1;

  constructor(
    protected override http: HttpClient
  ) {
    super(
      http,
      {
        url: environment.apiUrl + 'todo',
        itemName: 'Todo'
      }
    );
  }

  getNextId() {
    this.nextId++;
    return this.nextId;
  }

  // Temporary methods for add/update until we get the api hooked up
  addTodo(todo: Todo) {
    todo.id = this.getNextId();
    this.replaceOrAdd(todo);
    this.createSuccessSubject.next(todo);
  }

  updateTodo(todo: Todo) {
    this.replaceOrAdd(todo);
    this.updateSuccessSubject.next(todo);
  }

  completeTodo(todo: Todo) {
    this.remove(todo);
  }
}
