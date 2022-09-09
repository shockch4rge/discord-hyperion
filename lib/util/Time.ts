export class Time {
    public static readonly Second = 1000;
    public static readonly Minute = 60 * Time.Second;
    public static readonly Hour = 60 * Time.Minute;
    public static readonly Day = 24 * Time.Hour;
    public static readonly Week = 7 * Time.Day;
    public static readonly Month = 30 * Time.Day;
    public static readonly Year = 365 * Time.Day;

    public static hours(hours: number) {
        return hours * Time.Hour;
    }

    public static minutes(minutes: number) {
        return minutes * Time.Minute;
    }

    public static seconds(seconds: number) {
        return seconds * Time.Second;
    }

    public static days(days: number) {
        return days * Time.Day;
    }

    public static weeks(weeks: number) {
        return weeks * Time.Week;
    }

    public static months(months: number) {
        return months * Time.Month;
    }
}
