import { TZDate } from "@date-fns/tz";

export namespace DateUtils {

   /**
    * 
    * Convert to UTC date using custom function 
    */
   export function parseDateToUTC(date: string | Date): Date {
      // Parse the input date string or object
      const parsedDate = new Date(date);

      // Check for invalid date
      if (isNaN(parsedDate.getTime())) {
         throw new Error("Invalid date");
      }

      // Create a UTC Date object at midnight UTC
      const utcDate = new Date(Date.UTC(parsedDate.getUTCFullYear(), parsedDate.getUTCMonth(), parsedDate.getUTCDate(), 0, 0, 0, 0));
      return utcDate;
   }


   /**
    * 
    * Convert to UTC date using date-fns-tz
    */
   export function getUTCDate(date?: Date | undefined) {
      return new TZDate(date, "UTC")
   }
}
