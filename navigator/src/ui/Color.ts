/* Copyright 2021 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

export class Color {
  public r: number;
  public g: number;
  public b: number;
  public a: number;

  constructor(r: number, g: number, b: number, a: number) {
    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a;
  }

  public toString() {
    return `rgba(${[this.r, this.g, this.b, this.a].join(',')})`;
  }

  public static get black(): Color {
    return new Color(0, 0, 0, 1);
  }

  public static get white(): Color {
    return new Color(255, 255, 255, 1);
  }
}
