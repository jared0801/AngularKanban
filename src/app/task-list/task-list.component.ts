import { Component, Input } from '@angular/core';

import { transferArrayItem, moveItemInArray, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { AngularFirestore } from '@angular/fire/firestore';
import { MatDialog } from '@angular/material/dialog';


import { TaskDialogComponent, TaskDialogResult } from '../task-dialog/task-dialog.component';
import { Task } from '../task/task.model';
import { Project } from '../projects/project.model';


@Component({
  selector: 'app-task-list',
  templateUrl: './task-list.component.html',
  styleUrls: ['./task-list.component.css']
})
export class TaskListComponent {

  /**
   * Represents an individual project that is being viewed by the user
   */
  @Input() project!: Project;

  /**
   * @constructor
   * @param  {MatDialog} dialog - Dialog for creating new tasks and editing old ones
   * @param  {AngularFirestore} store - Firestore database reference
   */
  constructor(private dialog: MatDialog, private store: AngularFirestore) {
  }

  
  /**
   * Iterates through prevContainer and newContainer to find the current ordering of tasks in each respective container
   * @param  { CdkDropList<any> } prevContainer
   * @param  { CdkDropList<any> } newContainer
   * @returns { prevListOrder, newListOrder } - IDs of tasks from each container in their currently organized order
   */
  reorder(prevContainer: CdkDropList<any>, newContainer: CdkDropList<any>) {
    const prevList = [];
    const newList = [];

    if(prevContainer?.data) {
      for(let i = 0; i < prevContainer.data.length; i++) {
        prevList[i] = prevContainer.data[i].id;
      }
    }

    if(newContainer?.data) {
      for(let i = 0; i < newContainer.data.length; i++) {
        newList[i] = newContainer.data[i].id;
      }
    }
    return {
      prevListOrder: prevList,
      newListOrder: newList
    }
  }

  
  /**
   * Updates the database when a task is moved within or outside of its current container
   * @param  { CdkDragDrop<Task[]|any> } event
   * @returns void
   */
  drop(event: CdkDragDrop<Task[] | any>): void {
    // Make sure item is dropped in a valid container
    if(!event || !event.previousContainer || !event.container) return;

    // Get reference to the task that was picked up
    const item = event.previousContainer.data[event.previousIndex];
    
    if(event.previousContainer == event.container) {
      // Dropped back into the same list
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      // Find the new order of tasks in this list
      const { newListOrder } = this.reorder(event.previousContainer, event.container);
      // Update ordering of tasks in db
      this.project.order?.[event.container.id]?.set({ order: newListOrder }, { merge: true });
    } else {
      // Dropped into a new container
      transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);
      // Find new ordering of tasks in both new and old containers
      const { prevListOrder, newListOrder } = this.reorder(event.previousContainer, event.container);
      // Update the db with moved task and new ordering
      this.store.firestore.runTransaction((): any => {
        // Deletes task from the old list & adds it to the new one
        if(!this.project.collections || !this.project.order) return;
        return Promise.all([
          this.project.collections[event.previousContainer.id].doc(item.id).delete(),
          this.project.collections[event.container.id].doc(item.id).set(item),
          this.project.order[event.previousContainer.id].set({ order: prevListOrder }, { merge: true }),
          this.project.order[event.container.id].set({ order: newListOrder }, { merge: true }),
        ])
      });
    }
  }

  /**
   * Opens a dialog for the user to edit or optionally delete a given task in the current project
   * @param  {'done'|'todo'|'inProgress'} list - Name of the container for the task being edited
   * @param  {Task} task - Object referencing the task being edited
   * @returns void
   */
  edit(list: 'done' | 'todo' | 'inProgress', task: Task): void {
    // Open task up in a dialog w/ an option to delete
    const dialogRef = this.dialog.open(TaskDialogComponent, {
      width: '270px',
      data: {
        task,
        enableDelete: true
      }
    });
    // Either delete or update based on the dialog result
    dialogRef.afterClosed().subscribe((result: TaskDialogResult) => {
      if(!this.project.collections) return;
      if(result?.delete) {
        this.project.collections[list].doc(task.id).delete();
      } else if (result) {
        this.project.collections[list].doc(task.id).update(task)
      }
      
    })
  }

  /**
   * Creates a dialog for the user to create a new task in the current project
   * @returns void
   */
  newTask(): void {
    // Create a new task with a dialog
    const dialogRef = this.dialog.open(TaskDialogComponent, {
      width: '270px',
      data: {
        task: {}
      }
    });
    // Add the task to todo collection afterClosed
    dialogRef.afterClosed().subscribe((result: TaskDialogResult) => {
      if(result?.task && this.project.collections && this.project.collections['todo']) {
        // Add task to db
        this.project.collections['todo'].add(result.task);
      }
    });
  }

}
