import type { Database, DbExecutor } from './client';

/**
 * Runs several repository calls as one all-or-nothing database transaction.
 * Services depend on this interface and receive repositories bound to the
 * transaction, so they never see a database handle themselves.
 *
 *   await this.uow.run(async ({ users, leads }) => { ... });
 */
export interface UnitOfWork<R> {
  run<T>(work: (repos: R) => Promise<T>): Promise<T>;
}

export class DrizzleUnitOfWork<R> implements UnitOfWork<R> {
  constructor(
    private readonly db: Database,
    private readonly bind: (executor: DbExecutor) => R,
  ) {}

  run<T>(work: (repos: R) => Promise<T>): Promise<T> {
    return this.db.transaction((tx) => work(this.bind(tx)));
  }
}
