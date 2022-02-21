import { Component, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Todo } from '@script-bytes/models/todo.model';
import { TodoService } from '@script-bytes/services/todo.service';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-todo-list',
  templateUrl: './todo-list.component.html',
  styleUrls: ['./todo-list.component.css']
})
export class TodoListComponent implements OnInit {
  newTodo: Todo;
  // Sort them just so the new ones are on top
  todos$ = this.todoService.items$.pipe(map(t => t.sort((a, b) => a.id < b.id ? 1 : -1)));

  constructor(
    private todoService: TodoService
  ) { }

  ngOnInit(): void {
    this.resetNewTodo();
  }

  addTodo(form: NgForm) {
    if (!form.valid) {
      return;
    }
    this.todoService.addTodo(this.newTodo);
    this.resetNewTodo();
  }

  resetNewTodo() {
    this.newTodo = new Todo();
    this.newTodo.id = this.todoService.getNextId();
  }

  completeTodo(todo: Todo) {
    this.todoService.completeTodo(todo);
  }
}
