// "Tizimli muammo": the same problem coming up again and again. The AI gives every report a short
// issue tag ("palata_sovuq"); reports whose tags are the same — or close enough ("xona_juda_sovuq") —
// form one group, and a group is systemic once it reaches CLUSTER_MIN_COUNT reports inside the window.

export const CLUSTER_WINDOW_DAYS = 14;
export const CLUSTER_MIN_COUNT = 3;
/** Two tags count as the same problem when their word sets overlap at least this much (Jaccard). */
export const SIMILARITY_THRESHOLD = 0.6;

/** The tag the app itself assigns when the AI could not analyse a report — it says nothing about the problem. */
const UNANALYSED_TAG = "tahlil_qilinmagan";

const STOPWORDS = new Set(["juda", "va", "bilan", "uchun", "ham", "bir", "ancha", "yana", "bo", "lgan"]);
// A hospital's own wording for the same thing: a ward is a room.
const SYNONYMS: Record<string, string> = { palata: "xona", palatalar: "xona", xonalar: "xona" };
// Longest first, so "larni" wins over "ni".
const SUFFIXES = ["larning", "larni", "lari", "ning", "dan", "lar", "da", "ga", "ni", "si"];

function stem(word: string) {
  for (const suffix of SUFFIXES) {
    if (word.endsWith(suffix) && word.length - suffix.length >= 4) return word.slice(0, -suffix.length);
  }
  return word;
}

/** "xona_juda_sovuq" → {"xona", "sovuq"} */
export function tagWords(tag: string): Set<string> {
  const words = tag
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w))
    .map((w) => SYNONYMS[w] ?? stem(w))
    .map((w) => SYNONYMS[w] ?? w);
  return new Set(words);
}

function similarity(a: Set<string>, b: Set<string>) {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const word of a) if (b.has(word)) shared++;
  return shared / (a.size + b.size - shared);
}

export type ClusterInput = { id: string; issueTag: string; createdAt: Date | string };

export type Cluster = {
  key: string;
  /** the most common tag in the group — used to name it */
  tag: string;
  count: number;
  ids: string[];
  tags: string[];
};

export function buildClusters(items: ClusterInput[], now = new Date()) {
  const windowStart = now.getTime() - CLUSTER_WINDOW_DAYS * 24 * 60 * 60 * 1000;

  // 1. one bucket per exact tag
  const byTag = new Map<string, string[]>();
  for (const item of items) {
    const tag = item.issueTag?.trim();
    if (!tag || tag === UNANALYSED_TAG) continue;
    if (new Date(item.createdAt).getTime() < windowStart) continue;
    byTag.set(tag, [...(byTag.get(tag) ?? []), item.id]);
  }

  // 2. merge buckets whose tags are close (union–find)
  const tags = [...byTag.keys()];
  const words = new Map(tags.map((t) => [t, tagWords(t)]));
  const parent = new Map(tags.map((t) => [t, t]));
  const find = (t: string): string => {
    while (parent.get(t) !== t) {
      parent.set(t, parent.get(parent.get(t)!)!);
      t = parent.get(t)!;
    }
    return t;
  };
  for (let i = 0; i < tags.length; i++) {
    for (let j = i + 1; j < tags.length; j++) {
      if (similarity(words.get(tags[i])!, words.get(tags[j])!) >= SIMILARITY_THRESHOLD) {
        parent.set(find(tags[i]), find(tags[j]));
      }
    }
  }

  // 3. collect groups
  const groups = new Map<string, string[]>();
  for (const tag of tags) groups.set(find(tag), [...(groups.get(find(tag)) ?? []), tag]);

  const clusters: Cluster[] = [...groups.entries()].map(([key, groupTags]) => {
    const ids = groupTags.flatMap((t) => byTag.get(t)!);
    const tag = [...groupTags].sort((a, b) => byTag.get(b)!.length - byTag.get(a)!.length)[0];
    return { key, tag, count: ids.length, ids, tags: groupTags };
  });

  const systemic = clusters.filter((c) => c.count >= CLUSTER_MIN_COUNT).sort((a, b) => b.count - a.count);
  const clusterOf = new Map<string, Cluster>();
  for (const cluster of systemic) for (const id of cluster.ids) clusterOf.set(id, cluster);

  return { systemic, clusterOf };
}
