import React from "react";

export interface JsonLdProps<T extends Record<string, unknown> | Array<Record<string, unknown>>> {
  data: T;
}

/**
 * XSS-safe Server-Side JSON-LD Structured Data Component.
 * Escapes raw `<` characters to `\u003c` to eliminate script-injection vectors.
 */
export function JsonLd<T extends Record<string, unknown> | Array<Record<string, unknown>>>({
  data,
}: JsonLdProps<T>) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
