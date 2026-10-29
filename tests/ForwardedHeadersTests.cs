using System.Net;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace back_end.Tests;

public class ForwardedHeadersTests
{
    [Fact]
    public async Task X_forwarded_proto_is_honored_only_from_a_configured_proxy()
    {
        var options = new ForwardedHeadersOptions
        {
            ForwardedHeaders = ForwardedHeaders.XForwardedProto
        };
        options.KnownIPNetworks.Clear();
        options.KnownProxies.Clear();
        options.KnownProxies.Add(IPAddress.Loopback);

        var middleware = new ForwardedHeadersMiddleware(
            _ => Task.CompletedTask,
            NullLoggerFactory.Instance,
            Options.Create(options));
        var trustedContext = new DefaultHttpContext();
        trustedContext.Connection.RemoteIpAddress = IPAddress.Loopback;
        trustedContext.Request.Headers["X-Forwarded-Proto"] = "https";

        await middleware.Invoke(trustedContext);

        Assert.Equal("https", trustedContext.Request.Scheme);

        var untrustedContext = new DefaultHttpContext();
        untrustedContext.Connection.RemoteIpAddress = IPAddress.Parse("192.0.2.10");
        untrustedContext.Request.Headers["X-Forwarded-Proto"] = "https";

        await middleware.Invoke(untrustedContext);

        Assert.Equal("http", untrustedContext.Request.Scheme);
    }
}
