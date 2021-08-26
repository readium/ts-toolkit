/* Copyright 2021 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

export declare type ObserverHandler<T> = (value?: T) => void;

export class Observable<T> {
  private _value?: T;
  public get value(): T | undefined {
    return this._value;
  }
  public set value(v: T | undefined) {
    this._value = v;
    this.notifyObservers(v);
  }

  public observers: Array<ObserverHandler<T>>;

  constructor(value?: T) {
    this._value = value;
    this.observers = new Array<ObserverHandler<T>>();
  }

  public observe(handler: ObserverHandler<T>): void {
    this.observers.push(handler);
  }

  private notifyObservers(value?: T) {
    this.observers.forEach(observer => observer(value));
  }
}
