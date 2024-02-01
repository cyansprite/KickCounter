import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';

@Component({
  selector: 'error-dialog',
  templateUrl: 'error-dialog.html',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, CommonModule],
})
export class ErrorDialog {
    @Input('error') error: string;
    @Input('jsonError') jsonError: string;
}
