using Microsoft.AspNetCore.Http;
using PIM3.API.Services;

namespace back_end.Tests;

public sealed class ApiSecurityConfigurationTests
{
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
