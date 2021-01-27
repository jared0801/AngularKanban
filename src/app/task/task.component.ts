import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Task } from './task.model';

@Component({
  selector: 'app-task',
  templateUrl: './task.component.html',
  styleUrls: ['./task.component.css']
})
export class TaskComponent {
  /**
   * Task object containing all information about one individual task
   */
  @Input() task!: Task;

  /**
   * Emits an event when the user wishes to edit a task
   */
  @Output() edit = new EventEmitter();
  
  constructor() { }

}
