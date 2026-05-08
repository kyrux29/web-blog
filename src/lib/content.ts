/**
 * Centralized content-fetching layer for Astro Content Collections.
 * All pages should use these helpers instead of scattered getCollection() calls.
 */

import { getCollection, type CollectionEntry } from "astro:content";

type BlogEntry = CollectionEntry<"blog">;
type CtfEntry = CollectionEntry<"ctf">;

/** Return non-draft blog posts, sorted newest first. */
export async function getPublishedBlogPosts(): Promise<BlogEntry[]> {
  return (
    await getCollection("blog", ({ data }) => !data.draft)
  ).sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

/** Return non-draft CTF write-ups, sorted newest first. */
export async function getPublishedCtfPosts(): Promise<CtfEntry[]> {
  return (
    await getCollection("ctf", ({ data }) => !data.draft)
  ).sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

/** Return all non-draft posts from both collections, sorted newest first. */
export async function getAllPublishedPosts(): Promise<
  (BlogEntry | CtfEntry)[]
> {
  const blogs = await getPublishedBlogPosts();
  const ctfs = await getPublishedCtfPosts();
  return [...blogs, ...ctfs].sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf()
  );
}

/** Build a flat list of unique tags with their occurrence counts. */
export async function getTagCounts(): Promise<{ tag: string; count: number }[]> {
  const blogs = await getPublishedBlogPosts();
  const ctfs = await getPublishedCtfPosts();

  const counts = new Map<string, number>();
  for (const entry of [...blogs, ...ctfs]) {
    for (const tag of entry.data.tags ?? []) {
      const key = String(tag).trim();
      if (!key) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([tag, count]) => ({ tag, count }));
}

/** Return posts filtered by a specific tag. */
export async function getPostsByTag(tag: string): Promise<{
  blog: BlogEntry[];
  ctf: CtfEntry[];
}> {
  const blogs = (await getPublishedBlogPosts()).filter((e) =>
    (e.data.tags ?? []).includes(tag)
  );
  const ctfs = (await getPublishedCtfPosts()).filter((e) =>
    (e.data.tags ?? []).includes(tag)
  );
  return { blog: blogs, ctf: ctfs };
}
