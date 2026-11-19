// L'ancienne carte des mondes (worlds.html) renvoie vers la sélection des mondes du menu,
// en gardant le monde demandé (?world=snow) et le mode test (?unlock=all).
const p = new URLSearchParams(location.search);
const keep = new URLSearchParams();
for (const k of ['world', 'unlock']) if (p.get(k)) keep.set(k, p.get(k));
const q = keep.toString();
location.replace(`index.html${q ? `?${q}` : ''}#mondes`);
