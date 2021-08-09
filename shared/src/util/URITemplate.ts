/* Copyright 2021 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

/** A lightweight implementation of URI Template (RFC 6570).
 *
 *  Only handles simple cases, fitting Readium's use cases.
 *  See https://tools.ietf.org/html/rfc6570
 */
export class URITemplate {
  public uri: string;

  /**
   * List of URI template parameter keys, if the [Link] is templated.
   */
  public parameters: Set<string>;

  constructor(uri: string) {
    this.uri = uri;

    /** List of URI template parameter keys. */
    this.parameters = this.getParameters(uri);
  }

  /**
   * List of URI template parameter keys, if the [Link] is templated.
   */
  private getParameters(uri: string): Set<string> {
    const regex = /\{\??([^}]+)\}/g;
    const match = uri.match(regex);
    if (match) {
      return new Set(
        match
          .join(',')
          .replace(regex, '$1')
          .split(',')
          .map(m => m.trim())
      );
    }
    return new Set();
  }

  /** Expands the URI by replacing the template variables by the given parameters.
   *  Any extra parameter is appended as query parameters.
   *  See RFC 6570 on URI template: https://tools.ietf.org/html/rfc6570
   */
  public expand(parameters: { [param: string]: string }): string {
    const expandSimpleString = (string: string): string => {
      return string
        .split(',')
        .map(parameter => {
          const parameterValue = parameters[parameter];
          return parameterValue ? encodeURIComponent(parameterValue) : '';
        })
        .join(',');
    };

    const expandFormStyle = (string: string): string => {
      return (
        '?' +
        string
          .split(',')
          .map(expression => {
            const parameter = expression.split('=')[0];
            const parameterValue = parameters[parameter];
            if (parameterValue) {
              return `${parameter}=${encodeURIComponent(parameterValue)}`;
            } else {
              return '';
            }
          })
          .join('&')
      );
    };

    return this.uri.replace(/\{(\??)([^}]+)\}/g, (...groups: Array<string>) => {
      return !groups[1]
        ? expandSimpleString(groups[2])
        : expandFormStyle(groups[2]);
    });
  }
}
