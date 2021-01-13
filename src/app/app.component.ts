import { transferArrayItem, CdkDragDrop } from '@angular/cdk/drag-drop';
import { Component } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection } from '@angular/fire/firestore';
import { MatDialog } from '@angular/material/dialog';
import { BehaviorSubject } from 'rxjs';
import { TaskDialogComponent, TaskDialogResult } from './task-dialog/task-dialog.component';
import { Task } from './task/task';

const getObservable = (collection: AngularFirestoreCollection<Task>) => {
  const taskArr: Task[] = [];
  const subject = new BehaviorSubject(taskArr);

  collection.valueChanges({ idField: 'id' }).subscribe((val: Task[]) => {
    subject.next(val);
  });

  return subject;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  todo: BehaviorSubject<Task[]> = getObservable(this.store.collection('todo'));
  inProgress: BehaviorSubject<Task[]> = getObservable(this.store.collection('inProgress'));
  done: BehaviorSubject<Task[]> = getObservable(this.store.collection('done'));

  constructor(private dialog: MatDialog, private store: AngularFirestore) {
    // Empty for now
  }

  drop(event: CdkDragDrop<Task[] | any>): void {
    if(event.previousContainer == event.container) {
      //Dropped back into the same list
      return;
    }

    // TODO: Correctly order dragged element
    const item = event.previousContainer.data[event.previousIndex];
    this.store.firestore.runTransaction(() => {
      // Delete from the old list & add to the new one
      return Promise.all([
        this.store.collection(event.previousContainer.id).doc(item.id).delete(),
        this.store.collection(event.container.id).add(item)
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
        this.store.collection(list).doc(task.id).delete();
      } else {
        this.store.collection(list).doc(task.id).update(task);
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
    dialogRef.afterClosed().subscribe((result: TaskDialogResult) => this.store.collection('todo').add(result.task));
  }
}
