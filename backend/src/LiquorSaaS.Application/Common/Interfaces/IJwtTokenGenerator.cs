using LiquorSaaS.Application.Auth;
using LiquorSaaS.Domain.Entities;

namespace LiquorSaaS.Application.Common.Interfaces;

public interface IJwtTokenGenerator
{
    AuthTokenDto Generate(AppUser user, Guid? deliveryUserId = null);
}
