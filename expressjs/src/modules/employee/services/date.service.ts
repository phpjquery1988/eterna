// Converted from NestJS Service
import { Request, Response } from 'express';

import { DateTime } from 'luxon';


export class DateService {
  timeZone = 'America/New_York';
  /**
   * Returns a Date object representing midnight (start of day)
   * in the specified US timeZone. The returned Date holds a UTC timestamp
   * that, when formatted in the given timezone, corresponds to midnight.
   *
   * @param dateStr - Date string in MM/DD/YY format.
   * @param timeZone - A string such as 'America/New_York' representing the US timezone.
   * @returns A Date object corresponding to midnight in the given timezone.
   */
  getStartDate(dateStr: string, timeZone: string = this.timeZone): Date {
    // Parse the date string using Luxon in the provided timezone.
    console.log('dateStr', dateStr);

    // Try parsing with leading zeros format first
    let dt = DateTime.fromFormat(dateStr, 'MM/dd/yy', { zone: timeZone });
    
    // If that fails, try without leading zeros
    if (!dt.isValid) {
      dt = DateTime.fromFormat(dateStr, 'M/d/yy', { zone: timeZone });
    }

    if (!dt.isValid) {
      throw new Error('Invalid date string format. Expected format: MM/dd/yy or M/d/yy');
    }

    // Set the time to the start of the day (midnight) in the specified timezone.
    const startOfDay = dt.startOf('day');

    // Return the underlying JavaScript Date.
    // When this Date is formatted with the same timezone, it will show midnight.
    return startOfDay.toJSDate();
  }

  getEndDate(dateStr: string, timeZone: string = this.timeZone): Date {
    // Parse the date string using Luxon in the provided timezone.
    const dt = DateTime.fromFormat(dateStr, 'MM/dd/yy', { zone: timeZone });
    if (!dt.isValid) {
      throw new Error('Invalid date string format.');
    }

    // Set the time to the start of the day (midnight) in the specified timezone.
    const startOfDay = dt.startOf('day');

    // Return the underlying JavaScript Date.
    // When this Date is formatted with the same timezone, it will show midnight.
    return startOfDay
      .plus({ hours: 23, minutes: 59, seconds: 59, milliseconds: 999 })
      .toJSDate();
  }

  getDateString(date: Date | string, timeZone: string = this.timeZone): string {
    let dt: DateTime;

    if (typeof date === 'string') {
      // Try to parse the string date in various common formats
      const possibleFormats = ['MM/dd/yy', 'yyyy-MM-dd', 'MM-dd-yyyy', 'MM/dd/yyyy', 'yyyy/MM/dd'];
      
      for (const format of possibleFormats) {
        dt = DateTime.fromFormat(date, format, { zone: timeZone });
        if (dt.isValid) break;
      }

      // If none of the formats worked, try parsing as ISO
      if (!dt?.isValid) {
        dt = DateTime.fromISO(date, { zone: timeZone });
      }
    } else {
      // Handle Date object
      if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
        throw new Error('Invalid date provided. Please provide a valid Date object or date string.');
      }
      dt = DateTime.fromJSDate(date, { zone: timeZone });
    }

    if (!dt.isValid) {
      throw new Error(`Invalid date or timezone. Date: ${date}, Timezone: ${timeZone}`);
    }

    // Format the DateTime to the required format "MM/dd/yy"
    return dt.toFormat('MM/dd/yy');
  }


  getDateStringNew(date: Date | string, timeZone: string = this.timeZone): string {
    let dt: DateTime;

    if (typeof date === 'string') {
      // Try to parse the string date in various common formats
      const possibleFormats = [
        'MM/dd/yy',
        'yyyy-MM-dd',
        'MM-dd-yyyy',
        'MM/dd/yyyy',
        'yyyy/MM/dd',
      ];

      for (const format of possibleFormats) {
        dt = DateTime.fromFormat(date, format);
        if (dt.isValid) break;
      }

      // If none of the formats worked, try parsing as ISO
      if (!dt?.isValid) {
        dt = DateTime.fromISO(date);
      }
    } else {
      // Handle Date object
      if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
        throw new Error(
          'Invalid date provided. Please provide a valid Date object or date string.',
        );
      }
      dt = DateTime.fromJSDate(date);
    }

    if (!dt.isValid) {
      throw new Error(
        `Invalid date or timezone. Date: ${date}, Timezone: ${timeZone}`,
      );
    }

    // Format the DateTime to the required format "MM/dd/yy"
    return dt.toFormat('MM/dd/yy');
  }
}
