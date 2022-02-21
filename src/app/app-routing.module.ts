import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TodoListComponent } from './pages/todo-list/todo-list.component';

const routes: Routes = [
  {
    path: 'todos',
    component: TodoListComponent
  },
  {
    path: '',
    redirectTo: 'todos',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
