const cors = require('cors');

const whitelist = JSON.parse(process.env.WHITELIST_IPs || '[]');

const allowedAPIRoutes = [
  '/api/v1/home/topNotice',
  '/api/v1/home/dashboardContent',
  '/api/v1/categories/ageVerificationModalContent',
  '/api/v1/categories/postAds',
  '/api/v1/categories/topSideNavLinks',
  '/api/v1/posts/alertMsg',
  '/api/v1/posts/ads',
  '/api/v1/posts/leftAds',
  '/api/v1/posts/rightAds',
  '/api/v1/posts/subCategoryContent',
  '/api/v1/post/ads',
  '/api/v1/page/about',
  '/api/v1/page/terms',
  '/api/v1/friends/ads',
  '/api/v1/page/categories-sitemap',
  '/api/v1/page/posts-sitemap',
  '/api/v1/page/partners-sitemap',
];

// Add static file routes to allow all origins
const allowedStaticRoutes = ['/uploads'];

var corsOptionsDelegate = function (req, callback) {
  const isValidAPIRoute = allowedAPIRoutes.some(route => req.path.startsWith(route));
  const isValidStaticRoute = allowedStaticRoutes.some(route => req.path.startsWith(route));
  const isSEORoute = req.path.toLowerCase().includes('seo'); // Check if path contains 'seo'

  if (isSEORoute || isValidAPIRoute || isValidStaticRoute) {
    // Allow all origins for SEO routes, API routes, and static routes
    const corsOptions = {
      origin: '*',
      methods: 'GET,HEAD',
    };
    callback(null, corsOptions);
    return;
  }

  if (process.env.NODE_ENV === 'production') {
    const origin = req.header('Origin');
    const referer = req.header('Referer');

    const normalizedOrigin = origin ? origin.replace(/\/$/, '') : origin;
    const normalizedReferer = referer ? referer.replace(/\/$/, '') : referer;

    // console.log('Production CORS Check:', {
    //   normalizedOrigin,
    //   normalizedReferer,
    //   whitelist,
    //   isNormalizedOriginPassed: whitelist.includes(normalizedOrigin),
    //   isNormalizedRefererPass: whitelist.includes(normalizedReferer),
    // });

    const corsOptions = {
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      allowedHeaders: ['Content-Type', 'x-api-key', 'Authorization'],
      credentials: true,
    };

    if (!normalizedOrigin && !normalizedReferer) {
      callback(new Error('Access Forbidden by CORS.'), false);
    } else if (whitelist.includes(normalizedOrigin) || whitelist.includes(normalizedReferer)) {
      callback(null, { ...corsOptions, origin: true });
    } else {
      callback(new Error('Not allowed by CORS'), false);
    }
  } else {
    const corsOptions = {
      origin: '*',
      methods: ['GET', 'POST'],
    };
    callback(null, corsOptions);
  }
};

module.exports = cors(corsOptionsDelegate);