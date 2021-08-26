import { Predicate } from './Predicate';
import { Resource } from './Resource';

export class Injection {
  public predicates: Array<Predicate>;
  public resources: Array<Resource>;

  constructor(predicates: Array<Predicate>, resources: Array<Resource>) {
    this.predicates = predicates;
    this.resources = resources;
  }

  public static deserialize(json: any) {
    if (!json) return;
    return new Injection(
      json.predicates
        ? (Object.values(json.predicates)
            .map<Predicate | undefined>(x => Predicate.deserialize(x))
            .filter(x => x !== undefined) as Predicate[])
        : [],
      json.resources
        ? (Object.values(json.resources)
            .map<Resource | undefined>(x => Resource.deserialize(x))
            .filter(x => x !== undefined) as Resource[])
        : []
    );
  }
}

export class Injections {
  public items: Array<Injection>;

  constructor(items: Array<Injection>) {
    this.items = items;
  }

  public static deserialize(json: any) {
    if (!(json && json instanceof Array)) return;
    return new Injections(
      json
        ? (json
            .map<Injection | undefined>(x => Injection.deserialize(x))
            .filter(x => x !== undefined) as Injection[])
        : []
    );
  }
}
