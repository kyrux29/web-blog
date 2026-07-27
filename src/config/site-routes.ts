export type SiteRoute = {
  path: string;
  label: string;
};

export const siteRoutes: SiteRoute[] = [
  { path: "/", label: "Home" },
  { path: "/ctf/", label: "CTF" },
  { path: "/blog/", label: "Blog" },
  { path: "/tags/", label: "Tags" },
  { path: "/about/", label: "About" },
];
