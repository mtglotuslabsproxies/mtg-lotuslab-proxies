/**
 * Manual translation overrides for cards that Scryfall doesn't have localized data for.
 * Keyed by English card name (exact match), then by language code.
 */
export type CardTranslationOverride = {
  printed_name?: string;
  printed_type_line?: string;
  printed_text?: string;
  printed_flavor_text?: string;
};

export const CARD_TRANSLATION_OVERRIDES: Record<string, Record<string, CardTranslationOverride>> = {
  "Demonic Consultation": {
    fr: {
      printed_name: "Consultation démoniaque",
      printed_text:
        "Choisissez un nom de carte. Exilez les six cartes du sommet de votre bibliothèque, puis révélez les cartes du dessus de votre bibliothèque jusqu'à ce que vous révéliez une carte avec le nom choisi. Mettez cette carte dans votre main et exilez toutes les autres cartes révélées de cette manière.",
    },
  },
};

/**
 * Apply manual overrides to a card object if any are defined for the given language.
 * Only fills in missing fields by default (unless forceOverride is true).
 */
export function applyTranslationOverrides(
  card: Record<string, unknown>,
  lang: string,
  forceOverride = false
): void {
  const cardName = (card.name as string) || "";
  const override = CARD_TRANSLATION_OVERRIDES[cardName]?.[lang];
  if (!override) return;

  if (override.printed_name && (forceOverride || !card.printed_name)) {
    card.printed_name = override.printed_name;
  }
  if (override.printed_type_line && (forceOverride || !card.printed_type_line)) {
    card.printed_type_line = override.printed_type_line;
  }
  if (override.printed_text && (forceOverride || !card.printed_text)) {
    card.printed_text = override.printed_text;
  }
  if (override.printed_flavor_text && (forceOverride || !card.printed_flavor_text)) {
    card.printed_flavor_text = override.printed_flavor_text;
  }
}
