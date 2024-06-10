export class Utils {
    public static UUID(): string {
        return Math.floor(Math.random() * 1e6).toString();
    }
}