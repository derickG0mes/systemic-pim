using Microsoft.AspNetCore.Http;
using System.Net;

namespace PIM3.API.Services;

internal static class ApiSecurityConfiguration
{
    internal static bool IsAllowedLocalNetworkCorsOrigin(string origin)
    {
        if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri)
            || uri.Scheme != Uri.UriSchemeHttp
            || uri.Port is not (8080 or 5173)
            || !string.IsNullOrEmpty(uri.UserInfo)
            || uri.AbsolutePath != "/"
            || !string.IsNullOrEmpty(uri.Query)
            || !string.IsNullOrEmpty(uri.Fragment))
        {
            return false;
        }

        if (uri.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase))
            return true;

        if (!IPAddress.TryParse(uri.Host, out var address))
            return false;

        if (IPAddress.IsLoopback(address))
            return true;

        var octets = address.GetAddressBytes();
        return octets.Length == 4
            && (octets[0] == 10
                || octets[0] == 172 && octets[1] is >= 16 and <= 31
                || octets[0] == 192 && octets[1] == 168);
    }

    internal static bool IsAuthCookieSecure(bool isDevelopment, bool allowInsecureLocalNetwork) =>
        !isDevelopment && !allowInsecureLocalNetwork;

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
