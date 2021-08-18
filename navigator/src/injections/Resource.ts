export enum ResourceTargets {
    body = 'body',
    head = 'head',
}

export enum ResourceInsertions {
    prepend = 'prepend',
    append = 'append',
}

export class Resource {
    public readonly href: string;
    public readonly type: string;
    public readonly target: ResourceTargets;
    public readonly insertion: ResourceInsertions;
    public readonly preload: boolean;

    constructor(href: string, type: string, target: ResourceTargets, insertion: ResourceInsertions, preload: boolean) {
        this.href = href;
        this.type = type;
        this.target = target;
        this.insertion = insertion;
        this.preload = preload;
    }

    public static deserialize(json: any) {
        if (!(json && json.href && json.type && json.target && json.insertion)) return;
        const target: ResourceTargets | undefined = Object.values(ResourceTargets).find((v) => v === json.target) || undefined;
        const insertion: ResourceInsertions | undefined = Object.values(ResourceInsertions).find((v) => v === json.insertion) || undefined;
        if (!(target && insertion)) return;
        return new Resource(json.href, json.type, target, insertion, json.preload ?? false);
    }
}