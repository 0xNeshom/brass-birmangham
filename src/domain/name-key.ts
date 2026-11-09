import casefold from "./unicode-casefold.json";

/** Frozen Unicode 15.0.0 full casefold, shared with private.name_key in SQL. */
export function nameKey(name: string): string {
  const mappings: Readonly<Record<string, string>> = casefold.mappings;
  return Array.from(name.normalize("NFC"), (character) =>
    Object.hasOwn(mappings, character) ? mappings[character] : character,
  ).join("").normalize("NFC");
}
