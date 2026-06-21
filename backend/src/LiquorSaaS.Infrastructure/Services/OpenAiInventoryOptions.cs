namespace LiquorSaaS.Infrastructure.Services;

public sealed class OpenAiInventoryOptions
{
    public const string SectionName = "OpenAI";

    public string Provider { get; init; } = "OpenAI";
    public string ApiKey { get; init; } = string.Empty;
    public string Model { get; init; } = "gpt-5.4-mini";
    public string BaseUrl { get; init; } = "https://api.openai.com/v1";
    public string ResponsesEndpoint { get; init; } = "https://api.openai.com/v1/responses";
    public string ChatCompletionsEndpoint { get; init; } = "https://api.openai.com/v1/chat/completions";
}
