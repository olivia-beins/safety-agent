declare module 'better-sqlite3' {
  export interface Statement {
    all(...params: any[]): any[];
    get(...params: any[]): any;
    run(...params: any[]): RunResult;
  }

  export interface RunResult {
    lastInsertRowid: number;
    changes: number;
  }

  export class Database {
    constructor(path: string, options?: any);
    prepare(sql: string): Statement;
    exec(sql: string): void;
    close(): void;
  }

  export default Database;
}

