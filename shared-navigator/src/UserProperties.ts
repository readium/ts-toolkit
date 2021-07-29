//
//
//

export abstract class UserPropertyStringifier {
  public abstract toString(): string;
}

export class UserProperty extends UserPropertyStringifier {
  public reference: string;
  public name: string;

  constructor(reference: string, name: string) {
    super();
    this.reference = reference;
    this.name = name;
  }

  public toString(): string {
    return '';
  }
}

export class Enumerable extends UserProperty {
  public index: number;
  public values: Array<string>;

  constructor(
    index: number,
    values: Array<string>,
    reference: string,
    name: string
  ) {
    super(reference, name);
    this.index = index;
    this.values = values;
  }

  public toString(): string {
    return this.values[this.index];
  }
}

export class Incrementable extends UserProperty {
  public value: number;
  public max: number;
  public min: number;
  public step: number;
  public suffix: string;

  constructor(
    value: number,
    min: number,
    max: number,
    step: number,
    suffix: string,
    reference: string,
    name: string
  ) {
    super(reference, name);
    this.value = value;
    this.max = max;
    this.min = min;
    this.step = step;
    this.suffix = suffix;
  }

  public increment(): void {
    this.value += this.value + this.step <= this.max ? this.step : 0.0;
  }

  public decrement(): void {
    this.value -= this.value - this.step >= this.min ? this.step : 0.0;
  }

  public toString(): string {
    return `${this.value}${this.suffix}`;
  }
}

export class Switchable extends UserProperty {
  public onValue: string;
  public offValue: string;
  public on: boolean;
  public values: Map<boolean, string>;

  constructor(
    onValue: string,
    offValue: string,
    on: boolean,
    reference: string,
    name: string
  ) {
    super(reference, name);
    this.onValue = onValue;
    this.offValue = offValue;
    this.on = on;
    this.values = new Map<boolean, string>([
      [true, this.onValue],
      [false, this.offValue],
    ]);
  }

  public switchValue(): void {
    this.on = !this.on;
  }

  public toString(): string {
    return this.values.get(this.on)?.toString() as string;
  }
}

export class UserProperties {
  public properties: Array<UserProperty> = [];

  public addEnumerable(
    index: number,
    values: Array<string>,
    reference: string,
    name: string
  ) {
    this.properties.push(new Enumerable(index, values, reference, name));
  }

  public addIncrementable(
    nValue: number,
    min: number,
    max: number,
    step: number,
    suffix: string,
    reference: string,
    name: string
  ) {
    this.properties.push(
      new Incrementable(nValue, min, max, step, suffix, reference, name)
    );
  }

  public addSwitchable(
    onValue: string,
    offValue: string,
    on: boolean,
    reference: string,
    name: string
  ) {
    this.properties.push(
      new Switchable(onValue, offValue, on, reference, name)
    );
  }

  public getProperty(reference: string): UserProperty | undefined {
    return this.properties.find(x => x.reference === reference);
  }
}
