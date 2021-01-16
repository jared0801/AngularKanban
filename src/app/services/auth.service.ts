import { Injectable } from '@angular/core';

import { Router } from '@angular/router';
import app from 'firebase';
import 'firebase/auth';
import { AngularFireAuth } from '@angular/fire/auth';
import {
  AngularFirestore,
  AngularFirestoreDocument
} from '@angular/fire/firestore';

import { Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { User } from './user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  user$: Observable<any>;

  constructor(
    private afAuth: AngularFireAuth,
    private afs: AngularFirestore
  ) {
    this.user$ = this.afAuth.authState.pipe(
      switchMap(user => {
        if(user) {
          return this.afs.doc<User>(`users/${user.uid}`).valueChanges();
        } else {
          return of(null);
        }
      })
    );
  }

  async googleSignin() {
    const provider = new app.auth.GoogleAuthProvider();
    const credentials = await this.afAuth.signInWithPopup(provider);
    return this.updateUserData(credentials.user);
  }

  async signOut() {
    await this.afAuth.signOut();
  }


  private updateUserData(user: User | null) {
    if(user != null) {
      const userRef: AngularFirestoreDocument<User> = this.afs.doc(`users/${user.uid}`);

      const data = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL
      };

      // Merge so the entire object isn't replaced everytime
      return userRef.set(data, { merge: true });
    }
    return false;
  }
}
