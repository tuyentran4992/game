// M1 Rescue Dodge — Skins Catalog
// Definition and prices for cat skins.

import type { CatSkin } from '../logic/types';

export const CAT_SKINS: CatSkin[] = [
  { id: 'ginger', name: 'Ginger Tabby', price: 0, textureKey: 'cat_idle', desc: 'Playful and agile, reflexes like lightning!' },
  { id: 'tuxedo', name: 'Tuxedo Gentleman', price: 450, textureKey: 'cat_tuxedo', desc: 'Dapper black suit with a stylish red bowtie!' },
  { id: 'royal', name: 'Royal King Cat 👑', price: 1100, textureKey: 'cat_royal', desc: 'Golden crown and majestic royal velvet cape!' },
  { id: 'astro', name: 'Astro Space Cat 🚀', price: 1800, textureKey: 'cat_astro', desc: 'Futuristic spacesuit with high-tech glowing visor!' },
];
