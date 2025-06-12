// api/redirect-by-device.js
module.exports = (req, res) => {
  const userAgent = req.headers['user-agent'];

  // Basic device detection based on User-Agent header
  const isMobile = Boolean(
    userAgent.match(
      /Android|BlackBerry|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i
    )
  );

  // Replace these with your actual Vercel deployment URLs
  const mobileSiteUrl = 'https://ns-website-mobile.vercel.app';
  const desktopSiteUrl = 'https://ns-website-desktop-42.vercel.app';

  if (isMobile) {
    // Redirect to the mobile site, preserving the original path (e.g., /about)
    res.setHeader('Location', mobileSiteUrl + req.url);
    res.statusCode = 302; // 302 Found (temporary redirect)
  } else {
    // Redirect to the desktop site, preserving the original path
    res.setHeader('Location', desktopSiteUrl + req.url);
    res.statusCode = 302; // 302 Found (temporary redirect)
  }
  res.end();
};
