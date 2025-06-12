// api/proxy-by-device.js
const fetch = require('node-fetch'); // Explicitly require node-fetch for stream compatibility

module.exports = async (req, res) => {
  // --- DEBUG LOGS START ---
  console.log(`[Proxy-Function] Incoming Request: ${req.method} ${req.url}`);
  console.log(`[Proxy-Function] User-Agent: ${req.headers['user-agent']}`);
  // --- DEBUG LOGS END ---

  const userAgent = req.headers['user-agent'];

  // Basic device detection based on User-Agent header
  const isMobile = Boolean(
    userAgent.match(
      /Android|BlackBerry|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i
    )
  );

  // --- DEBUG LOGS START ---
  console.log(`[Proxy-Function] isMobile detected: ${isMobile}`);
  // --- DEBUG LOGS END ---

  // YOUR ACTUAL VERCEl DEPLOYMENT URLs (ensure no trailing slashes here)
  const mobileSiteBaseUrl = 'https://ns-website-mobile.vercel.app';
  const desktopSiteBaseUrl = 'https://ns-website-desktop-42.vercel.app';

  const targetBaseUrl = isMobile ? mobileSiteBaseUrl : desktopSiteBaseUrl;

  // Construct the full URL for the target site, preserving the original path and query parameters
  const targetUrl = `${targetBaseUrl}${req.url}`;

  // --- DEBUG LOGS START ---
  console.log(`[Proxy-Function] Target URL: ${targetUrl}`);
  // --- DEBUG LOGS END ---

  try {
    // Prepare headers to forward to the target site
    // We typically remove 'host' as the target server expects its own host
    const headersToForward = { ...req.headers };
    delete headersToForward.host;

    // --- DEBUG LOGS START ---
    console.log(`[Proxy-Function] Fetching from target...`);
    // --- DEBUG LOGS END ---

    const proxyResponse = await fetch(targetUrl, {
      method: req.method, // Forward the original HTTP method (GET, POST, etc.)
      headers: headersToForward, // Forward most original headers
      // Forward the request body for non-GET/HEAD methods (e.g., POST, PUT)
      body: req.method === 'GET' || req.method === 'HEAD' ? undefined : req.body,
      // Crucial for proxying: Prevents 'node-fetch' from following redirects automatically.
      // We want to handle these manually if needed, or proxy the redirect response itself.
      redirect: 'manual'
    });

    // --- DEBUG LOGS START ---
    console.log(`[Proxy-Function] Received response from target. Status: ${proxyResponse.status}`);
    // Check if the target URL *itself* is sending a redirect (e.g., if you access a specific page)
    if (proxyResponse.status >= 300 && proxyResponse.status < 400) {
      console.warn(`[Proxy-Function] Target site returned a redirect (${proxyResponse.status}). Location: ${proxyResponse.headers.get('Location')}`);
    }
    // --- DEBUG LOGS END ---

    // Set the status code of our response to match the target's response
    res.statusCode = proxyResponse.status;

    // Forward all headers from the target response back to the client
    proxyResponse.headers.forEach((value, name) => {
      // Exclude headers that should not be set by a proxy or are handled automatically by Vercel's platform
      // Specifically added 'content-encoding' here to prevent decoding issues
      if (!['connection', 'keep-alive', 'content-length', 'transfer-encoding', 'vary', 'content-encoding'].includes(name.toLowerCase())) {
        res.setHeader(name, value);
      }
    });

    // --- DEBUG LOGS START ---
    console.log(`[Proxy-Function] Piping response body...`);
    // --- DEBUG LOGS END ---

    // This line should now work correctly because node-fetch provides a Node.js compatible stream
    proxyResponse.body.pipe(res);

  } catch (error) {
    // --- DEBUG LOGS START ---
    console.error(`[Proxy-Function] Error during proxying: ${error.message}`);
    // --- DEBUG LOGS END ---
    res.statusCode = 500;
    res.end('Internal Server Error: Could not load the requested content.');
  }
};
