// Danh sach asset keys = 37 file cua manifest (DESIGN-SPEC §3). BootScene load tung file.
export const ASSET_KEYS: readonly string[] = [
  'bg_street', 'tray_bg', 'hero_sandwich', 'stall_closed',
  'cust_1', 'cust_2', 'cust_3', 'cust_4', 'cust_5', 'cust_6', 'cust_7', 'cust_8',
  'icon_pate', 'icon_mayo', 'icon_chili', 'icon_pork', 'icon_chicken', 'icon_ham',
  'icon_cuke', 'icon_pickle', 'icon_herb', 'icon_chilif',
  'layer_pate', 'layer_mayo', 'layer_chili', 'layer_pork', 'layer_chicken', 'layer_ham',
  'layer_cuke', 'layer_pickle', 'layer_herb', 'layer_chilif',
  'bread_bottom', 'bread_top',
  'fx_coin', 'fx_star', 'fx_angry'
] as const

/** ingredient id -> asset key (icon khay / layer stack) */
const SUFFIX: Record<string, string> = {
  'ing-pate': 'pate', 'ing-mayo': 'mayo', 'ing-chili': 'chili', 'ing-pork': 'pork',
  'ing-chicken': 'chicken', 'ing-ham': 'ham', 'ing-cuke': 'cuke', 'ing-pickle': 'pickle',
  'ing-herb': 'herb', 'ing-chili-f': 'chilif'
}
export const iconKey = (ingId: string): string => `icon_${SUFFIX[ingId] ?? 'pate'}`
export const layerKey = (ingId: string): string => `layer_${SUFFIX[ingId] ?? 'pate'}`
