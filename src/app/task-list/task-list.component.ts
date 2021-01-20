import { Component } from '@angular/core';

import { transferArrayItem, moveItemInArray, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { AngularFirestore, AngularFirestoreCollection, AngularFirestoreDocument } from '@angular/fire/firestore';
import { MatDialog } from '@angular/material/dialog';
import { BehaviorSubject } from 'rxjs';
import firebase from 'firebase/app';
import 'firebase/firestore';


import { AuthService } from '../services/auth.service';
import { TaskDialogComponent, TaskDialogResult } from '../task-dialog/task-dialog.component';
import { Task } from '../task/task';

const getObservable = (collection: AngularFirestoreCollection<Task>) => {
  const subject = new BehaviorSubject([] as Task[]);

  collection.valueChanges({ idField: 'id' }).subscribe((val: Task[]) => {
    subject.next(val);
  });

  return subject;
}


const updateOrdering = (
  orderDoc: AngularFirestoreDocument<firebase.firestore.DocumentData>,
  orderList: string[],
  bh: BehaviorSubject<Task[]> | undefined
) => {
let ordered: string[] = [];
orderDoc.valueChanges().subscribe((v: any) => {
  // When ordering changes, update orderList for this collection
  if(v?.order)
  {
    orderList = v.order;
  }
  bh?.subscribe((val: Task[]) => {
    // Sort this collection according to orderList
    val.sort((a: Task, b: Task): number => {
      return orderList.indexOf(a.id) - orderList.indexOf(b.id);
    });
  });
});

return ordered;
}

interface OrderList {
  [propName: string]: any;
  todo: string[],
  inProgress: string[],
  done: string[]
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
  
  todoOrder?: AngularFirestoreDocument<firebase.firestore.DocumentData>;
  inProgressOrder?: AngularFirestoreDocument<firebase.firestore.DocumentData>;
  doneOrder?: AngularFirestoreDocument<firebase.firestore.DocumentData>;
  orderList: OrderList = {
    todo: [],
    inProgress: [],
    done: [],
  }

  constructor(private dialog: MatDialog, private store: AngularFirestore, public auth: AuthService) {
    auth.user$.subscribe(user => {
      // Set authorized user
      this.uid = user.uid;

      // Get all tasks
      this.todo = getObservable(this.store.collection('userData').doc(this.uid).collection('todo'));
      this.inProgress = getObservable(this.store.collection('userData').doc(this.uid).collection('inProgress'));
      this.done = getObservable(this.store.collection('userData').doc(this.uid).collection('done'));

      
      // Get ordering for each collection
      this.todoOrder = this.store.collection('userData').doc('order').collection(this.uid).doc('todo');
      this.inProgressOrder = this.store.collection('userData').doc('order').collection(this.uid).doc('inProgress');
      this.doneOrder = this.store.collection('userData').doc('order').collection(this.uid).doc('done');
      this.orderList.todo = updateOrdering(this.todoOrder, this.orderList.todo, this.todo);
      this.orderList.inProgress = updateOrdering(this.inProgressOrder, this.orderList.inProgress, this.inProgress);
      this.orderList.done = updateOrdering(this.doneOrder, this.orderList.done, this.done);
      
    });
  }

  

  reorder(prevContainer: CdkDropList<any>, newContainer: CdkDropList<any>, newIndex?: number) {
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
      
      this.store.firestore.runTransaction(() => {
        // Delete from the old list & add to the new one
        return this.store.collection('userData').doc('order').collection(this.uid).doc(event.container.id).set({ order: newListOrder }, { merge: true })
      });
      return;
    }

    // TODO: Correctly order dragged element
    
    transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);

    const { prevListOrder, newListOrder } = this.reorder(event.previousContainer, event.container, event.currentIndex);

    this.store.firestore.runTransaction(() => {
      // Delete from the old list & add to the new one
      return Promise.all([
        this.store.collection('userData').doc(this.uid).collection(event.previousContainer.id).doc(item.id).delete(),
        this.store.collection('userData').doc(this.uid).collection(event.container.id).doc(item.id).set(item),
        this.store.collection('userData').doc('order').collection(this.uid).doc(event.previousContainer.id).set({ order: prevListOrder }, { merge: true }),
        this.store.collection('userData').doc('order').collection(this.uid).doc(event.container.id).set({ order: newListOrder }, { merge: true })
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
