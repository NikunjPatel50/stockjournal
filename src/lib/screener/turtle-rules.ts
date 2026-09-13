export const TURTLE_LOOKBACKS = {
  s1: 20,
  s2: 55,
  weekly: 20,
  maxAgeBars: 2,
} as const;

export type TurtleSystem = "s1" | "s2" | "weekly" | "any";
export type TurtleSystemCode = "S1" | "S2" | "W20";

export function matchesTurtleSystem(
  system: TurtleSystem,
  code: TurtleSystemCode
): boolean {
  if (system === "any") return true;
  if (system === "s1") return code === "S1";
  if (system === "s2") return code === "S2";
  return code === "W20";
}
