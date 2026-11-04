using Microsoft.AspNetCore.Http;

namespace PIM3.API.Services;

internal static class ApiSecurityConfiguration
{
    internal static CookieSecurePolicy ResolveAntiforgeryCookieSecurePolicy(
        bool isDevelopment,
        string? configuredPolicy)
    {
        if (string.IsNullOrWhiteSpace(configuredPolicy))
            return isDevelopment ? CookieSecurePolicy.SameAsRequest : CookieSecurePolicy.Always;

        if (Enum.TryParse<CookieSecurePolicy>(configuredPolicy, ignoreCase: true, out var policy)
            && policy is CookieSecurePolicy.Always or CookieSecurePolicy.SameAsRequest)
        {
            return policy;
        }

        throw new InvalidOperationException(
            "ANTIFORGERY_COOKIE_SECURE_POLICY deve ser Always ou SameAsRequest.");
    }
}
