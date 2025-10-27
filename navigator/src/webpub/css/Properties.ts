export interface IUserProperties {
  zoom: number | null;
}

export class UserProperties {
  zoom: number | null;

  constructor(props: IUserProperties) {
    this.zoom = props.zoom ?? null;
  }

    private toPercentage(value: number, ratio: boolean = false) {
    if (ratio || value > 0 && value <= 1) {
      return `${ Math.round(value * 100) }%`;
    } else {
      return `${ value }%`;
    }
  }

  toCSSProperties(): { [key: string]: string } {
    const properties: { [key: string]: string } = {};

    if (this.zoom !== null) properties["--USER__zoom"] = this.toPercentage(this.zoom, true);

    return properties;
  }
}
