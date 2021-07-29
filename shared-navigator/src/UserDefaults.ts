export abstract class UserDefaults {
    public abstract getBool(key: string): boolean | undefined;
    public abstract setBool(key: string, value: boolean): void;
  
    public abstract getNumber(key: string): number | undefined;
    public abstract setNumber(key: string, value: number): void;
  
    public abstract getString(key: string): string | undefined;
    public abstract setString(key: string, value: string): void;
  
    public abstract getDate(key: string): Date | undefined;
    public abstract setDate(key: string, value: Date): void;
  
    public abstract deleteKey(key: string): void;
}