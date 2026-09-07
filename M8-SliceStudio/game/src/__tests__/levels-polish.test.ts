// Slice Studio — S2 level polish tests (TDD-A red-first, card t_9b120a7e).
// 4 cells per specs/2-slice-studio/TEST-CASES.md:
//   S2-T1 validateLevels extended but still strict (flavor: EN, <=48 chars, <=3 words)
//   S2-T2 data integrity: path/shape/core/noGo/thresholds bit-identical to pre-polish snapshot
//   S2-T3 difficulty curve anchors per SPEC §6 (measured from data, python-port formula)
//   S2-T4 clean-skip L10 through the REAL TraceEngine (no mocks)
// The SNAPSHOT literal below was generated from levels.ts @main f1e027d BEFORE any
// polish (esbuild bundle of src/level/levels.ts, hex/float formatting preserved).
import { describe, expect, it } from 'vitest';
import { LEVELS, LEVEL_COUNT, validateLevels } from '../level/levels';
import { resampleUniform, pathLength, type Vec } from '../geom/path';
import { TraceEngine } from '../core/engine';

const hex = (n: number): string => '0x' + n.toString(16).toUpperCase();

// total signed turning angle (rad), clamped per vertex to ±PI (same formula as
// the python port used for SPEC §6 — evidence in thread B1). Measures HOW MUCH
// a path bends; short degenerate segments are skipped.
function totalTurn(pts: readonly Vec[]): number {
  let t = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const a1 = Math.atan2(pts[i].y - pts[i - 1].y, pts[i].x - pts[i - 1].x);
    const a2 = Math.atan2(pts[i + 1].y - pts[i].y, pts[i + 1].x - pts[i].x);
    if (Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y) < 1e-9) continue;
    if (Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y) < 1e-9) continue;
    let d = a2 - a1;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    t += d;
  }
  return Math.abs(t);
}

function pathLen(pts: readonly Vec[]): number {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  return L;
}

