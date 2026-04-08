using LiquorSaaS.Application.Common;
using LiquorSaaS.Application.Common.Exceptions;
using LiquorSaaS.Domain.Exceptions;

namespace LiquorSaaS.Api.Middleware;

public sealed class ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (Exception exception)
        {
            await HandleExceptionAsync(context, exception);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        logger.LogError(exception, "Unhandled exception during request execution");

        var (statusCode, message, errors) = exception switch
        {
            UnauthorizedAppException => (StatusCodes.Status401Unauthorized, exception.Message, Array.Empty<string>()),
            ForbiddenException => (StatusCodes.Status403Forbidden, exception.Message, Array.Empty<string>()),
            NotFoundException => (StatusCodes.Status404NotFound, exception.Message, Array.Empty<string>()),
            ConflictException => (StatusCodes.Status409Conflict, exception.Message, Array.Empty<string>()),
            AppValidationException validationException => (StatusCodes.Status422UnprocessableEntity, validationException.Message, validationException.Errors.ToArray()),
            DomainRuleException => (StatusCodes.Status422UnprocessableEntity, exception.Message, Array.Empty<string>()),
            _ => (StatusCodes.Status500InternalServerError, "An unexpected error occurred.", Array.Empty<string>())
        };

        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/json";

        await context.Response.WriteAsJsonAsync(ApiResponse<object>.Fail(message, errors));
    }
}
