import type { Comparison } from "./types";

export const openproject: Comparison = {
  slug: "openproject",
  competitor: "OpenProject",
  category: "open-source",
  title: "Lightweight OpenProject alternative",
  description:
    "Basin is a lighter, MIT-licensed OpenProject alternative: one container, SSO included in the free build, and no 25-user minimum for a supported plan.",
  summary:
    "One container instead of a platform, with nothing held back for Enterprise.",
  heading: "The lightweight OpenProject alternative",
  subheading:
    "OpenProject is a serious, mature platform, and it asks for a serious install. Basin is one container and a database, MIT licensed, with single sign-on in the free build.",
  verdict:
    "Basin is a lighter alternative to OpenProject. Both are open source and self-hostable, but OpenProject's Community edition is GPL and keeps single sign-on, custom branding, and several other features for its Enterprise add-on, whose cloud plans start at a 25-user minimum. Basin is MIT licensed with no paid edition and no feature gates.",
  facts: {
    license: "MIT, versus GPLv3 for the OpenProject Community edition",
    hosting: "Both self-host. Basin is a single container plus PostgreSQL",
    sso: "Free on every Basin build, Enterprise add-on for OpenProject",
    pricing: "$0 self-hosted, cloud from $4 / month with no seat minimum",
  },
  rows: [
    { feature: "License", basin: "MIT", them: "GPLv3 (Community)" },
    { feature: "Self-hostable", basin: true, them: true },
    { feature: "SSO / OIDC in free build", basin: true, them: false },
    { feature: "Paid edition gates features", basin: false, them: true },
    { feature: "Gantt charts", basin: false, them: true },
    { feature: "Time & cost reporting", basin: "Time tracking", them: true },
    { feature: "Setup", basin: "Minutes", them: "Involved" },
    { feature: "Cloud minimum users", basin: "1", them: "25" },
  ],
  reasons: [
    {
      title: "Nothing is held back for Enterprise",
      body: "OpenProject reserves single sign-on, custom themes, and other capabilities for its Enterprise add-on. Basin has one edition, and single sign-on is part of it.",
    },
    {
      title: "Small enough to run yourself",
      body: "Basin is one container plus PostgreSQL, deployable with Docker Compose or Helm. OpenProject is a substantially larger Rails application with more moving parts to keep healthy.",
    },
    {
      title: "MIT, not copyleft",
      body: "If you plan to fork Basin or build something on top of it commercially, MIT keeps that simple. GPLv3 imposes conditions that some companies would rather avoid.",
    },
  ],
  honestNote:
    "OpenProject is the more complete product for classical project management: Gantt charts, baselines, budgets, cost reporting, work-package hierarchies, and BIM support, backed by a company with a long track record and a real support offering. If you need any of that, choose OpenProject.",
  faq: [
    {
      question: "Is OpenProject completely free?",
      answer:
        "The Community edition is free and open source under GPLv3, but single sign-on, custom themes, and several other features belong to the Enterprise add-on. Enterprise cloud plans start at 25 users.",
    },
    {
      question: "What is a simpler alternative to OpenProject?",
      answer:
        "Basin, Vikunja, and Taiga are all lighter to run. Basin is MIT licensed, includes SSO for free, and is a single container plus a PostgreSQL database.",
    },
    {
      question: "Does Basin have Gantt charts?",
      answer:
        "No. Basin has boards, a backlog, due dates, priorities, and task relations, but no Gantt or baseline view. If scheduling with dependencies is central to your work, OpenProject is the better tool.",
    },
    {
      question: "Can I migrate from OpenProject to Basin?",
      answer:
        "There is no dedicated importer yet. OpenProject has a full REST API and Basin has a documented public API and per-project JSON import, so a scripted migration is realistic. Open an issue on GitHub if you want a supported path.",
    },
  ],
  related: ["redmine", "jira", "taiga", "plane"],
  verifiedOn: "2026-08-19",
  sources: [
    {
      label: "OpenProject pricing",
      href: "https://www.openproject.org/pricing/",
    },
    { label: "Basin pricing", href: "/pricing" },
  ],
};