const SNAPSHOT: unknown[] = [
  {
    id: 1, name: 'First Slice', milestone: 1,
    path: [
      { x: 140, y: 470 },
      { x: 202.85714285714286, y: 470 },
      { x: 265.7142857142857, y: 470 },
      { x: 328.57142857142856, y: 470 },
      { x: 391.42857142857144, y: 470 },
      { x: 454.2857142857143, y: 470 },
      { x: 517.1428571428571, y: 470 },
      { x: 580, y: 470 }
    ],
    shape: { cx: 360, cy: 470, rx: 250, ry: 150 },
    core: { kind: 'none', color: 0 },
    noGo: null,
    thresholds: [55, 75, 90],
    theme: { bg: 0x0F172A, silhouette: 0x1E3A5F, silhouetteEdge: 0x38BDF8, path: 0x7DD3FC, core: 0x0EA5E9, coreEdge: 0xE0F2FE, noGo: 0xFF2D3D, accent: 0x38BDF8 },
  },
  {
    id: 2, name: 'Diagonal Drop', milestone: 1,
    path: [
      { x: 150, y: 340 },
      { x: 210, y: 380 },
      { x: 270, y: 420 },
      { x: 330, y: 460 },
      { x: 390, y: 500 },
      { x: 450, y: 540 },
      { x: 510, y: 580 },
      { x: 570, y: 620 }
    ],
    shape: { cx: 360, cy: 480, rx: 235, ry: 170 },
    core: { kind: 'none', color: 0 },
    noGo: null,
    thresholds: [55, 75, 90],
    theme: { bg: 0x0F172A, silhouette: 0x1E3A5F, silhouetteEdge: 0x38BDF8, path: 0x7DD3FC, core: 0x0EA5E9, coreEdge: 0xE0F2FE, noGo: 0xFF2D3D, accent: 0x38BDF8 },
  },
  {
    id: 3, name: 'Apple Secret', milestone: 2,
    path: [
      { x: 226.34902137174484, y: 568.0985749609321 },
      { x: 232.8483095872375, y: 579.5766776460101 },
      { x: 240.33083406921435, y: 590.4394312533537 },
      { x: 248.7387340891891, y: 600.602836480508 },
      { x: 258.0069931916371, y: 609.988301933384 },
      { x: 268.06394195205354, y: 618.5232518563536 },
      { x: 278.83181218096865, y: 626.1416873447254 },
      { x: 290.22733828838125, y: 632.7846966998683 },
      { x: 302.16240115839054, y: 638.4009109805172 },
      { x: 314.54470955508395, y: 642.9469012275829 },
      { x: 327.2785137905186, y: 646.3875142908121 },
      { x: 340.26534613615763, y: 648.696144660426 },
      { x: 353.4047822523203, y: 649.8549402017187 },
      { x: 366.5952177476797, y: 649.8549402017187 },
      { x: 379.73465386384237, y: 648.696144660426 },
      { x: 392.7214862094814, y: 646.3875142908121 },
      { x: 405.4552904449161, y: 642.9469012275829 },
      { x: 417.8375988416095, y: 638.4009109805172 },
      { x: 429.77266171161875, y: 632.7846966998683 },
      { x: 441.1681878190314, y: 626.1416873447254 },
      { x: 451.9360580479465, y: 618.5232518563536 },
      { x: 461.99300680836285, y: 609.988301933384 },
      { x: 471.2612659108109, y: 600.602836480508 },
      { x: 479.66916593078565, y: 590.4394312533536 },
      { x: 487.1516904127625, y: 579.5766776460101 },
      { x: 493.6509786282552, y: 568.098574960932 }
    ],
    shape: { cx: 360, cy: 500, rx: 200, ry: 190 },
    core: { kind: 'star', color: 0xF59E0B },
    noGo: null,
    thresholds: [55, 75, 95],
    theme: { bg: 0x1F1033, silhouette: 0x4C1D95, silhouetteEdge: 0xC084FC, path: 0xF0ABFC, core: 0xF59E0B, coreEdge: 0xFEF3C7, noGo: 0xFF2D3D, accent: 0xC084FC },
  },
  {
    id: 4, name: 'Clockwork', milestone: 2,
    path: [
      { x: 253.07921709739583, y: 425.52114003125445 },
      { x: 259.08665012421966, y: 415.0654497447749 },
      { x: 266.1131027308094, y: 405.26546634142653 },
      { x: 274.0876220373802, y: 396.22014972078335 },
      { x: 282.9296816188098, y: 388.02083918287803 },
      { x: 292.54999465774426, y: 380.7503310870526 },
      { x: 302.8514155598473, y: 374.4820427771333 },
      { x: 313.72992092671234, y: 369.2792712155862 },
      { x: 325.0756599806073, y: 365.19455381294034 },
      { x: 336.7740638338967, y: 362.2691379067999 },
      { x: 348.7070024017782, y: 360.5325642476304 },
      { x: 360.753977275867, y: 360.00236869726353 },
      { x: 372.79333851303113, y: 360.6839051523601 },
      { x: 384.7035130523857, y: 362.5702914809433 },
      { x: 396.3642323559329, y: 365.64247901793374 },
      { x: 407.6577468761736, y: 369.86944491792224 },
      { x: 418.4700150870399, y: 375.2085054228096 },
      { x: 428.6918550713509, y: 381.60574688094573 },
      { x: 438.2200470361055, y: 388.9965701653534 },
      { x: 446.9583756224456, y: 397.3063429935182 },
      { x: 454.8186014850828, y: 406.45115356164285 },
      { x: 461.7213523302099, y: 416.33865788319184 },
      { x: 467.5969244142283, y: 426.8690122753318 },
      { x: 472.3859864097831, y: 437.9358815770489 },
      { x: 476.0401785314922, y: 449.42751291799414 },
      { x: 478.5226008714165, y: 461.2278641951723 }
    ],
    shape: { cx: 360, cy: 480, rx: 190, ry: 190 },
    core: { kind: 'circle', color: 0x38BDF8 },
    noGo: null,
    thresholds: [55, 75, 95],
    theme: { bg: 0x1F1033, silhouette: 0x4C1D95, silhouetteEdge: 0xC084FC, path: 0xF0ABFC, core: 0xF59E0B, coreEdge: 0xFEF3C7, noGo: 0xFF2D3D, accent: 0xC084FC },
  },
  {
    id: 5, name: 'Ball Game', milestone: 2,
    path: [
      { x: 160, y: 560 },
      { x: 177.3913043478261, y: 538.3742911153118 },
      { x: 194.7826086956522, y: 518.7145557655955 },
      { x: 212.17391304347825, y: 501.0207939508507 },
      { x: 229.56521739130432, y: 485.2930056710775 },
      { x: 246.95652173913044, y: 471.531190926276 },
      { x: 264.3478260869565, y: 459.7353497164461 },
      { x: 281.7391304347826, y: 449.9054820415879 },
      { x: 299.1304347826087, y: 442.0415879017013 },
      { x: 316.5217391304348, y: 436.1436672967865 },
      { x: 333.9130434782609, y: 432.2117202268431 },
      { x: 351.30434782608694, y: 430.2457466918715 },
      { x: 368.695652173913, y: 430.24574669187143 },
      { x: 386.0869565217391, y: 432.2117202268431 },
      { x: 403.47826086956525, y: 436.1436672967864 },
      { x: 420.8695652173913, y: 442.0415879017013 },
      { x: 438.2608695652174, y: 449.9054820415879 },
      { x: 455.6521739130435, y: 459.73534971644614 },
      { x: 473.0434782608696, y: 471.531190926276 },
      { x: 490.4347826086956, y: 485.2930056710775 },
      { x: 507.82608695652175, y: 501.0207939508507 },
      { x: 525.2173913043478, y: 518.7145557655954 },
      { x: 542.6086956521739, y: 538.3742911153118 },
      { x: 560, y: 560 }
    ],
    shape: { cx: 360, cy: 500, rx: 215, ry: 165 },
    core: { kind: 'heart', color: 0xEF4444 },
    noGo: null,
    thresholds: [55, 75, 95],
    theme: { bg: 0x1F1033, silhouette: 0x4C1D95, silhouetteEdge: 0xC084FC, path: 0xF0ABFC, core: 0xF59E0B, coreEdge: 0xFEF3C7, noGo: 0xFF2D3D, accent: 0xC084FC },
  },
  {
    id: 6, name: 'First Curve', milestone: 3,
    path: [
      { x: 150, y: 420 },
      { x: 168.26086956521738, y: 438.26086956521743 },
      { x: 186.52173913043478, y: 454.7826086956522 },
      { x: 204.78260869565216, y: 469.5652173913043 },
      { x: 223.04347826086956, y: 482.6086956521739 },
      { x: 241.30434782608697, y: 493.913043478261 },
      { x: 259.5652173913043, y: 503.47826086956513 },
      { x: 277.82608695652175, y: 511.30434782608694 },
      { x: 296.0869565217391, y: 517.3913043478261 },
      { x: 314.34782608695656, y: 521.7391304347827 },
      { x: 332.60869565217394, y: 524.3478260869566 },
      { x: 350.8695652173913, y: 525.2173913043479 },
      { x: 369.13043478260863, y: 524.3478260869565 },
      { x: 387.3913043478261, y: 521.7391304347826 },
      { x: 405.6521739130435, y: 517.3913043478261 },
      { x: 423.9130434782609, y: 511.3043478260869 },
      { x: 442.17391304347825, y: 503.4782608695652 },
      { x: 460.4347826086956, y: 493.9130434782609 },
      { x: 478.6956521739131, y: 482.6086956521739 },
      { x: 496.9565217391304, y: 469.5652173913044 },
      { x: 515.2173913043479, y: 454.7826086956522 },
      { x: 533.4782608695651, y: 438.26086956521743 },
      { x: 551.7391304347826, y: 420 },
      { x: 570, y: 400 }
    ],
    shape: { cx: 360, cy: 500, rx: 235, ry: 170 },
    core: { kind: 'none', color: 0 },
    noGo: null,
    thresholds: [55, 75, 90],
    wobbleWeight: 1.5,
    theme: { bg: 0x0D2818, silhouette: 0x14532D, silhouetteEdge: 0x4ADE80, path: 0xBBF7D0, core: 0xFACC15, coreEdge: 0xFEF9C3, noGo: 0xFF2D3D, accent: 0x4ADE80 },
  },
  {
    id: 7, name: 'S-Curve', milestone: 3,
    path: [
      { x: 140, y: 560 },
      { x: 157.61723314535388, y: 533.51928059747 },
      { x: 174.92963471015597, y: 511.6110349032159 },
      { x: 191.96159122085047, y: 493.90946502057614 },
      { x: 208.73748920388152, y: 480.04877305288824 },
      { x: 225.28171518569326, y: 469.66316110349044 },
      { x: 241.6186556927298, y: 462.38683127572017 },
      { x: 257.77269725143526, y: 457.85398567291566 },
      { x: 273.7682263882538, y: 455.6988263984149 },
      { x: 289.6296296296296, y: 455.55555555555566 },
      { x: 305.3812935020068, y: 457.0583752476756 },
      { x: 321.0476045318294, y: 459.84148757811306 },
      { x: 336.65294924554183, y: 463.5390946502057 },
      { x: 352.2217141695879, y: 467.7853985672916 },
      { x: 367.7782858304121, y: 472.2146014327085 },
      { x: 383.34705075445817, y: 476.4609053497942 },
      { x: 398.9523954681705, y: 480.15851242188694 },
      { x: 414.61870649799323, y: 482.94162475232434 },
      { x: 430.3703703703704, y: 484.44444444444446 },
      { x: 446.2317736117462, y: 484.3011736015851 },
      { x: 462.22730274856474, y: 482.1460143270843 },
      { x: 478.38134430727024, y: 477.61316872427983 },
      { x: 494.7182848143068, y: 470.3368388965097 },
      { x: 511.2625107961185, y: 459.95122694711176 },
      { x: 528.0384087791494, y: 446.0905349794239 },
      { x: 545.0703652898441, y: 428.38896509678403 },
      { x: 562.3827668546461, y: 406.48071940253016 },
      { x: 580, y: 380 }
    ],
    shape: { cx: 360, cy: 490, rx: 240, ry: 185 },
    core: { kind: 'none', color: 0 },
    noGo: null,
    thresholds: [55, 75, 90],
    wobbleWeight: 1.75,
    theme: { bg: 0x0D2818, silhouette: 0x14532D, silhouetteEdge: 0x4ADE80, path: 0xBBF7D0, core: 0xFACC15, coreEdge: 0xFEF9C3, noGo: 0xFF2D3D, accent: 0x4ADE80 },
  },
  {
    id: 8, name: 'Half Moon', milestone: 3,
    path: [
      { x: 182.2160986928752, y: 491.8417962927585 },
      { x: 185.8014316125378, y: 474.6694499067278 },
      { x: 191.04135034551288, y: 457.92766552696537 },
      { x: 197.88608470551964, y: 441.7754612164824 },
      { x: 206.27062152699187, y: 426.3662550449752 },
      { x: 216.11532217796824, y: 411.84640788189176 },
      { x: 227.32667898967634, y: 398.35383322072323 },
      { x: 239.7982034180348, y: 386.01668723879135 },
      { x: 253.411437501072, y: 374.9521515347018 },
      { x: 268.03707900516116, y: 365.26532010535897 },
      { x: 283.5362095731236, y: 357.04820113433937 },
      { x: 299.76161420891304, y: 350.37884307291097 },
      { x: 316.55917956605293, y: 345.32059331442196 },
      { x: 333.76935775849915, y: 341.92149650337245 },
      { x: 351.22868179025176, y: 340.2138381941943 },
      { x: 368.7713182097482, y: 340.2138381941943 },
      { x: 386.2306422415008, y: 341.9214965033724 },
      { x: 403.440820433947, y: 345.32059331442196 },
      { x: 420.2383857910869, y: 350.3788430729109 },
      { x: 436.46379042687636, y: 357.0482011343393 },
      { x: 451.9629209948388, y: 365.2653201053589 },
      { x: 466.58856249892796, y: 374.9521515347017 },
      { x: 480.20179658196514, y: 386.0166872387913 },
      { x: 492.67332101032355, y: 398.3538332207232 },
      { x: 503.8846778220318, y: 411.84640788189176 },
      { x: 513.7293784730081, y: 426.3662550449751 },
      { x: 522.1139152944804, y: 441.7754612164824 },
      { x: 528.9586496544871, y: 457.92766552696514 },
      { x: 534.1985683874622, y: 474.66944990672766 },
      { x: 537.7839013071248, y: 491.8417962927584 }
    ],
    shape: { cx: 360, cy: 500, rx: 215, ry: 175 },
    core: { kind: 'none', color: 0 },
    noGo: null,
    thresholds: [55, 75, 90],
    wobbleWeight: 2,
    theme: { bg: 0x0D2818, silhouette: 0x14532D, silhouetteEdge: 0x4ADE80, path: 0xBBF7D0, core: 0xFACC15, coreEdge: 0xFEF9C3, noGo: 0xFF2D3D, accent: 0x4ADE80 },
  },
  {
    id: 9, name: 'Double Bend', milestone: 3,
    path: [
      { x: 150, y: 380 },
      { x: 171.85642432556014, y: 405.2060153431897 },
      { x: 190.9419295839049, y: 427.57404867144237 },
      { x: 207.53086419753086, y: 447.2290809327846 },
      { x: 221.8975765889346, y: 464.29609307524254 },
      { x: 234.31641518061272, y: 478.90006604684254 },
      { x: 245.06172839506172, y: 491.1659807956104 },
      { x: 254.40786465477822, y: 501.21881826957275 },
      { x: 262.6291723822588, y: 509.18355941675566 },
      { x: 270, y: 515.1851851851852 },
      { x: 276.7946959304984, y: 519.3486765228877 },
      { x: 283.2876085962505, y: 521.7990143778894 },
      { x: 289.7530864197531, y: 522.6611796982168 },
      { x: 296.46547782350257, y: 522.0601534318956 },
      { x: 303.6991312299955, y: 520.1209165269522 },
      { x: 311.7283950617284, y: 516.9684499314129 },
      { x: 320.82761774119797, y: 512.7277345933038 },
      { x: 331.27114769090076, y: 507.5237514606514 },
      { x: 343.33333333333337, y: 501.48148148148147 },
      { x: 357.2885230909922, y: 494.7259056038205 },
      { x: 373.411065386374, y: 487.3820047756948 },
      { x: 391.9753086419753, y: 479.5747599451304 },
      { x: 413.25560128029264, y: 471.42915206015346 },
      { x: 437.5262917238226, y: 463.0701620687903 },
      { x: 465.0617283950618, y: 454.6227709190672 },
      { x: 496.13625971650663, y: 446.2119595590103 },
      { x: 531.0242341106539, y: 437.96270893664587 },
      { x: 570, y: 430 }
    ],
    shape: { cx: 360, cy: 490, rx: 240, ry: 180 },
    core: { kind: 'none', color: 0 },
    noGo: null,
    thresholds: [55, 75, 90],
    wobbleWeight: 2,
    theme: { bg: 0x0D2818, silhouette: 0x14532D, silhouetteEdge: 0x4ADE80, path: 0xBBF7D0, core: 0xFACC15, coreEdge: 0xFEF9C3, noGo: 0xFF2D3D, accent: 0x4ADE80 },
  },
  {
    id: 10, name: 'Forbidden Line', milestone: 4,
    path: [
      { x: 130, y: 480 },
      { x: 160.66666666666666, y: 480 },
      { x: 191.33333333333334, y: 480 },
      { x: 222, y: 480 },
      { x: 252.66666666666669, y: 480 },
      { x: 283.3333333333333, y: 480 },
      { x: 314, y: 480 },
      { x: 344.66666666666663, y: 480 },
      { x: 375.33333333333337, y: 480 },
      { x: 406, y: 480 },
      { x: 436.66666666666663, y: 480 },
      { x: 467.3333333333333, y: 480 },
      { x: 498, y: 480 },
      { x: 528.6666666666667, y: 480 },
      { x: 559.3333333333333, y: 480 },
      { x: 590, y: 480 }
    ],
    shape: { cx: 360, cy: 480, rx: 255, ry: 155 },
    core: { kind: 'none', color: 0 },
    noGo: [40, 48],
    thresholds: [55, 75, 90],
    theme: { bg: 0x22090C, silhouette: 0x7F1D1D, silhouetteEdge: 0xFB923C, path: 0xFED7AA, core: 0x38BDF8, coreEdge: 0xE0F2FE, noGo: 0xFF2D3D, accent: 0xFB923C },
  },
  {
    id: 11, name: 'Forbidden Curve', milestone: 4,
    path: [
      { x: 140, y: 520 },
      { x: 155.63582787176756, y: 499.86384189402037 },
      { x: 171.4240715338109, y: 483.6843977036021 },
      { x: 187.35253772290807, y: 471.13854595336073 },
      { x: 203.409033175837, y: 461.90316516791137 },
      { x: 219.58136462937566, y: 455.65513387186917 },
      { x: 235.85733882030178, y: 452.07133058984914 },
      { x: 252.22476248539346, y: 450.82863384646646 },
      { x: 268.67144236142866, y: 451.6039221663365 },
      { x: 285.18518518518516, y: 454.07407407407413 },
      { x: 301.7537976934411, y: 457.91596809429456 },
      { x: 318.3650866229741, y: 462.80648275161303 },
      { x: 335.00685871056237, y: 468.4224965706446 },
      { x: 351.6669206929838, y: 474.44088807600474 },
      { x: 368.3330793070162, y: 480.5385357923081 },
      { x: 384.99314128943763, y: 486.3923182441701 },
      { x: 401.6349133770259, y: 491.6791139562058 },
      { x: 418.246202306559, y: 496.0758014530305 },
      { x: 434.8148148148148, y: 499.2592592592593 },
      { x: 451.32855763857134, y: 500.90636589950714 },
      { x: 467.7752375146065, y: 500.6939998983894 },
      { x: 484.1426611796982, y: 498.2990397805213 },
      { x: 500.41863537062443, y: 493.39836407051774 },
      { x: 516.5909668241629, y: 485.66885129299396 },
      { x: 532.6474622770919, y: 474.7873799725652 },
      { x: 548.5759284661891, y: 460.43082863384643 },
      { x: 564.3641721282324, y: 442.27607580145303 },
      { x: 580, y: 420 }
    ],
    shape: { cx: 360, cy: 490, rx: 240, ry: 185 },
    core: { kind: 'none', color: 0 },
    noGo: [44, 54],
    thresholds: [55, 75, 90],
    theme: { bg: 0x22090C, silhouette: 0x7F1D1D, silhouetteEdge: 0xFB923C, path: 0xFED7AA, core: 0x38BDF8, coreEdge: 0xE0F2FE, noGo: 0xFF2D3D, accent: 0xFB923C },
  },
  {
    id: 12, name: 'Grand Finale', milestone: 4,
    path: [
      { x: 140, y: 460 },
      { x: 157.69648935629735, y: 477.9139358837577 },
      { x: 175.2344662907077, y: 491.87115785195346 },
      { x: 192.62002743484223, y: 502.1947873799725 },
      { x: 209.85926942031193, y: 509.20794594319966 },
      { x: 226.95828887872787, y: 513.2337550170199 },
      { x: 243.923182441701, y: 514.5953360768176 },
      { x: 260.7600467408423, y: 513.615810597978 },
      { x: 277.47497840776305, y: 510.6183000558858 },
      { x: 294.0740740740741, y: 505.9259259259259 },
      { x: 310.56343037138646, y: 499.8618096834832 },
      { x: 326.94914393131126, y: 492.74907280394245 },
      { x: 343.2373113854595, y: 484.9108367626886 },
      { x: 359.43402936544226, y: 476.67022303510646 },
      { x: 375.5453945028705, y: 468.3503530965809 },
      { x: 391.5775034293553, y: 460.2743484224966 },
      { x: 407.53645277650764, y: 452.7653304882386 },
      { x: 423.4283391759386, y: 446.14642076919176 },
      { x: 439.25925925925924, y: 440.74074074074076 },
      { x: 455.03530965808056, y: 436.8714118782706 },
      { x: 470.7625870040136, y: 434.86155565716604 },
      { x: 486.44718792866945, y: 435.0342935528121 },
      { x: 502.095209063659, y: 437.7127470405934 },
      { x: 517.7127470405934, y: 443.22003759589495 },
      { x: 533.3058984910837, y: 451.8792866941015 },
      { x: 548.8807600467409, y: 464.01361581059797 },
      { x: 564.4434283391759, y: 479.9461464207692 },
      { x: 580, y: 500 }
    ],
    shape: { cx: 360, cy: 490, rx: 240, ry: 190 },
    core: { kind: 'star', color: 0xFACC15 },
    noGo: [46, 56],
    thresholds: [55, 75, 90],
    theme: { bg: 0x22090C, silhouette: 0x7F1D1D, silhouetteEdge: 0xFB923C, path: 0xFED7AA, core: 0x38BDF8, coreEdge: 0xE0F2FE, noGo: 0xFF2D3D, accent: 0xFB923C },
  },
];

