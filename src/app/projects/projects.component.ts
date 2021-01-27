import { Component, Input, OnInit } from '@angular/core';
import { AngularFirestore, AngularFirestoreDocument, AngularFirestoreCollection } from '@angular/fire/firestore';
import { BehaviorSubject } from 'rxjs';
import { Task } from '../task/task.model';
import { Project } from '../projects/project.model';
import firebase from 'firebase/app';
import 'firebase/firestore';

import { ConfirmationDialogComponent, ConfirmationDialogResult } from '../confirmation-dialog/confirmation-dialog.component';
import { MatDialog } from '@angular/material/dialog';


interface OrderList {
  [propName: string]: any;
  todo: string[],
  inProgress: string[],
  done: string[]
}

const getObservable = (collection: AngularFirestoreCollection<any>) => {
  const subject = new BehaviorSubject([] as any[]);

  collection.valueChanges({ idField: 'id' }).subscribe((val: any[]) => {
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

@Component({
  selector: 'app-projects',
  templateUrl: './projects.component.html',
  styleUrls: ['./projects.component.css']
})
export class ProjectsComponent implements OnInit {
  @Input() user!: any;
  currentProject: string = "default";
  projectName: string = "";
  project!: Project;
  
  projectsCollection!: AngularFirestoreCollection<Project>;
  projects!: BehaviorSubject<Project[]>;

  orderList: OrderList = {
    todo: [],
    inProgress: [],
    done: [],
  }

  editing: boolean = false;
  /**
   * @param  {AngularFirestore} store - AngularFirestore database object
   */
  constructor(private store: AngularFirestore, private dialog: MatDialog) {
  }

  ngOnInit() {
    this.projectsCollection = this.store.collection('userData').doc(this.user.uid).collection('projects');

    this.projects = getObservable(this.projectsCollection);
    this.projects.subscribe((p) => {
      if(!p) return;
      console.log(p);
      // Get collections for each type of task
      const todoCollection: AngularFirestoreCollection<Task> = this.store.collection('userData').doc(this.user.uid).collection('projects').doc(this.currentProject).collection('todo');
      const inProgressCollection: AngularFirestoreCollection<Task> = this.store.collection('userData').doc(this.user.uid).collection('projects').doc(this.currentProject).collection('inProgress');
      const doneCollection: AngularFirestoreCollection<Task> = this.store.collection('userData').doc(this.user.uid).collection('projects').doc(this.currentProject).collection('done');

      // Create an observable for each task collection
      const todo = getObservable(todoCollection);
      const inProgress = getObservable(inProgressCollection);
      const done = getObservable(doneCollection);

      // Get collections for each task type order array
      const todoOrder = this.store.collection('userData').doc(this.user.uid).collection('projects').doc(this.currentProject).collection('order').doc('todo');
      const inProgressOrder = this.store.collection('userData').doc(this.user.uid).collection('projects').doc(this.currentProject).collection('order').doc('inProgress');
      const doneOrder = this.store.collection('userData').doc(this.user.uid).collection('projects').doc(this.currentProject).collection('order').doc('done');

      // Get ordering for each collection
      this.orderList.todo = updateOrdering(todoOrder, this.orderList.todo, todo);
      this.orderList.inProgress = updateOrdering(inProgressOrder, this.orderList.inProgress, inProgress);
      this.orderList.done = updateOrdering(doneOrder, this.orderList.done, done);

      // Initialize the currently selected project object to pass to the task-list component
      this.project = {
        title: this.currentProject,
        collections: {
          todo: todoCollection,
          inProgress: inProgressCollection,
          done: doneCollection
        },
        todo,
        inProgress,
        done,
        order: {
          todo: todoOrder,
          inProgress: inProgressOrder,
          done: doneOrder
        },
        orderList: this.orderList
      }

      
    });
  }
  /**
   * @param  {any} event
   * @returns void
   */
  change(event: any): void {
    if(this.project.collections) {
      this.changeTasks(event.value);
    }
  }
  /**
   * @param  {any} event
   * @returns void
   */
  changeTasks(projectTitle: string): void {
    if(this.project.collections) {
      this.currentProject = projectTitle;

      this.project.collections['todo'] = this.store.collection('userData').doc(this.user.uid).collection('projects').doc(this.currentProject).collection('todo');
      this.project.collections['inProgress'] = this.store.collection('userData').doc(this.user.uid).collection('projects').doc(this.currentProject).collection('inProgress');
      this.project.collections['done'] = this.store.collection('userData').doc(this.user.uid).collection('projects').doc(this.currentProject).collection('done');
      
      this.project.todo = getObservable(this.project.collections['todo']);
      this.project.inProgress = getObservable(this.project.collections['inProgress']);
      this.project.done = getObservable(this.project.collections['done']);

      const todoOrder = this.store.collection('userData').doc(this.user.uid).collection('projects').doc(this.currentProject).collection('order').doc('todo');
      const inProgressOrder = this.store.collection('userData').doc(this.user.uid).collection('projects').doc(this.currentProject).collection('order').doc('inProgress');
      const doneOrder = this.store.collection('userData').doc(this.user.uid).collection('projects').doc(this.currentProject).collection('order').doc('done');

      this.project.order = {
        todo: todoOrder,
        inProgress: inProgressOrder,
        done: doneOrder
      }

      if(this.project.order) {
        this.orderList.todo = updateOrdering(this.project.order.todo, this.orderList.todo, this.project.todo);
        this.orderList.inProgress = updateOrdering(this.project.order.inProgress, this.orderList.inProgress, this.project.inProgress);
        this.orderList.done = updateOrdering(this.project.order.done, this.orderList.done, this.project.done);
      }
    }
  }

  newProject(): void {
    if (!this.newProjectRules()) return;
    const project = {
      title: this.projectName
    }
    this.projectsCollection.doc(this.projectName).set(project).then(() => {
      this.projectName = "";
      this.changeTasks(project.title);
    });
  }

  newProjectRules(): boolean {
    return this.projectName.length >= 2 && this.projectName.length <= 20;
  }

  deleteProject() {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '270px',
      data: "Are you sure you want to delete this project and all of its tasks?"
    });

    // Either delete or update based on the dialog result
    dialogRef.afterClosed().subscribe((result: ConfirmationDialogResult) => {
      if(result.confirm) {
        if(this.project.todo) {
          const data: Task[] = this.project.todo.getValue();
          data.forEach(doc => {
            if(this.project.collections) {
              this.project.collections['todo'].doc(doc.id).delete();
            }
          })
        }
        if(this.project.inProgress) {
          const data: Task[] = this.project.inProgress.getValue();
          data.forEach(doc => {
            if(this.project.collections) {
              this.project.collections['inProgress'].doc(doc.id).delete();
            }
          })
        }
        if(this.project.done) {
          const data: Task[] = this.project.done.getValue();
          data.forEach(doc => {
            if(this.project.collections) {
              this.project.collections['done'].doc(doc.id).delete();
            }
          })
        }
        this.projectsCollection.doc(this.currentProject).delete();
        this.changeTasks('default');
      }
    });
  }


}
