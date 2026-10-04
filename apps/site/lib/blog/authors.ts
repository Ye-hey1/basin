import type { BlogAuthor } from "./types";

const all: BlogAuthor[] = [
  {
    id: "andrej",
    name: "Andrej Acevski",
    role: "Founder, Basin",
    url: "https://github.com/andrejsshell",
  },
  {
    id: "basin-team",
    name: "The Basin team",
    role: "Basin",
    url: "https://github.com/usebasin/basin",
  },
];

export const authorList = all;

export const authors: Record<string, BlogAuthor> = Object.fromEntries(
  all.map((author) => [author.id, author]),
);
