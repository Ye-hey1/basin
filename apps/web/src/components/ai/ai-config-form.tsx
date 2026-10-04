import { Loader2, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import useSaveAiConfig from "@/hooks/mutations/ai/use-save-ai-config";
import useGetAiConfig from "@/hooks/queries/ai/use-get-ai-config";
import { toast } from "@/lib/toast";

const PROVIDERS = [
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "openai-compatible", label: "OpenAI-compatible" },
  { value: "ollama", label: "Ollama" },
] as const;

type Provider = (typeof PROVIDERS)[number]["value"];

export function AiConfigForm() {
  const { t } = useTranslation();
  const { data: config, isLoading } = useGetAiConfig();
  const saveConfig = useSaveAiConfig();

  const [provider, setProvider] = useState<Provider>("openai");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [clearKey, setClearKey] = useState(false);
  const [chatModel, setChatModel] = useState("");
  const [embeddingModel, setEmbeddingModel] = useState("");

  useEffect(() => {
    if (!config) return;
    setProvider((config.provider ?? "openai") as Provider);
    setBaseUrl(config.baseUrl ?? "");
    setChatModel(config.chatModel ?? "");
    setEmbeddingModel(config.embeddingModel ?? "");
  }, [config]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    try {
      await saveConfig.mutateAsync({
        provider,
        baseUrl: baseUrl.trim() || null,
        // Absent keeps the stored secret; empty string clears it.
        apiKey: clearKey ? "" : apiKey.trim() ? apiKey.trim() : undefined,
        chatModel: chatModel.trim(),
        embeddingModel: embeddingModel.trim(),
      });
      setApiKey("");
      setClearKey(false);
      toast.success(t("ai:config.saved"));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("ai:config.saveFailed"),
      );
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const needsBaseUrl =
    provider === "openai-compatible" ||
    provider === "ollama" ||
    provider === "openai";

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
      <p className="text-sm text-muted-foreground">
        {t("ai:config.description")}
      </p>

      <div className="space-y-1.5">
        <Label htmlFor="ai-provider">{t("ai:config.provider")}</Label>
        <Select
          value={provider}
          onValueChange={(value) => setProvider(value as Provider)}
        >
          <SelectTrigger id="ai-provider" className="w-full">
            {PROVIDERS.find((item) => item.value === provider)?.label}
          </SelectTrigger>
          <SelectContent>
            {PROVIDERS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {needsBaseUrl && (
        <div className="space-y-1.5">
          <Label htmlFor="ai-base-url">{t("ai:config.baseUrl")}</Label>
          <Input
            id="ai-base-url"
            value={baseUrl}
            onChange={(event) => setBaseUrl(event.target.value)}
            placeholder="https://open.bigmodel.cn/api/paas/v4"
          />
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="ai-api-key">{t("ai:config.apiKey")}</Label>
        <div className="flex gap-2">
          <Input
            id="ai-api-key"
            type="password"
            value={clearKey ? "" : apiKey}
            onChange={(event) => {
              setApiKey(event.target.value);
              setClearKey(false);
            }}
            placeholder={
              config?.apiKeyPresent ? t("ai:config.apiKeyStored") : undefined
            }
          />
          {config?.apiKeyPresent && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setClearKey(true);
                setApiKey("");
              }}
              disabled={clearKey}
            >
              {t("ai:config.clearKey")}
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ai-chat-model">{t("ai:config.chatModel")}</Label>
        <Input
          id="ai-chat-model"
          value={chatModel}
          onChange={(event) => setChatModel(event.target.value)}
          placeholder="glm-4.7 / gpt-4o / claude-sonnet-4-5"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ai-embedding-model">
          {t("ai:config.embeddingModel")}
        </Label>
        <Input
          id="ai-embedding-model"
          value={embeddingModel}
          onChange={(event) => setEmbeddingModel(event.target.value)}
          placeholder="text-embedding-3-small / bge-m3"
        />
        {config?.embeddingDimensions && (
          <p className="text-xs text-muted-foreground">
            {t("ai:config.detectedDimensions", {
              dimensions: config.embeddingDimensions,
            })}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={saveConfig.isPending}>
          {saveConfig.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          {t("ai:config.save")}
        </Button>
        <p className="text-xs text-muted-foreground">
          {t("ai:config.saveHint")}
        </p>
      </div>
    </form>
  );
}

export default AiConfigForm;
