namespace LiquorSaaS.Application.Common.Exceptions;

public sealed class AppValidationException(string message, params string[] errors) : Exception(message)
{
    public IReadOnlyCollection<string> Errors { get; } = errors;
}
