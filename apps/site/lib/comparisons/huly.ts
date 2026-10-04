import type { Comparison } from "./types";

export const huly: Comparison = {
  slug: "huly",
  competitor: "Huly",
  category: "open-source",
  title: "Huly alternative",
  description:
    "Basin is an MIT-licensed Huly alternative that does project tracking and nothing else, with a much smaller self-hosted footprint.",
  summary: "Project tracking only, in one container, under MIT.",
  heading: "The focused Huly alternative",
  subheading:
    "Huly puts tracking, chat, documents, HR, and CRM in one workspace. Basin does the tracking part, in one container, under the MIT license.",
  verdict:
    "Basin and Huly are both open source and self-hostable, but they differ in ambition. Huly is an all-in-one workspace under EPL-2.0 covering project tracking, chat, documents, HR, and CRM, with a correspondingly large deployment. Basin is MIT licensed and does project tracking only, as a single container plus PostgreSQL.",
  facts: {
    license: "MIT, versus EPL-2.0 for Huly",
    hosting:
      "Both self-host. Basin is one container, Huly is a multi-service platform",
    sso: "Free on every Basin build",
    pricing: "$0 self-hosted, cloud from $4 / month",
  },
  rows: [
    { feature: "License", basin: "MIT", them: "EPL-2.0" },
    { feature: "Self-hostable", basin: true, them: true },
    {
      feature: "Scope",
      basin: "Project tracking",
      them: "All-in-one workspace",
    },
    {
      feature: "Install footprint",
      basin: "One container + Postgres",
      them: "Multi-service",
    },
    { feature: "Chat, docs, HR, CRM", basin: false, them: true },
    { feature: "Time tracking", basin: true, them: true },
    { feature: "Backlog planning", basin: true, them: true },
    {
      feature: "Cloud pricing",
      basin: "From $4/mo",
      them: "Free tier, then per user",
    },
  ],
  reasons: [
    {
      title: "One job, done properly",
      body: "Basin is a tracker. There is no chat to migrate onto, no HR module to keep current, and nothing to disable before your team can start.",
    },
    {
      title: "Realistic to self-host",
      body: "A container and a database, with Docker Compose and a Helm chart. Huly's self-hosted platform has many more services to run and update.",
    },
    {
      title: "MIT licensing",
      body: "Basin is MIT throughout, which keeps forking and commercial use uncomplicated compared with EPL-2.0's file-level copyleft.",
    },
  ],
  honestNote:
    "Huly is ambitious in a way that is genuinely appealing: virtual office, chat, documents, and tracking in one place, and it is free to self-host. If replacing several tools at once is the goal, Basin is not trying to compete with that.",
  faq: [
    {
      question: "Is Huly open source?",
      answer:
        "Yes. The Huly platform is published under EPL-2.0 and can be self-hosted for free, alongside a hosted cloud with a free tier and paid plans.",
    },
    {
      question: "Huly or Basin?",
      answer:
        "Huly if you want one workspace covering chat, documents, HR, and tracking. Basin if you want a small, fast tracker you can run and understand, and you already have tools for the rest.",
    },
    {
      question: "How hard is each to self-host?",
      answer:
        "Basin is one container plus PostgreSQL, with an official Helm chart. Huly's self-hosted deployment runs a considerably larger set of services and expects more operational attention.",
    },
    {
      question: "Does Basin have chat or documents?",
      answer:
        "No. Basin has task comments, notifications, and integrations with Slack, Discord, and Telegram. Documents and chat are deliberately out of scope.",
    },
  ],
  related: ["plane", "linear", "notion", "openproject"],
  verifiedOn: "2026-08-19",
  sources: [
    { label: "Huly pricing", href: "https://huly.io/pricing" },
    { label: "Basin pricing", href: "/pricing" },
  ],
};
