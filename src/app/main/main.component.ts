import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { MatAccordion, MatExpansionModule } from '@angular/material/expansion'; 
import { MatButtonModule } from '@angular/material/button'; 
import { MatCardModule } from '@angular/material/card'; 
import { MatCommonModule } from '@angular/material/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog'; 
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon'; 
import { MatInput, MatInputModule } from '@angular/material/input'; 
import { MatMenu, MatMenuModule } from '@angular/material/menu'; 
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar'; 
import { MatTable, MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar'; 
import { db, Kick, KickSession } from '../../db';
import { liveQuery } from 'dexie';
import download from 'downloadjs';
import { exportDB } from 'dexie-export-import';
import { FileUploadDialog } from './file-upload-dialog';
import { ErrorDialog } from './error-dialog';

export type Mode = 'Kick' | 'Show';
export interface JoinedSession {
  id: number;
  kicks: Kick[];
}

@Component({
  selector: 'app-main',
  standalone: true,
  imports: [
    // mat
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatMenuModule,
    MatSnackBarModule,
    MatTableModule,
    MatToolbarModule,
    MatCommonModule,

    // angular
    CommonModule,
  ],
  templateUrl: './main.component.html',
  styleUrl: './main.component.css'
})
export class MainComponent implements OnInit {
  filterTextInput: MatInput;
  @ViewChild(MatInput) set _input(input: MatInput) {
    if(input) {
      this.filterTextInput = input;
    }
  }

  accordion: MatAccordion;
  @ViewChild(MatAccordion) set _accordion(input: MatAccordion) {
    if(input) {
      this.accordion = input;
    }
  }

  menu: MatMenu;
  @ViewChild(MatMenu) set _menu(input: MatMenu) {
    if(input) {
      this.menu = input;
    }
  }

  table: MatTable<Kick>;
  @ViewChild('kickAdderTable') set _table(input: MatTable<Kick>) {
    if(input) {
      this.table = input;
    }
  }

  constructor(public dialog: MatDialog,
             private snackBar: MatSnackBar,
  ) {
    
  }

  sessions$ = liveQuery(() => db.kicksSession.toArray());
  // kicks$ = liveQuery(() => db.kicks.toArray());
  sessions: KickSession[];
  ready = false;
  allKicksBySessionId: JoinedSession[] = [];
  filteredKicks: JoinedSession[] = [];

  mode: Mode = 'Kick';
  displayedColumns: string[] = ['count', 'date',];
  id = 0;
  currentSessionId: number;

  async ngOnInit(): Promise<void> {
    this.sessions$.subscribe({
      next: (sessions: KickSession[]) => {
        this.sessions = sessions;
        this.ready = true;
        this.updateSessionCache();
      },
      error: (err) => {
        this.error("Getting session failed..", err);
        console.error(err);
      }
    });
  }

  isKicking: boolean = false;
  kicks: Kick[] = [];

  kick() {
    const kick = () => {
      this.kicks.push({
        count: ++this.id,
        date: new Date(Date.now()),
        sessionId: this.currentSessionId,
      });
      setTimeout(() => {
        this.table?.renderRows();
      });
    }

    if (!this.isKicking) {
      this.startSession().then((id: number) => {
        this.isKicking = true;
        this.currentSessionId = id;
        kick();
      }).catch((err) => {
        console.log(err);
        console.log("Please try again.");
      });
    } else {
      kick();
    }
  }

  done() {
    this.updateKicksDB().then(() => {
      this.kicks = [];
      this.isKicking = false;
      this.id = 0;
      this.updateSessionCache()
      this.snackAttack('Saved new session');
    }).catch((err) => {
      this.error("Saving kicks failed", err);
      console.error(err);
    });
  }

  isDoneDisabled() {
    return !this.isKicking;
  }

  menuSelect(mode: Mode) {
    this.mode = mode;
  }

  async startSession(): Promise<number> {
    return await db.kicksSession.add({});
  }

  async updateKicksDB(): Promise<void> {
    await db.kicks.bulkAdd(this.kicks);
  }

  async getKicksBySessionId(id: number): Promise<Kick[]> {
    return await db.kicks
      .where({
        sessionId: id,
      }).toArray();
  }

  updateSessionCache() {
    if (this.isKicking)
      return;

    this.sessions.forEach((s) => {
      if (this.allKicksBySessionId[s.id!]) {
        // no-op for now
      } else {
        if (s.id) {
          this.getKicksBySessionId(s.id!).then((v: Kick[]) => {
            const id = s.id! - 1;
            this.allKicksBySessionId[id] = {
              id: s.id!,
              kicks: [...v]
            }
            this.filteredKicks = [...this.allKicksBySessionId];
          }).catch((err) => {
            this.error("Updating kick cache failed", err);
            console.error(err);
          })
        }
      }
    });
  }

  applyFilter() {
    if (this.filterTextInput.value === '') {
      this.filteredKicks = [...this.allKicksBySessionId];
    } else {
      this.filteredKicks = this.allKicksBySessionId.filter((js) => {
        const v = this.filterTextInput.value;
        try {
          const d = Date.parse(v);
          if (!isNaN(d)) {
            const date = new Date(d);
            return js.kicks.some((k) => k.date.getMonth() == date.getMonth() && k.date.getDay() == date.getDay());
          }
          return false;
        } catch {
          return false;
        }
      });
    }
  }

  clearTextFilter() {
    this.filterTextInput.value = '';
    this.filteredKicks = [...this.allKicksBySessionId];
  }

  getJoinedSessionById(id: number) {
    return this.filteredKicks.find((j) => j.id === id)?.kicks.length;
  }

  async backup() {
    try {
      const blob = await exportDB(db);
      download(blob, 'kicks.backup.json', "application/json");
    } catch(err) {
      this.error("Exporting failed", err);
    }
  }

  async unbackup(file?: Blob) {
    if(file) {
      try {
        await db.delete();
        await db.open();
        await db.import(file);
        this.snackAttack('Import complete');
      } catch(err) {
        this.error("Importing failed", err);
      }
    }
  }

  upload() {
    const dialogRef = this.dialog.open(FileUploadDialog);
    dialogRef.afterClosed().subscribe(result => {
      console.log(result);
      if (result) {
        this.unbackup(dialogRef.componentRef?.instance.file);
      }
    });
  }

  snackAttack(message: string) {
    this.snackBar.open(message, 'OK', {
      duration: 3000
    });
  }

  error(error: string, err: any) {
    console.log(error, err);
    const dialogRef = this.dialog.open(ErrorDialog);
    if (dialogRef.componentRef?.instance) {
      dialogRef.componentRef.instance.error = error;
      dialogRef.componentRef.instance.jsonError = err;
    }
  }
}