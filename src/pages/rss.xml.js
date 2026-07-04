import rss from "@astrojs/rss";
import { getCollection } from "astro:content";

export async function GET(context) {
  const site = context.site ?? new URL("https://kyrux.xyz");

  const ctfEntries = (await getCollection("ctf", ({ data }) => !data.draft)).sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf()
  );
  const blogEntries = (await getCollection("blog", ({ data }) => !data.draft)).sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf()
  );

  const items = [
    ...ctfEntries.map((e) => ({
      title: `[CTF] ${e.data.title}`,
      pubDate: e.data.date,
      description: `${e.data.platform}${e.data.vulnerability_type ? ` | ${e.data.vulnerability_type}` : ""}`,
      link: `/ctf/${e.id}/`
    })),
    ...blogEntries.map((e) => ({
      title: e.data.title,
      pubDate: e.data.date,
      description: e.data.description,
      link: `/blog/${e.id}/`
    }))
  ].sort((a, b) => b.pubDate.valueOf() - a.pubDate.valueOf());

  return rss({
    title: "Kyrux Labs",
    description: "Cybersecurity research notes and CTF write-ups by Kyrux",
    site,
    items
  });
}
