namespace LiquorSaaS.Application.Common.Exceptions;

public sealed class UnauthorizedAppException(string message) : Exception(message);
