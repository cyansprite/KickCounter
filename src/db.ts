// db.ts
import Dexie, { Table } from 'dexie';
import { exportDB, importDB } from 'dexie-export-import';

export interface KickSession {
  id?: number;
}

export interface Kick {
  id?: number;
  count: number;
  date: Date;
  sessionId: number;
}

export class AppDB extends Dexie {
  kicksSession!: Table<KickSession, number>;
  kicks!: Table<Kick, number>;

  constructor() {
    super('ngdexieliveQuery');
    // this.delete();
    this.version(1).stores({
      kicksSession: 'id++',
      kicks: 'id++, sessionId',
    });
  }
}

export const db = new AppDB();