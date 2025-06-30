/**
 * Convert snake_case keys to camelCase recursively in an object or array.
 * @param data The input object or array.
 * @returns A new object or array with camelCase keys.
 */

import { isDate } from 'date-fns';

export interface ShippingData {
  npn: string;
  agent: string;
  agent_type: string;
  Eftdt: string;
  Enddt: string;
  agentStatus: string;
  agents_upline: string;
  agents_upline_npn: string;
}

function isScalar(value: any): boolean {
  // consider date as scalar too, because we don't want to consider this as object
  return (
    isDate(value) ||
    value === null ||
    ['string', 'number', 'boolean'].includes(typeof value)
  );
}

// typeof T === "object"

// t = {full_name: "", date: ""}

// obj = {}
// obj["date"] = t["date"] => 2021-09-09z02,22

// t = 2021-09-09z02,22 typeof t === "object" => true
// Object.keys(t = 2021-09-09z02,22) => []

export function transformKeysToCamelCase<T extends object>(data: T | T[]) {
  if (Array.isArray(data)) {
    return data.map((item) => transformKeysToCamelCase(item));
  } else if (data !== null && typeof data === 'object') {
    return Object.keys(data).reduce(
      (acc, key) => {
        // Check if the key is a single word or has underscores
        const camelKey = snakeToCamel(key);
        acc[camelKey] = isScalar(data[key])
          ? data[key]
          : transformKeysToCamelCase(data[key]);
        return acc;
      },
      {} as Record<string, any>,
    );
  }
  return data;
}

export function parseDateFields<T>(data: T, fields: (keyof T)[]) {
  for (let field of fields) {
    if (data[field]) {
      data[field] = new Date(data[field] as any).toUTCString() as any;
    }
  }
  return data;
}

function snakeToCamel(str: string): string {
  if (!str.includes('_')) {
    return str.toLowerCase();
  }
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}
