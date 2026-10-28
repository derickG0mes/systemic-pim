FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY back-end/back-end.csproj back-end/
RUN dotnet restore back-end/back-end.csproj

COPY back-end/ back-end/
RUN dotnet publish back-end/back-end.csproj --configuration Release --output /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
RUN apt-get update \
    && apt-get install --yes --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/publish .
EXPOSE 5050
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD curl --fail --silent http://127.0.0.1:5050/api/healthcheck || exit 1

ENTRYPOINT ["dotnet", "back-end.dll"]
