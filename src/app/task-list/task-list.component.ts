import { Component } from '@angular/core';

import { transferArrayItem, moveItemInArray, CdkDragDrop } from '@angular/cdk/drag-drop';
import { AngularFirestore, AngularFirestoreCollection } from '@angular/fire/firestore';
import { MatDialog } from '@angular/material/dialog';
import { BehaviorSubject } from 'rxjs';


import { AuthService } from '../services/auth.service';
import { TaskDialogComponent, TaskDialogResult } from '../task-dialog/task-dialog.component';
import { Task } from '../task/task';

const getObservable = (collection: AngularFirestoreCollection<Task>) => {
  const taskArr: Task[] = [];
  const subject = new BehaviorSubject(taskArr);

  collection.valueChanges({ idField: 'id' }).subscribe((val: Task[]) => {
    subject.next(val);
  });

  return subject;
}

@Component({
  selector: 'app-task-list',
  templateUrl: './task-list.component.html',
  styleUrls: ['./task-list.component.css']
})
export class TaskListComponent {
  uid: string = '';
  todo: BehaviorSubject<Task[]> | undefined;
  inProgress: BehaviorSubject<Task[]> | undefined;
  done: BehaviorSubject<Task[]> | undefined;

  constructor(private dialog: MatDialog, private store: AngularFirestore, public auth: AuthService) {
    auth.user$.subscribe(user => {
      this.uid = user.uid;
      this.todo = getObservable(this.store.collection('userData').doc(this.uid).collection('todo', ref => ref.orderBy('index')));
      this.inProgress = getObservable(this.store.collection('userData').doc(this.uid).collection('inProgress', ref => ref.orderBy('index')));
      this.done = getObservable(this.store.collection('userData').doc(this.uid).collection('done', ref => ref.orderBy('index')));
    });
   }

  
  drop(event: CdkDragDrop<Task[] | any>): void {
    console.log(event);
    
    const item = event.previousContainer.data[event.previousIndex];
    item.index = event.currentIndex;
    
    if(event.previousContainer == event.container) {
      //Dropped back into the same list
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      return;
    }

    // TODO: Correctly order dragged element
    console.log(item);
    this.store.firestore.runTransaction(() => {
      // Delete from the old list & add to the new one
      return Promise.all([
        this.store.collection('userData').doc(this.uid).collection(event.previousContainer.id).doc(item.id).delete(),
        this.store.collection('userData').doc(this.uid).collection(event.container.id).add(item)
      ])
    });
    transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);
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
      if(result.delete) {
        this.store.collection('userData').doc(this.uid).collection(list).doc(task.id).delete();
      } else {
        this.store.collection('userData').doc(this.uid).collection(list).doc(task.id).update(task);
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
    dialogRef.afterClosed().subscribe((result: TaskDialogResult) => this.store.collection('userData').doc(this.uid).collection('todo').add(result.task));
  }

}
