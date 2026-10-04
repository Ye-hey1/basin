import type { Comparison } from "./types";

export const taiga: Comparison = {
  slug: "taiga",
  competitor: "Taiga",
  category: "open-source",
  title: "Taiga alternative",
  description:
    "Basin is an MIT-licensed Taiga alternative with a smaller install, single sign-on included, and no Scrum ceremony required.",
  summary: "A board and backlog without adopting Scrum first.",
  heading: "The simpler Taiga alternative",
  subheading:
    "Taiga is built around Scrum and Kanban done properly, sprints, story points, and all. Basin is for teams who want to plan and ship without adopting a methodology first.",
  verdict:
    "Basin is a simpler, MIT-licensed alternative to Taiga. Both are open source and self-hostable. Taiga is MPL-2.0 and organised around agile ceremonies, with sprints, story points, and burndown charts. Basin keeps a board, a backlog, workflow columns, and time tracking, and leaves the methodology to you.",
  facts: {
    license: "MIT, versus MPL-2.0 for Taiga",
    hosting: "Both self-host. Basin is a single container plus PostgreSQL",
    sso: "Free on every Basin build",
    pricing: "$0 self-hosted for both, Basin Cloud from $4 / month",
  },
  rows: [
    { feature: "License", basin: "MIT", them: "MPL-2.0" },
    { feature: "Self-hostable", basin: true, them: true },
    { feature: "Free to self-host", basin: true, them: true },
    { feature: "Sprints & story points", basin: false, them: true },
    { feature: "Backlog planning", basin: true, them: true },
    { feature: "Time tracking", basin: true, them: false },
    {
      feature: "Install footprint",
      basin: "One container + Postgres",
      them: "Multi-service",
    },
    {
      feature: "Learning curve",
      basin: "Minutes",
      them: "Agile concepts first",
    },
  ],
  reasons: [
    {
      title: "No methodology tax",
      body: "Basin does not ask you to size stories or open a sprint before work can move. Columns, priorities, and a backlog are enough for most teams.",
    },
    {
      title: "Smaller to run",
      body: "Taiga's self-hosted stack is several services. Basin is one container plus PostgreSQL, with a Helm chart for Kubernetes.",
    },
    {
      title: "Time tracking included",
      body: "Log time against tasks in the free build. Taiga leaves time tracking to plugins and external tools.",
    },
  ],
  honestNote:
    "Taiga is a well-established agile tool with proper sprint management, story points, burndown charts, and an epics model, and it is free to self-host under MPL-2.0. If your team genuinely runs Scrum, Taiga supports that far better than Basin does.",
  faq: [
    {
      question: "Is Taiga free and open source?",
      answer:
        "Yes. Taiga is open source under MPL-2.0 and free to self-host with no user limits. Taiga also offers a cloud with a free tier and paid support options.",
    },
    {
      question: "Taiga or Basin?",
      answer:
        "Taiga if you run Scrum with sprints, story points, and burndowns. Basin if you want a board and backlog without ceremony, plus time tracking and single sign-on in a smaller install.",
    },
    {
      question: "Does Basin support sprints?",
      answer:
        "Not as a first-class concept. Basin has backlog planning and workflow columns, which many teams use to run iterations informally, but there are no sprint objects, story points, or burndown charts.",
    },
    {
      question: "Which is easier to self-host?",
      answer:
        "Basin. It is a single container plus PostgreSQL, deployable with Docker Compose or the official Helm chart. Taiga's standard deployment runs several coordinated services.",
    },
  ],
  related: ["openproject", "jira", "redmine", "plane"],
  verifiedOn: "2026-08-19",
  sources: [
    { label: "Taiga", href: "https://taiga.io/" },
    { label: "Basin pricing", href: "/pricing" },
  ],
};
