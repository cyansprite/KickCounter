import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';

@Component({
  selector: 'file-upload-dialog',
  templateUrl: 'file-upload-dialog.html',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
})
export class FileUploadDialog {
  file: Blob;
  setFile(event: any) {
    this.file = event.target.files[0];
  }
}