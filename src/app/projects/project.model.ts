import { AngularFirestoreCollection, AngularFirestoreDocument } from '@angular/fire/firestore';
import { Task } from '../task/task.model';
import { BehaviorSubject } from 'rxjs';
import firebase from 'firebase/app';
import 'firebase/firestore';

interface OrderList {
    [propName: string]: any;
    todo: string[],
    inProgress: string[],
    done: string[]
}

interface ListCollections {
    [propName: string]: any;
    todo: AngularFirestoreCollection<Task>,
    inProgress: AngularFirestoreCollection<Task>,
    done: AngularFirestoreCollection<Task>
}

interface OrderCollections {
    [propName: string]: any;
    todo: AngularFirestoreDocument<firebase.firestore.DocumentData>,
    inProgress: AngularFirestoreDocument<firebase.firestore.DocumentData>,
    done: AngularFirestoreDocument<firebase.firestore.DocumentData>
}

export interface Project {
    title: string,
    collections?: ListCollections;

    todo?: BehaviorSubject<Task[]>;
    inProgress?: BehaviorSubject<Task[]>;
    done?: BehaviorSubject<Task[]>;

    order?: OrderCollections;
    orderList?: OrderList;
}