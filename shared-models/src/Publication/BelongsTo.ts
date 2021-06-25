export class BelongsTo {
  //TODO : implement
  // constructor() {}

  public static fromJSON(json: any): BelongsTo | undefined {
    if (json) {
      return undefined;
      //   json instanceof Array) {
      //     return new Contributors(json.map<Contributor>(item => Contributor.fromJSON(item) as Contributor));
    } else {
      return undefined;
    }
  }

  public toJSON(): any {
    return {};
  }
}
