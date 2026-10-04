import type { Comparison } from "./types";

export const azureDevops: Comparison = {
  slug: "azure-devops",
  competitor: "Azure DevOps Boards",
  category: "saas",
  title: "Open-source Azure DevOps Boards alternative",
  description:
    "Basin is an open-source, self-hostable alternative to Azure DevOps Boards. Free under the MIT license, with no Microsoft account or Azure tenant required.",
  summary: "Work tracking without a Microsoft tenant or an Azure DevOps org.",
  heading: "The open-source alternative to Azure DevOps Boards",
  subheading:
    "Azure Boards is free for five people and then priced per user, and it only makes sense if the rest of your stack is Microsoft. Basin is a standalone tracker you can host anywhere.",
  verdict:
    "Basin is an open-source, MIT-licensed alternative to Azure DevOps Boards. Azure DevOps is free for the first 5 users and then $6 per user a month, tied to a Microsoft Entra tenant and the wider Azure DevOps suite. Basin is a standalone tracker with no tenant requirement, free to self-host for any number of people.",
  facts: {
    license: "MIT, versus a proprietary Microsoft licence",
    hosting: "Self-host anywhere, or EU-hosted cloud",
    sso: "Any OIDC provider, free on every Basin build",
    pricing: "$0 self-hosted, cloud from $4 / month",
  },
  rows: [
    { feature: "Open source (MIT)", basin: true, them: false },
    { feature: "Self-hostable", basin: "Free", them: "Server, paid licence" },
    { feature: "Own your data", basin: true, them: "In your Azure tenant" },
    {
      feature: "Free tier",
      basin: "Unlimited, self-hosted",
      them: "First 5 users",
    },
    {
      feature: "Identity requirement",
      basin: "Any OIDC provider",
      them: "Microsoft account",
    },
    { feature: "CI/CD pipelines", basin: false, them: true },
    { feature: "Setup", basin: "Minutes", them: "Org and project setup" },
    {
      feature: "Cloud pricing",
      basin: "From $4/mo",
      them: "$6/user/mo after 5",
    },
  ],
  reasons: [
    {
      title: "No tenant, no org sprawl",
      body: "Basin needs a server and a database. There is no organisation, no project collection, and no directory to reconcile before someone can be assigned a task.",
    },
    {
      title: "Understandable in a morning",
      body: "Azure Boards inherits work-item types, area paths, and iteration paths from TFS. Basin has projects, workflow columns, labels, and priorities.",
    },
    {
      title: "Portable by default",
      body: "MIT licence, public API, JSON export per project. Nothing about Basin assumes you will stay on one cloud provider.",
    },
  ],
  honestNote:
    "If your organisation is already on Microsoft Entra, and you use Azure Repos, Pipelines, and Test Plans, keeping work items in the same place is the sensible choice. Basin has no CI, no repos, and no test management, and it will not pretend otherwise.",
  faq: [
    {
      question: "What does Azure DevOps cost?",
      answer:
        "The first 5 users are free on the Basic plan, which includes Boards, Repos, Pipelines, and Artifacts. Additional users are $6 a month each, and Basic plus Test Plans is considerably more.",
    },
    {
      question: "Can Azure Boards be self-hosted?",
      answer:
        "Only through Azure DevOps Server, the on-premise edition, which is licensed separately and is a substantial install. Basin self-hosts with Docker and PostgreSQL under the MIT license at no cost.",
    },
    {
      question: "Is there an open-source alternative to Azure Boards?",
      answer:
        "Basin, Redmine, OpenProject, and Plane all cover work tracking without a Microsoft tenant. Basin is the lightest to run and includes SSO through any OIDC provider, including Entra ID.",
    },
    {
      question: "Can Basin connect to my Git repositories?",
      answer:
        "Basin integrates with GitHub and Gitea, and has outgoing webhooks and a documented public API for anything else, including Azure Repos.",
    },
  ],
  related: ["jira", "github-projects", "redmine", "openproject"],
  verifiedOn: "2026-08-19",
  sources: [
    {
      label: "Azure DevOps pricing",
      href: "https://azure.microsoft.com/en-us/pricing/details/devops/azure-devops-services/",
    },
    { label: "Basin pricing", href: "/pricing" },
  ],
};
