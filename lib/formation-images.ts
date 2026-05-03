// Pool d'images Pexels par catégorie. Chaque catégorie a 5+ URLs distinctes
// pour qu'on n'affiche jamais deux fois la même image dans le catalogue.
// pickImageForFormation(titre, categorie) hash le titre pour rotater
// déterministiquement dans le pool : même formation → toujours même image.

const px = (id: number | string) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=800`;

// Catégories normalisées (lowercase, accent-stripped) -> pool d'URLs
const POOLS: Record<string, string[]> = {
  secourisme: [
    px(11655091), // CPR training mannequin
    px(34104785), // first aid practice
    px(28271058), // CPR hands-on
    px(33862096), // first aid kit close-up
    px(33029223), // CPR demonstration
    px(36346117), // first aid scenario
    px(4226119),  // first aid kit (existant)
    px(6520207),  // premiers secours (existant)
  ],
  "securite incendie": [
    px(3013676),  // firefighter in action
    px(15481474), // firefighter training
    px(16931606), // firefighter team
    px(20659632), // firefighter rescue
    px(29103459), // firefighter equipment
    px(4212623),  // firefighter close-up
    px(8215956),  // firefighter outdoor
    px(280076),   // pompier (existant)
    px(9002745),  // recyclage (existant)
    px(8985641),  // chef équipe (existant)
  ],
  "exercice incendie": [
    px(19107333), // fire extinguisher
    px(4805958),  // extincteur close-up
    px(12939477), // fire extinguisher use
    px(18329661), // fire safety equipment
    px(12072478), // emergency drill
    px(14824431), // fire extinguisher training
    px(2293046),  // évacuation (existant)
    px(1108101),  // guide-file (existant)
  ],
  "prevention securite": [
    px(18313627), // security guard
    px(17649450), // security guard uniform
    px(8285775),  // security guard outdoor
    px(31594272), // security checkpoint
    px(33797919), // security guard team
    px(27299956), // security agent
    px(2099691),  // APS (existant)
  ],
  videoprotection: [
    px(16746378), // CCTV camera
    px(18969784), // CCTV monitoring screens
    px(4620972),  // surveillance camera
    px(27696596), // CCTV control room
    px(14845202), // surveillance monitor
    px(17527826), // CCTV outdoor
    px(95425),    // videoprotection (existant)
  ],
  "habilitation electrique": [
    px(27928762), // electrician at work
    px(9679179),  // electrical wiring
    px(34054464), // electrician with tools
    px(21812143), // electrical panel work
    px(33531830), // electrician close-up
    px(7937305),  // electrical equipment
    px(5767595),  // electrical panel
    px(19316514), // electrical panel detail
    px(7541342),  // electrical maintenance
    px(3964340),  // electricien (existant)
  ],
};

// Fallback pool quand on n'a aucune correspondance de catégorie
const FALLBACK_POOL: string[] = [
  px(3760067),  // formation générique
  px(7148384),  // training session
  px(8867482),  // workshop
  px(3184291),  // class room
  px(8761529),  // professional training
];

// Hash simple et déterministe d'une chaîne (djb2-like) pour stable picking.
function hashString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// Normalise une catégorie pour matching : lowercase, retire accents.
function normalizeCategory(c: string | null | undefined): string {
  return (c || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

/**
 * Retourne une URL d'image Pexels pour une formation.
 * Déterministe : la même paire (titre, catégorie) retourne toujours la même URL.
 * Distincte : deux formations d'une même catégorie auront (sauf collision de hash très rare)
 * deux images différentes du pool.
 */
export function pickImageForFormation(
  titre: string,
  categorie: string | null | undefined
): string {
  const cat = normalizeCategory(categorie);
  const pool = POOLS[cat] || FALLBACK_POOL;
  const idx = hashString(titre) % pool.length;
  return pool[idx];
}

/**
 * Variante qui prend un index explicite (utile pour le seed quand on veut forcer
 * que les 23 formations seedées tapent toutes dans des index distincts du pool).
 */
export function pickImageByIndex(
  categorie: string | null | undefined,
  index: number
): string {
  const cat = normalizeCategory(categorie);
  const pool = POOLS[cat] || FALLBACK_POOL;
  return pool[index % pool.length];
}

export { POOLS as FORMATION_IMAGE_POOLS };
