import { Component, Output, Input, EventEmitter } from '@angular/core';

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
  uid: string = '';

  @Input() project!: Project;

  /**
   * @param  {MatDialog} dialog - Dialog for creating new tasks
   * @param  {AngularFirestore} store - Firestore database
   */
  constructor(private dialog: MatDialog, private store: AngularFirestore) {
  }

  

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

  
  drop(event: CdkDragDrop<Task[] | any>): void {
    if(!event || !event.previousContainer || !event.container) return;
    const item = event.previousContainer.data[event.previousIndex];
    //item.index = event.currentIndex;
    
    if(event.previousContainer == event.container) {
      //Dropped back into the same list
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);

      // Find the new order of tasks in this list to update db
      const { newListOrder } = this.reorder(event.previousContainer, event.container);
      //this.store.collection('userData').doc('order').collection(this.uid).doc(event.container.id).set({ order: newListOrder }, { merge: true });


      this.project.order?.[event.container.id]?.set({ order: newListOrder }, { merge: true });

      return;
    }

    // TODO: Correctly order dragged element
    
    transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);

    const { prevListOrder, newListOrder } = this.reorder(event.previousContainer, event.container);

    this.store.firestore.runTransaction((): any => {
      // Delete from the old list & add to the new one
      if(!this.project.collections || !this.project.order) return;
      return Promise.all([
        this.project.collections[event.previousContainer.id].doc(item.id).delete(),
        this.project.collections[event.container.id].doc(item.id).set(item),
        this.project.order[event.previousContainer.id].set({ order: prevListOrder }, { merge: true }),
        this.project.order[event.container.id].set({ order: newListOrder }, { merge: true }),
      ])
    });
  }

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
      if(result && this.project.collections && this.project.collections['todo']) {
        this.project.collections['todo'].add(result.task);
      }
    });
  }

}