describe('S2-T1 validateLevels extended but still strict', () => {
  it('every level carries a display flavor: EN, <=48 chars, <=3 words per segment', () => {
    expect(LEVEL_COUNT).toBe(12);
    for (const l of LEVELS) {
      expect(typeof l.flavor).toBe('string');
      const f = l.flavor as string;
      expect(f.length).toBeGreaterThan(0);
      expect(f.length).toBeLessThanOrEqual(48);
      // EN display text: letters/digits/apostrophes/hyphens, single spaces,
      // at most one em-dash hook separator ("X — Y", SPEC §7 example format).
      expect(f).toMatch(/^[A-Za-z0-9'\-— ]+$/);
      expect(f).not.toMatch(/ {2}/);
      expect(f.split(' — ').length - 1).toBeLessThanOrEqual(1);
      // <=3 words PER segment (name part and hook part separately) — keeps the
      // SPEC §7 example 'Apple Secret — Hidden Star' legal (2 + 2 words).
      for (const seg of f.split(' — ')) {
        const words = seg.split(' ').filter((w) => /[A-Za-z0-9]/.test(w));
        expect(words.length).toBeLessThanOrEqual(3);
      }
    }
  });
  it('old asserts unchanged: 12 valid levels, ids in sequence, valid shapes', () => {
    expect(validateLevels()).toEqual([]);
    expect(LEVELS.map((l) => l.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });
  it('extended validation still blocks bad flavor (>=49 chars / non-EN / >3 words)', () => {
    const tooLong = LEVELS.map((l) => ({ ...l, flavor: 'x'.repeat(49) }));
    expect(validateLevels(tooLong).some((e) => e.includes('flavor'))).toBe(true);
    const nonEn = LEVELS.map((l) => ({ ...l, flavor: 'Đường cắt số 1' }));
    expect(validateLevels(nonEn).some((e) => e.includes('flavor'))).toBe(true);
    const tooManyWords = LEVELS.map((l) => ({ ...l, flavor: 'one two three four' }));
    expect(validateLevels(tooManyWords).some((e) => e.includes('flavor'))).toBe(true);
    const empty = LEVELS.map((l) => ({ ...l, flavor: '' }));
    expect(validateLevels(empty).some((e) => e.includes('flavor'))).toBe(true);
  });
});

describe('S2-T2 data integrity after polish (bit-identical)', () => {
  // Strip the NEW display field: the contract is that polish must not change
  // path/shape/core/noGo/thresholds/wobbleWeight/theme — those must serialize
  // bit-identically (same key order, same float repr) to the pre-polish dump.
  const stripFlavor = (ls: readonly unknown[]): unknown[] =>
    (ls as { flavor: string }[]).map(({ flavor: _f, ...rest }) => rest);
  it('path/shape/core/noGo/thresholds/wobbleWeight/theme unchanged vs pre-polish snapshot', () => {
    expect(LEVELS.length).toBe(SNAPSHOT.length);
    expect(JSON.stringify(stripFlavor(LEVELS))).toBe(JSON.stringify(SNAPSHOT));
  });
});

describe('S2-T3 difficulty curve anchors (SPEC §6)', () => {
  it('pathLen L1 = 440 ±1 px', () => {
    expect(Math.abs(pathLen(LEVELS[0].path) - 440)).toBeLessThanOrEqual(1);
  });
  it('total turning angle L8 = 2.73 ±0.05 rad', () => {
    expect(Math.abs(totalTurn(LEVELS[7].path) - 2.73)).toBeLessThanOrEqual(0.05);
  });
  it('wobbleWeight L9 = 2', () => {
    expect(LEVELS[8].wobbleWeight).toBe(2);
  });
  it('noGo L11 = [44, 54]; thresholds M2 = [55, 75, 95]', () => {
    expect(LEVELS[10].noGo).toEqual([44, 54]);
    expect(LEVELS[2].thresholds).toEqual([55, 75, 95]);
    expect(LEVELS[4].thresholds).toEqual([55, 75, 95]);
  });
});

describe('S2-T4 clean-skip L10 through the real TraceEngine', () => {
  it('release before red + resume after: no no-go hit, pct not dragged down by the red zone', () => {
    const l10 = LEVELS[9];
    const ref = resampleUniform(l10.path, 96);
    const stopPt = ref[l10.noGo![0]];
    const resumePt = ref[l10.noGo![1] + 2];
    const e = new TraceEngine();
    expect(e.begin(l10.path[0], l10.path)).toBe(true);
    for (const p of resampleUniform([l10.path[0], stopPt], 24)) e.move(p);
    expect(e.release(l10)).toBeNull();
    expect(e.currentPhase).toBe('mid');
    expect(e.begin(resumePt, l10.path)).toBe(true);
    for (const p of resampleUniform([resumePt, l10.path[l10.path.length - 1]], 24)) e.move(p);
    const r = e.release(l10)!;
    expect(r.score.noGoHitAt).toBeNull();
    expect(r.score.releasedEarly).toBe(false);
    expect(r.award.stars).toBeGreaterThanOrEqual(2);
    expect(r.score.pct).toBeGreaterThanOrEqual(93);
    expect(r.award.label).not.toBe('chunk-lost');
  });
});
