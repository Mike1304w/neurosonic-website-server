// api/proxy-by-device.js
// Vercel's Node.js runtime includes 'node-fetch' or a compatible global 'fetch' API.
// If you encounter issues, you might need to 'npm install node-fetch' in your router project
// and then explicitly require it: const fetch = require('node-fetch');

module.exports = async (req, res) => {
  // --- DEBUG LOGS START ---
  console.log(`[Proxy-Function] Incoming Request: ${req.method} ${req.url}`);
  console.log(`[Proxy-Function] User-Agent: ${req.headers['user-agent']}`);
  // --- DEBUG LOGS END ---

  const userAgent = req.headers['user-agent'];

  // Basic device detection
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
    const headersToForward = { ...req.headers };
    delete headersToForward.host; // Remove 'host' header as the target server expects its own host

    // --- DEBUG LOGS START ---
    console.log(`[Proxy-Function] Fetching from target...`);
    // --- DEBUG LOGS END ---

    const proxyResponse = await fetch(targetUrl, {
      method: req.method,
      headers: headersToForward,
      body: req.method === 'GET' || req.method === 'HEAD' ? undefined : req.body,
      redirect: 'manual' // Crucial: Prevents fetch from following redirects itself
    });

    // --- DEBUG LOGS START ---
    console.log(`[Proxy-Function] Received response from target. Status: ${proxyResponse.status}`);
    // Check if the target URL *itself* is sending a redirect
    if (proxyResponse.status >= 300 && proxyResponse.status < 400) {
      console.warn(`[Proxy-Function] Target site returned a redirect (${proxyResponse.status}). Location: ${proxyResponse.headers.get('Location')}`);
    }
    // --- DEBUG LOGS END ---

    res.statusCode = proxyResponse.status;

    proxyResponse.headers.forEach((value, name) => {
      if (!['connection', 'keep-alive', 'content-length', 'transfer-encoding', 'vary'].includes(name.toLowerCase())) {
        res.setHeader(name, value);
      }
    });

    // --- DEBUG LOGS START ---
    console.log(`[Proxy-Function] Piping response body...`);
    // --- DEBUG LOGS END ---

    proxyResponse.body.pipe(res);

  } catch (error) {
    // --- DEBUG LOGS START ---
    console.error(`[Proxy-Function] Error during proxying: ${error.message}`);
    // --- DEBUG LOGS END ---
    res.statusCode = 500;
    res.end('Internal Server Error: Could not load the requested content.');
  }
};
