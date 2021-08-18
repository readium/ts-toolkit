export class PredicateProperties {
    contains? : string;

    constructor(contains?: string) {
        this.contains = contains;
    }

    public static deserialize(json: any) {
        if (!json) return;
        return new PredicateProperties(json.contains);
    }
}

export class Predicate {
    public readonly type: string;
    public readonly properties?: PredicateProperties;

    constructor(type: string, properties?: PredicateProperties) {
        this.type = type;
        this.properties = properties;
    }

    public static deserialize(json: any) {
        if (!(json && json.type)) return;        
        return new Predicate(json.type, PredicateProperties.deserialize(json.properties));        
    }
}