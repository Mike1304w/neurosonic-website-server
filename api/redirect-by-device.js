// api/proxy-by-device.js
// Vercel's Node.js runtime includes 'node-fetch' or a compatible global 'fetch' API.
// If you encounter issues, you might need to 'npm install node-fetch' in your router project
// and then explicitly require it: const fetch = require('node-fetch');

module.exports = async (req, res) => {
  const userAgent = req.headers['user-agent'];

  // Basic device detection
  const isMobile = Boolean(
    userAgent.match(
      /Android|BlackBerry|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i
    )
  );

  // YOUR ACTUAL VERCEl DEPLOYMENT URLs (ensure no trailing slashes here)
  const mobileSiteBaseUrl = 'https://ns-website-mobile.vercel.app';
  const desktopSiteBaseUrl = 'https://ns-website-desktop-42.vercel.app';

  const targetBaseUrl = isMobile ? mobileSiteBaseUrl : desktopSiteBaseUrl;

  // Construct the full URL for the target site, preserving the original path and query parameters
  const targetUrl = `${targetBaseUrl}${req.url}`;

  try {
    // Prepare headers to forward to the target site
    // We typically remove 'host' as the target server expects its own host
    const headersToForward = { ...req.headers };
    delete headersToForward.host;

    // Make the request to the target site
    const proxyResponse = await fetch(targetUrl, {
      method: req.method, // Forward the original HTTP method (GET, POST, etc.)
      headers: headersToForward, // Forward most original headers
      // Forward the request body for non-GET/HEAD methods
      body: req.method === 'GET' || req.method === 'HEAD' ? undefined : req.body,
      // Prevents 'node-fetch' from following redirects; we want to handle them if necessary
      redirect: 'manual'
    });

    // Set the status code of our response to match the target's response
    res.statusCode = proxyResponse.status;

    // Forward all headers from the target response back to the client
    proxyResponse.headers.forEach((value, name) => {
      // Exclude headers that should not be set by a proxy or are handled automatically by Vercel
      if (!['connection', 'keep-alive', 'content-length', 'transfer-encoding', 'vary'].includes(name.toLowerCase())) {
        res.setHeader(name, value);
      }
    });

    // Crucial for performance: pipe the body directly to the client
    // This streams the content without loading the entire response into memory
    proxyResponse.body.pipe(res);

  } catch (error) {
    console.error('Error during proxying:', error);
    res.statusCode = 500;
    res.end('Internal Server Error: Could not load the requested content.');
  }
};
