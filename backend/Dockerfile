# ---------------------------------------------------------
# STAGE 1: BUILD (SDK 8.0 Alpine)
# ---------------------------------------------------------
FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS build
WORKDIR /src

# Copy project files (.csproj) - better layer caching
COPY ["src/LiquorSaaS.Api/LiquorSaaS.Api.csproj", "src/LiquorSaaS.Api/"]
COPY ["src/LiquorSaaS.Application/LiquorSaaS.Application.csproj", "src/LiquorSaaS.Application/"]
COPY ["src/LiquorSaaS.Domain/LiquorSaaS.Domain.csproj", "src/LiquorSaaS.Domain/"]
COPY ["src/LiquorSaaS.Infrastructure/LiquorSaaS.Infrastructure.csproj", "src/LiquorSaaS.Infrastructure/"]

# Restore dependencies
RUN dotnet restore "src/LiquorSaaS.Api/LiquorSaaS.Api.csproj"

# Copy all source code
COPY . .

# Build project
WORKDIR "/src/src/LiquorSaaS.Api"
RUN dotnet build "LiquorSaaS.Api.csproj" -c Release -o /app/build

# ---------------------------------------------------------
# STAGE 2: PUBLISH
# ---------------------------------------------------------
FROM build AS publish
RUN dotnet publish "LiquorSaaS.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

# ---------------------------------------------------------
# STAGE 3: RUNTIME (ASP.NET Core 8.0 Alpine)
# ---------------------------------------------------------
FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine AS final
WORKDIR /app

# Install globalization support - required for token validation, dates, and localization
RUN apk add --no-cache icu-libs
ENV DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=false

EXPOSE 8080

# Copy published files
COPY --from=publish /app/publish .

ENTRYPOINT ["dotnet", "LiquorSaaS.Api.dll"]
