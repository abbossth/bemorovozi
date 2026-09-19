// "Tizimli muammo": the same problem coming up again and again. Grouping is by the AI's short
// issue tag; a group is systemic once it reaches CLUSTER_MIN_COUNT reports inside the window.

export const CLUSTER_WINDOW_DAYS = 14;
export const CLUSTER_MIN_COUNT = 3;

export type ClusterInput = { id: string; issueTag: string; createdAt: Date | string };

export type Cluster = { key: string; tag: string; count: number; ids: string[] };

export function buildClusters(items: ClusterInput[], now = new Date()) {
  const windowStart = now.getTime() - CLUSTER_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const groups = new Map<string, Cluster>();

  for (const item of items) {
    if (new Date(item.createdAt).getTime() < windowStart) continue;
    const group = groups.get(item.issueTag) ?? { key: item.issueTag, tag: item.issueTag, count: 0, ids: [] };
    group.count++;
    group.ids.push(item.id);
    groups.set(item.issueTag, group);
  }

  const systemic = [...groups.values()].filter((g) => g.count >= CLUSTER_MIN_COUNT).sort((a, b) => b.count - a.count);
  const clusterOf = new Map<string, Cluster>();
  for (const cluster of systemic) for (const id of cluster.ids) clusterOf.set(id, cluster);

  return { systemic, clusterOf };
}
