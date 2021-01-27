import { Component } from '@angular/core';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {

  /**
   * @constructor
   * @param  {AuthService} auth - Google authorized user object used as a required prop for the projects component.
   */
  constructor(public auth: AuthService) {}

}
