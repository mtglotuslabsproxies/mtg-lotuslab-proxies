export type ScryfallCard = {
  id: string;
  oracle_id: string;
  name: string;
  lang: string;
  layout: string;
  printed_name?: string;
  type_line?: string;
  printed_type_line?: string;
  oracle_text?: string;
  printed_text?: string;
  flavor_text?: string;
  printed_flavor_text?: string;
  mana_cost?: string;
  colors?: string[];
  color_identity?: string[];
  power?: string;
  toughness?: string;
  frame?: string;
  released_at?: string;
  all_parts?: {
    id: string;
    object: string;
    component: string;
    name: string;
    type_line: string;
    uri: string;
  }[];
  image_status?: string;
  image_uris?: {
    small: string;
    normal: string;
    large: string;
    png: string;
    art_crop: string;
    border_crop: string;
  };
  card_faces?: {
    name: string;
    printed_name?: string;
    type_line: string;
    printed_type_line?: string;
    oracle_text: string;
    printed_text?: string;
    flavor_text?: string;
    printed_flavor_text?: string;
    mana_cost: string;
    colors?: string[];
    power?: string;
    toughness?: string;
    image_uris?: {
      small: string;
      normal: string;
      large: string;
      png: string;
      art_crop: string;
      border_crop: string;
    };
  }[];
  set_name: string;
  set: string;
  collector_number: string;
};

// --- Rate Limiting ---
let lastFetchTime = 0;
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function rateLimitedFetch(url: string, options?: RequestInit): Promise<Response> {
  const now = Date.now();
  const timeSinceLast = now - lastFetchTime;
  if (timeSinceLast < 100) {
    await delay(100 - timeSinceLast);
  }
  lastFetchTime = Date.now();
  return fetch(url, options);
}
// ---------------------

export async function searchCards(query: string): Promise<ScryfallCard[]> {
  if (!query) return [];
  try {
    // We search across all languages if needed, but Scryfall defaults to English.
    let finalQuery = query;
    if (!query.includes("lang:")) {
      finalQuery += " lang:any";
    }
    const res = await rateLimitedFetch(`https://api.scryfall.com/cards/search?q=${encodeURIComponent(finalQuery)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || [];
  } catch (error) {
    console.error("Scryfall search error:", error);
    return [];
  }
}

export async function fetchCardInLanguage(set: string, number: string, lang: string): Promise<ScryfallCard | null> {
  try {
    const res = await rateLimitedFetch(`https://api.scryfall.com/cards/${set}/${number}/${lang}`);
    let card: ScryfallCard | null = null;
    
    if (res.ok) {
      card = await res.json();
      
      // If the localized card has a placeholder/missing image, fallback to the English image
      // to avoid the ugly "Localized Image Not Available" banner on the art.
      if (card && lang !== "en" && (card.image_status === "placeholder" || card.image_status === "missing")) {
        const fb = await rateLimitedFetch(`https://api.scryfall.com/cards/${set}/${number}/en`);
        if (fb.ok) {
          const enCard = await fb.json();
          card.image_uris = enCard.image_uris;
          if (card.card_faces && enCard.card_faces) {
            card.card_faces.forEach((face, i) => {
              if (enCard.card_faces[i]?.image_uris) {
                face.image_uris = enCard.card_faces[i].image_uris;
              }
            });
          }
        }
      }
    } else if (lang !== "en") {
      // Fallback to English to get the specific art/layout
      const fb = await rateLimitedFetch(`https://api.scryfall.com/cards/${set}/${number}/en`);
      if (fb.ok) {
        card = await fb.json();
      }
    }

    if (!card) return null;

    // Aggressively fill in missing localized fields from ANY other print of this card
    if (lang !== "en") {
      const needsName = !card.printed_name;
      const needsType = !card.printed_type_line;
      const needsText = !card.printed_text && !!card.oracle_text; // only need text if it has oracle text

      if (needsName || needsType || needsText) {
        const localizedPrints = await fetchPrintsInLanguage(card.oracle_id, lang);
        
        if (localizedPrints && localizedPrints.length > 0) {
          const printWithName = localizedPrints.find(p => p.printed_name) || localizedPrints[0];
          const printWithType = localizedPrints.find(p => p.printed_type_line) || localizedPrints[0];
          const printWithText = localizedPrints.find(p => p.printed_text) || localizedPrints[0];
          
          card.printed_name = card.printed_name || printWithName.printed_name || printWithName.name;
          card.printed_type_line = card.printed_type_line || printWithType.printed_type_line;
          card.printed_text = card.printed_text || printWithText.printed_text;
          
          // @ts-ignore
          card.printed_flavor_text = card.printed_flavor_text || printWithText.printed_flavor_text || printWithText.flavor_text;
          
          // Handle dual-faced cards
          if (card.card_faces) {
            card.card_faces.forEach((face, i) => {
              const pFaceName = printWithName.card_faces?.[i];
              const pFaceType = printWithType.card_faces?.[i];
              const pFaceText = printWithText.card_faces?.[i];
              
              if (pFaceName) face.printed_name = face.printed_name || pFaceName.printed_name || pFaceName.name;
              if (pFaceType) face.printed_type_line = face.printed_type_line || pFaceType.printed_type_line;
              if (pFaceText) {
                face.printed_text = face.printed_text || pFaceText.printed_text;
                // @ts-ignore
                face.printed_flavor_text = face.printed_flavor_text || pFaceText.printed_flavor_text || pFaceText.flavor_text;
              }
            });
          }
        }
      }
    }
    
    return card;
  } catch (error) {
    console.error("Scryfall fetch error:", error);
    return null;
  }
}

export async function fetchCardByName(name: string, setCode?: string): Promise<ScryfallCard | null> {
  try {
    let url = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}`;
    if (setCode) {
      url += `&set=${setCode.toLowerCase()}`;
    }
    const res = await rateLimitedFetch(url);
    if (!res.ok) {
      if (setCode) return fetchCardByName(name); // fallback without set
      return null;
    }
    return await res.json();
  } catch (error) {
    console.error("Scryfall fetch name error:", error);
    return null;
  }
}

export async function fetchAllPrints(oracleId: string): Promise<ScryfallCard[]> {
  try {
    const res = await rateLimitedFetch(`https://api.scryfall.com/cards/search?order=released&q=oracleid%3A${oracleId}&unique=prints`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || [];
  } catch (error) {
    console.error("Scryfall fetch prints error:", error);
    return [];
  }
}

export async function fetchPrintsInLanguage(oracleId: string, lang: string): Promise<ScryfallCard[]> {
  if (lang === "en") return fetchAllPrints(oracleId);
  try {
    const res = await rateLimitedFetch(`https://api.scryfall.com/cards/search?order=released&q=oracleid%3A${oracleId}+lang%3A${lang}&unique=prints`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || [];
  } catch (error) {
    console.error("Scryfall fetch lang prints error:", error);
    return [];
  }
}
