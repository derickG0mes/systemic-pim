using Microsoft.AspNetCore.Http;
using PIM3.API.Services;

namespace back_end.Tests;

public sealed class ApiSecurityConfigurationTests
{
    [Theory]
    [InlineData("http://localhost:8080", true)]
    [InlineData("http://127.0.0.1:5173", true)]
    [InlineData("http://192.168.15.6:8080", true)]
    [InlineData("http://172.16.0.1:5173", true)]
    [InlineData("https://192.168.15.6:8080", false)]
    [InlineData("http://192.168.15.6:3000", false)]
    [InlineData("http://8.8.8.8:8080", false)]
    [InlineData("http://example.com:8080", false)]
    [InlineData("http://192.168.15.6:8080/path", false)]
    public void Local_network_cors_allows_only_frontend_origins(string origin, bool expected)
    {
        Assert.Equal(expected, ApiSecurityConfiguration.IsAllowedLocalNetworkCorsOrigin(origin));
    }

    [Theory]
    [InlineData(true, false, false)]
    [InlineData(false, false, true)]
    [InlineData(false, true, false)]
    public void Auth_cookie_is_secure_unless_development_or_local_http_is_explicitly_enabled(
        bool isDevelopment,
        bool allowInsecureLocalNetwork,
        bool expected)
    {
        Assert.Equal(
            expected,
            ApiSecurityConfiguration.IsAuthCookieSecure(isDevelopment, allowInsecureLocalNetwork));
    }

    [Fact]
    public void Antiforgery_cookie_defaults_to_secure_outside_development()
    {
        Assert.Equal(
            CookieSecurePolicy.Always,
            ApiSecurityConfiguration.ResolveAntiforgeryCookieSecurePolicy(false, null));
    }

    [Fact]
    public void Compose_can_explicitly_keep_same_as_request_cookie_policy()
    {
        Assert.Equal(
            CookieSecurePolicy.SameAsRequest,
            ApiSecurityConfiguration.ResolveAntiforgeryCookieSecurePolicy(false, "SameAsRequest"));
    }

    [Fact]
    public void Invalid_antiforgery_cookie_policy_fails_startup()
    {
        Assert.Throws<InvalidOperationException>(
            () => ApiSecurityConfiguration.ResolveAntiforgeryCookieSecurePolicy(false, "None"));
    }
}
