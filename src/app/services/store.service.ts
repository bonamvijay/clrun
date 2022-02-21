import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject, throwError } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { StoreSettings } from '../models/store-settings.model';
import { StoreEntity } from '../models/store-entity.model';

@Injectable({ providedIn: 'root' })
export abstract class StoreService<T extends StoreEntity> {
  //#region Subjects, Objservables, Getter/Setters
  private itemsSubject = new BehaviorSubject<T[]>([]);
  items$ = this.itemsSubject.asObservable();

  protected get items(): T[] {
    return this.itemsSubject.getValue();
  }
  protected set items(val: T[]) {
    this.itemsSubject.next(val ? [...val] : []);
  }

  private selectedSubject = new BehaviorSubject<T>(null);
  selected$ = this.selectedSubject.asObservable();

  protected get selected(): T {
    return this.selectedSubject.getValue();
  }
  protected set selected(val: T) {
    this.selectedSubject.next(val == null ? null : { ...val });
  }

  private loadingSubject = new BehaviorSubject<boolean>(false);
  loading$ = this.loadingSubject.asObservable();

  protected get loading(): boolean {
    return this.loadingSubject.getValue();
  }
  protected set loading(val: boolean) {
    this.loadingSubject.next(val);
  }

  private loadErrorSubject = new Subject<HttpErrorResponse>();
  loadError$ = this.loadErrorSubject.asObservable();

  protected set loadError(val: HttpErrorResponse) {
    this.loadErrorSubject.next(val);
  }

  private getErrorSubject = new Subject<HttpErrorResponse>();
  getError$ = this.getErrorSubject.asObservable();

  protected set getError(val: HttpErrorResponse) {
    this.getErrorSubject.next(val);
  }

  private deletingSubject = new BehaviorSubject<boolean>(false);
  deleting$ = this.deletingSubject.asObservable();

  protected get deleting(): boolean {
    return this.deletingSubject.getValue();
  }
  protected set deleting(val: boolean) {
    this.deletingSubject.next(val);
  }

  protected deleteSuccessSubject = new Subject<T>();
  deleteSuccess$ = this.deleteSuccessSubject.asObservable();

  protected updateSuccessSubject = new Subject<T>();
  updateSuccess$ = this.updateSuccessSubject.asObservable();

  protected createSuccessSubject = new Subject<T>();
  createSuccess$ = this.createSuccessSubject.asObservable();

  private noLoadResultsSubject = new Subject<void>();
  noLoadResults$ = this.noLoadResultsSubject.asObservable();
  //#endregion

  constructor(
    protected http: HttpClient,
    protected settings: StoreSettings
  ) {}

  /**
   * Load data into the store. Objects loaded are exposed through the items$ observable.
   * @param filter filter for the api call. Default ''
   * @param order How to order the return data. Default ''
   * @param page Page of the data. default true
   * @param pageSize PageSize of the data. Default true = return everything
   * @param useCache If true and the store already has data, no api call will be made. Default false
   * @param append If true, appends returned data to the existing data, otherwise it replaces the data. Default false
   * @returns void
   */
  load(filter = '', order = '', page = 0, pageSize = 0, useCache = false, append = false) {
    if (useCache && this.items?.length > 0) {
      return;
    }
    this.loading = true;
    const url = this.settings.url + `?filter=${filter}&order=${order}&page=${page}&pageSize=${pageSize}`;

    this.http
      .get<T[]>(url)
      .pipe(
        catchError((e) => {
          this.loadError = e;
          return throwError(`Error loading ${this.settings.itemName}s`);
        }),
        finalize(() => (this.loading = false))
      )
      .subscribe((res) => {
        if (append) {
          this.items = this.items.concat(res);
        } else {
          this.items = res;
        }

        if (res.length === 0) {
          this.noLoadResultsSubject.next();
        }
      });
  }

  /**
   * Gets the object with the given ID and adds it (or replaces it) to the store.
   * Sets the retrieved object as the selected item.
   * @param id The id of the object to get
   * @returns void
   */
  get(id: string | number) {
    if (id === null) {
      this.selected = null;
      return;
    }

    this.loading = true;

    this.http
      .get<T>(`${this.settings.url}${id}`)
      .pipe(
        catchError((e) => {
          this.getError = e;
          return throwError(`Error loading ${this.settings.itemName}`);
        }),
        finalize(() => (this.loading = false))
      )
      .subscribe((res) => {
        this.replaceOrAdd(res);
        this.selected = res;
      });
  }

  /**
   * Posts the given object to the API and adds the returned object to the store
   * @param val The object to post to the API
   */
  add(val: T) {
    this.loading = true;

    this.http
      .post<T>(`${this.settings.url}`, val)
      .pipe(
        catchError((e) => {
          this.getError = e;
          return throwError(`Error creating ${this.settings.itemName}`);
        }),
        finalize(() => (this.loading = false))
      )
      .subscribe((res) => {
        this.replaceOrAdd(res);
        this.createSuccessSubject.next(res);
      });
  }

  /**
   * Calls the API with a PUT and passes the given object. Adds or replaces returned object into the store.
   * @param val Object to update via a PUT call
   */
  update(val: T) {
    this.loading = true;
    const id = val.uniqueId();

    this.http
      .put<T>(`${this.settings.url}${id}`, val)
      .pipe(
        catchError((e) => {
          this.getError = e;
          return throwError(`Error updating ${this.settings.itemName}`);
        }),
        finalize(() => (this.loading = false))
      )
      .subscribe((res) => {
        this.replaceOrAdd(res);
        this.updateSuccessSubject.next(res);
      });
  }

  /**
   * Calls the API with a delete to delete the given object. Removes it from the store on success
   * @param val Object to delete
   */
  delete(val: T) {
    this.deleting = true;
    const id = val.uniqueId();

    this.http
      .delete(`${this.settings.url}${id}`)
      .pipe(
        catchError((e) => {
          this.getError = e;
          return throwError(`Error deleting ${this.settings.itemName}`);
        }),
        finalize(() => (this.deleting = false))
      )
      .subscribe((res) => {
        this.remove(val);
        this.deleteSuccessSubject.next(val);
      });
  }

  /**
   * Sets the given object as the selected object. Does not manipulate the data store.
   * @param val Object to select
   */
  select(val: T) {
    this.selected = val;
  }

  /**
   * Gets the object from the local store by the id given. Uses Array.find
   * @param id ID of the object to get from the store
   * @returns T
   */
  getCached(id: string | number): T {
    return this.items.find((i) => i.uniqueId() === id);
  }

  /**
   * Finds a local object with the given predicate and returns the first instance found.
   * Uses Array.find with the predicate as the find content
   * @param predicate Search predicate to use to find the object
   * @returns T
   */
  findCached(predicate: (item: T) => boolean): T {
    return this.items.find(i => predicate(i));
  }

  /**
   * Empties the local data store
   */
  clearCached() {
    this.items = [];
  }

  /**
   * Removes the given object from the local data store
   * @param val Object to remove
   */
  protected remove(val: T) {
    this.items = this.items.filter(
      (i) => i.uniqueId() !== val.uniqueId()
    );
  }

  /**
   * Adds the given object to the local data store, or replaces it if it already exists
   * @param item Object to add or replace
   */
  protected replaceOrAdd(item: T) {
    const existingIndex = this.items?.findIndex(
      (i) => i.uniqueId() === item.uniqueId()
    );

    if (existingIndex >= 0) {
      this.items[existingIndex] = item;
      this.items = this.items;
    } else {
      this.items.push(item);
      this.items = this.items;
    }
  }
}
