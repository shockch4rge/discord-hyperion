export class Time {
    public static readonly second = 1_000;
    public static readonly minute = 60 * Time.second;
    public static readonly hour = 60 * Time.minute;
    public static readonly day = 24 * Time.hour;
    public static readonly week = 7 * Time.day;

    private constructor() {}

    public static hours(hours: number) {
        return hours * Time.hour;
    }

    public static minutes(minutes: number) {
        return minutes * Time.minute;
    }

    public static seconds(seconds: number) {
        return seconds * Time.second;
    }

    public static days(days: number) {
        return days * Time.day;
    }

    public static weeks(weeks: number) {
        return weeks * Time.week;
    }
}