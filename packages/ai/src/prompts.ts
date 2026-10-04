import type { AiCitation } from "./types";

export type RagSource = AiCitation & {
  content: string;
};

export function buildRagContextBlock(sources: RagSource[]): string {
  if (sources.length === 0) {
    return "";
  }

  const blocks = sources.map((source, index) => {
    const label = `[${index + 1}] ${source.title} (${source.sourceType}:${source.sourceId})`;
    return `${label}\n${source.content}`;
  });

  return `<workspace_context>\n${blocks.join("\n\n---\n\n")}\n</workspace_context>`;
}

export function buildAssistantSystemPrompt(options: {
  locale: string;
  workspaceName: string;
  hasContext: boolean;
}): string {
  const isChinese = options.locale.startsWith("zh");

  const intro = isChinese
    ? `你是 ${options.workspaceName} 工作区的 AI 助理，帮助成员回答与项目、任务、需求相关的问题。`
    : `You are the AI assistant for the ${options.workspaceName} workspace, helping members answer questions about projects, tasks, and requirements.`;

  const grounding = options.hasContext
    ? isChinese
      ? "下方 <workspace_context> 中提供了与问题相关的工作区内容片段。回答必须以这些内容为依据；引用时在句末标注编号（如 [1]）。如果上下文不足以回答，明确说明找不到相关信息，不要编造。"
      : "Relevant workspace content is provided in <workspace_context> below. Ground every claim in that content and cite sources inline with their bracketed number (e.g. [1]). If the context is insufficient, say so plainly instead of inventing details."
    : isChinese
      ? "当前没有检索到相关工作区内容。基于问题本身给出一般性建议，并提示用户可以补充更多上下文。"
      : "No workspace content was retrieved for this question. Answer from general knowledge and note that more context may help.";

  const style = isChinese
    ? "回答使用与用户相同的语言，简洁、直接、面向行动。"
    : "Answer in the user's language. Be concise, direct, and action-oriented.";

  return [intro, grounding, style].join("\n\n");
}
