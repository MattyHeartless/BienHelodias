using LiquorSaaS.Application.Auth;
using LiquorSaaS.Application.Common.Exceptions;
using LiquorSaaS.Application.Common.Interfaces;
using LiquorSaaS.Domain.Entities;
using LiquorSaaS.Domain.Enums;
using LiquorSaaS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace LiquorSaaS.Infrastructure.Services;

public sealed class AuthService(
    LiquorSaaSDbContext dbContext,
    IPasswordHasher passwordHasher,
    IJwtTokenGenerator jwtTokenGenerator,
    ICurrentUserService currentUserService,
    ILogger<AuthService> logger) : IAuthService
{
    public async Task<AuthTokenDto> LoginAsync(LoginRequest request, CancellationToken cancellationToken)
    {
        var user = await dbContext.Users.SingleOrDefaultAsync(
            x => x.Email == request.Email.Trim().ToLowerInvariant(),
            cancellationToken);

        if (user is null || !passwordHasher.VerifyPassword(request.Password, user.PasswordHash) || !user.IsActive)
        {
            logger.LogWarning("Failed login attempt for {Email}", request.Email);
            throw new UnauthorizedAppException("Invalid credentials.");
        }

        var deliveryUserId = await dbContext.DeliveryUsers
            .Where(x => x.UserId == user.Id)
            .Select(x => (Guid?)x.Id)
            .SingleOrDefaultAsync(cancellationToken);

        logger.LogInformation("Successful login for user {Email}", user.Email);
        return jwtTokenGenerator.Generate(user, deliveryUserId);
    }

    public async Task<AuthTokenDto> RefreshAsync(CancellationToken cancellationToken)
    {
        if (!currentUserService.IsAuthenticated || currentUserService.UserId is null)
        {
            throw new UnauthorizedAppException("Authenticated user is required.");
        }

        var user = await dbContext.Users.SingleOrDefaultAsync(x => x.Id == currentUserService.UserId.Value, cancellationToken)
            ?? throw new UnauthorizedAppException("Authenticated user was not found.");

        var deliveryUserId = await dbContext.DeliveryUsers
            .Where(x => x.UserId == user.Id)
            .Select(x => (Guid?)x.Id)
            .SingleOrDefaultAsync(cancellationToken);

        return jwtTokenGenerator.Generate(user, deliveryUserId);
    }

    public async Task<AuthTokenDto> RegisterAdminAsync(RegisterAdminRequest request, CancellationToken cancellationToken)
    {
        EnsureRole(UserRole.SuperAdmin);
        await EnsureEmailIsUniqueAsync(request.Email, cancellationToken);

        var store = await dbContext.Stores.SingleOrDefaultAsync(x => x.Id == request.StoreId, cancellationToken)
            ?? throw new NotFoundException("Store not found.");

        var user = AppUser.Create(
            request.Name,
            request.Email,
            passwordHasher.HashPassword(request.Password),
            UserRole.StoreAdmin,
            store.Id);

        await dbContext.Users.AddAsync(user, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);

        logger.LogInformation("Store admin {Email} registered for store {StoreId}", user.Email, store.Id);
        return jwtTokenGenerator.Generate(user);
    }

    public async Task<AuthTokenDto> RegisterDeliveryAsync(RegisterDeliveryRequest request, CancellationToken cancellationToken)
    {
        var storeId = currentUserService.Role switch
        {
            UserRole.SuperAdmin => request.StoreId ?? throw new AppValidationException("StoreId is required for super-admin registration."),
            UserRole.StoreAdmin => currentUserService.StoreId ?? throw new ForbiddenException("Store admin has no store assigned."),
            _ => throw new ForbiddenException("Only super admins and store admins can register delivery users.")
        };

        await EnsureEmailIsUniqueAsync(request.Email, cancellationToken);

        var user = AppUser.Create(
            request.Name,
            request.Email,
            passwordHasher.HashPassword(request.Password),
            UserRole.DeliveryUser,
            storeId);

        var deliveryUser = DeliveryUser.Create(user.Id, storeId, request.Name, request.Phone, request.Email);

        await dbContext.Users.AddAsync(user, cancellationToken);
        await dbContext.DeliveryUsers.AddAsync(deliveryUser, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);

        logger.LogInformation("Delivery user {Email} registered for store {StoreId}", user.Email, storeId);
        return jwtTokenGenerator.Generate(user, deliveryUser.Id);
    }

    private async Task EnsureEmailIsUniqueAsync(string email, CancellationToken cancellationToken)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();
        if (await dbContext.Users.AnyAsync(x => x.Email == normalizedEmail, cancellationToken))
        {
            throw new ConflictException("Email is already registered.");
        }
    }

    private void EnsureRole(UserRole requiredRole)
    {
        if (currentUserService.Role != requiredRole)
        {
            throw new ForbiddenException($"Required role: {requiredRole}.");
        }
    }
}
