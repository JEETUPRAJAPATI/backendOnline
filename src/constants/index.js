const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
};

const MESSAGES = {
  INTERNAL_SERVER_ERROR: "Internal Server Error",
  NOT_FOUND: "Resource not found",
  UNAUTHORIZED: "Unauthorized access",
  BAD_REQUEST: "Bad request",
};

const LIMIT = {
  HOME_COUNTRIES: 2,
  HOME_CITIES: 5,
  HOME_SUBCITIES: 5,
  POST: 200,
  PARTNERS: 100,
  BLOGS: 5,
  MY_POST: 100,
  MY_BALANCE_HISTORIES: 100,
  MY_INVOICE_HISTORIES: 100,
  MY_NOTIFICATIONS: 100,
  ADMIN_NOTIFICATIONS: 100,
  ADMIN_LINKREQUESTS: 100,
  ADMIN_SITE_LINKS: 100,
  ADMIN_SITELINK_CATEGORIES: 100,
  ADMIN_MESSAGES: 100,
  ADMIN_USERS: 100,
  ADMIN_MEMBER_POSTS: 100,
  ADMIN_PROFILES: 100,
  ADMIN_POSTS: 100,
  ADMIN_COUNTRIES: 100,
  ADMIN_CITIES: 100,
  ADMIN_SUBCITIES: 100,
  ADMIN_CATEGORIES: 100,
  ADMIN_SUBCATEGORIES: 100,
  ADMIN_MAIN_ADS: 100,
  ADMIN_SLIDER_ADS: 100,
  ADMIN_POST_ADS: 100,
  ADMIN_NEW_POST_ADS: 100,
  ADMIN_CATEGORY_POST_ADS: 100,
  ADMIN_GOOGLE_ADS: 100,
  ADMIN_TERMS: 100,
  ADMIN_ABOUTS: 100,
  ADMIN_HOME_NOTICES: 100,
  ADMIN_ALERT_MSG: 100,
  ADMIN_POST_REPORT: 100,
  ADMIN_FEATURED_PACKAGE: 100,
  ADMIN_EXTENDED_PACKAGE: 100,
  ADMIN_NAV_LINKS: 100,
  ADMIN_FOOTER_LINKS: 100,
  ADMIN_SUBCITY_CONTENTS: 100,
  ADMIN_SUBCATEGORY_CONTENTS: 100,
  ADMIN_SPONSERED_LINKS: 100,
  ADMIN_FRIEND_LINKS: 100,
  ADMIN_PAYMENT_METHODS: 100,
  ADMIN_PAYMENT_REQUESTS: 100,
  ADMIN_VIDEOS: 100,
  ADMIN_MODULES: 100,
  ADMIN_BLOG_CATEGORIES: 100,
  ADMIN_BLOGS: 100,
  ADMIN_METADATAS: 100,
};

const UPLOADED_PATH = {
  MANUAL_PAYMENT_SCREENSHOT: 'manual_payment_ss',
  POST: 'frontend/images/post2',
  SITE_LINK_LOGO: 'frontend/images/new-sites',
  SITE_LINK_IMAGE: 'frontend/images/new-sites',
  ADMIN_PROFILE_IMAGE: 'backend/images/admin',
  ADMIN_AD_IMAGE: 'frontend/images/advertisement',
  ADMIN_SLIDER_AD_IMAGE: 'frontend/images/slider-ads',
  ADMIN_POST_AD_IMAGE: 'frontend/images/post_ads',
  ADMIN_BLOG_IMAGE: 'frontend/images/blogs',
  ADMIN_CATEGORY_POST_AD_IMAGE: 'frontend/images/category_post_ads',
  ADMIN_POST_IMAGE: 'frontend/images/admin-post',
  ADMIN_SETTINGS_IMAGE: 'backend/images/settings2',
  ADMIN_VIDEO: 'frontend/videos',
};

const DB_CONFIG = {
  development: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    charset: 'utf8mb4',
    connectionLimit: 3,          // Reduced for remote connections
    queueLimit: 0,               // Limit for the connection queue (0 means no limit)
    waitForConnections: true,    // Waits if connection limit is reached
    debug: false,                // Enable logging for debugging (set to true if needed)
    connectTimeout: 20000        // 20 seconds to establish connection
  },
  production: {
    host: process.env.DB_HOST_PROD || process.env.DB_HOST,
    port: process.env.DB_PORT_PROD || process.env.DB_PORT || 3306,
    user: process.env.DB_USER_PROD || process.env.DB_USER,
    password: process.env.DB_PASSWORD_PROD || process.env.DB_PASSWORD,
    database: process.env.DB_NAME_PROD || process.env.DB_NAME,
    charset: 'utf8mb4',
    connectionLimit: 3,          // Reduced for remote connections
    queueLimit: 0,               // Limit for the connection queue (0 means no limit)
    waitForConnections: true,    // Waits if connection limit is reached
    debug: false,                // Enable logging for debugging (set to true if needed)
    connectTimeout: 20000        // 20 seconds to establish connection
  },
}

const CAPTCHA_CONFIG = {
  PUBLIC_KEY: "",
  SECRET_KEY: process.env.RECAPTCHA_SECRET_KEY || "",
}

const EMAIL_CONFIG = {
  development: {
    service: 'sendemail',
    host: 'localxlist.org',
    port: 465,
    secure: true,
    auth: {
      user: 'noreply@localxlist.org',
      pass: 'r0NDfVXlFbp',
    },
  },
  production: {
    service: 'gmail',
    auth: {
      user: 'your-email@gmail.com',
      pass: 'your-email-password', // Use app password if 2FA enabled
    },
  },
};

const JWT_CONFIG = {
  development: {
    JWT_SECRET: process.env.JWT_SECRET || "",
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || "",
  },
  production: {
    JWT_SECRET: process.env.JWT_SECRET || "",
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || "",
  },
};

const COMMON_CONFIG = {
  development: {
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "",
  },
  production: {
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "",
  },
  admin: {
    DEFAULT_USER_IMG: 'default/user.jpg',
    DEFAULT_NO_IMG: 'frontend/images/no-image.png',
  }
}

const META_PAGES = {
  HOME: 'home',
  CATEGORIES: 'categories',
  POSTS: 'posts',
  POST_DETAIL: 'postDetail',
  ABOUT_US: 'about',
  CONTACT_US: 'contactUs',
  TERMS_AND_CONDITIONS: 't&c',
  BLOGS: 'blogs',
  PARTNER_CATEGORIES: 'partnerCategories',
  PARTNERS: 'partners',
  PARTNER_DETAIL: 'partnerDetail',
  LOGIN: 'login',
  SIGNUP: 'signup',
  FORGOT_PASSWORD: 'forgotPassword',
  RESET_PASSWORD: 'resetPassword',
  FORGOT_VERIFICATION: 'forgotVerification',
  SIGNUP_VERIFICATION: 'signupVerification',
  FRIENDS: 'friends',
  SITE_LINKS: 'siteLinks',
  SITE_LINKS_SEARCH: 'siteLinksSearch',
};

module.exports = { HTTP_STATUS, MESSAGES, LIMIT, DB_CONFIG, CAPTCHA_CONFIG, EMAIL_CONFIG, JWT_CONFIG, COMMON_CONFIG, UPLOADED_PATH, META_PAGES };
