import * as changeCase from "change-case";

function isObject(x: any): boolean {
  return x !== null && typeof x === "object";
}

// tslint:disable-next-line:max-line-length
export type Case = "camel" | "constant" | "dot" | "header" | "isLower" | "isUpper" | "lower" | "lcFirst" | "no" | "param" | "pascal" | "path" | "sentence" | "snake" | "swap" | "title" | "upper" | "ucFirst";

/**
 * Converts all keys of an Object recursively
 * to follow the given casing convention.
 *
 * @param obj Object to convert
 * @param wanted wanted case convention
 */
export function changeKeyCase(
  obj: any,
  wanted: Case
): any {
  return Object.entries(obj).reduce((acc, [k, v]) => {
    const newKey = (changeCase as any)[wanted](k);
    acc[newKey] = isObject(v) && changeKeyCase(v, wanted) || v;
    return acc;
  }, {} as any);
}