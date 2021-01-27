import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Task } from '../task/task.model';

@Component({
  selector: 'app-task-dialog',
  templateUrl: './task-dialog.component.html',
  styleUrls: ['./task-dialog.component.css']
})
export class TaskDialogComponent {
  private backupTask: Partial<Task> = { ...this.data.task };

  /**
   * @constructor
   * @param  {MatDialogRef<TaskDialogComponent>} dialogRef - Reference to MatDialog object
   * @param  {TaskDialogData} data - Task data to be displayed in this dialog
   */
  constructor(
    public dialogRef: MatDialogRef<TaskDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: TaskDialogData
  ) {

  }
  
  /**
   * Closes the dialog and either restores the backupTask if the task already exists in the database
   * or doesn't create a new task at all.
   * @returns void
   */
  cancel(): void {
    if(this.backupTask?.title) {
      this.data.task.title = this.backupTask.title;
      this.data.task.description = this.backupTask.description;
      this.dialogRef.close(this.data);
    } else {
      this.dialogRef.close({});
    }
  }


}

// Information used in a dialog when editing a task
export interface TaskDialogData {
    task: Task;
    enableDelete: boolean;
}

// Information returned when a task dialog is submitted
export interface TaskDialogResult {
  task?: Task;
  delete?: boolean;
}