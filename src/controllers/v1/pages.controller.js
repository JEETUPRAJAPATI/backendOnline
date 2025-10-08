const { createSuccessResponse } = require('../../utils/responseUtils');
const { getHeaderMetaData } = require('../../utils/metaUtils');
const { fileExists, truncatedContent, sanitizeXSSInput, slugify } = require('../../utils/generalUtils');
const { getSettingsData, getTableRecord, insertRecord, getPageMetaData } = require("../../services/common.service");
const { executeQuery } = require('../../utils/dbUtils');
const { LIMIT, META_PAGES } = require('../../constants');
const { getCache, setCache } = require('../../utils/cache');

const contactSeo = async (req, res, next) => {
  try {

    const settings = await getSettingsData();

    let logo_img = 'backend/images/settings/header_logo_15477661460.png';
    if (settings?.header_logo_path && fileExists(settings.header_logo_path)) {
      logo_img = `${req.appBaseUrl}/uploads/${settings.header_logo_path}`;
    } else {
      logo_img = `${req.appBaseUrl}/uploads/${logo_img}`;
    }

    const site_name = settings?.site_name || 'localxlist';
    const pageMetaData = await getPageMetaData(META_PAGES.CONTACT_US);
    // Generate headers using the metadata utility
    const header_data = {
      title: pageMetaData?.title || `Contact us | ${site_name}`,
      description: pageMetaData?.description || `Cities | ${site_name}`,
      keywords: pageMetaData?.keywords || `Contact us | ${site_name}`,
      robots: pageMetaData?.robots || "",
      ogTitle: pageMetaData?.og_title || `Contact us | ${site_name}`,
      ogDescription: pageMetaData?.og_description || `Contact us | ${site_name}`,
      ogImage: pageMetaData?.og_image || logo_img || '',
      ogImageHeight: pageMetaData?.og_image_height || '377',
      ogImageWidth: pageMetaData?.og_image_width || '',
      ogSiteName: pageMetaData?.og_site_name || 'localxlist.org',
      ogType: pageMetaData?.og_type || 'localxlist.org',
      ogUrl: pageMetaData?.og_url || 'https://localxlist.org/',

      twitterTitle: pageMetaData?.twitter_title || `Contact us | ${site_name}`,
      twitterDescription: pageMetaData?.twitter_description || `Contact us | ${site_name}`,
      twitterUrl: pageMetaData?.twitter_url || 'https://localxlist.org/',
      twitterSite: pageMetaData?.twitter_site || `${site_name}`,
      twitterCard: pageMetaData?.twitter_card || 'summary_large_image',
      twitterCreator: pageMetaData?.twitter_creator || `${site_name}`,
      twitterImage: pageMetaData?.twitter_image || logo_img || '',

      pageHeading: pageMetaData?.page_heading || '',
      author: pageMetaData?.author || 'localxlist.org',
      favicon: (settings?.favicon && fileExists(settings.favicon) && `${req.appBaseUrl}/uploads/${settings.favicon}`) || '',
      image: logo_img || '',
      generator: pageMetaData?.generator || 'localxlist.org',
      fbAppId: settings?.fbAppId || process.env.FB_APP_ID || "",
      yandexVerificationId: settings?.yandexVerificationId || process.env.YANDEX_VERIFICATION || "",
      googleAnalyticsId: settings?.googleAnalyticsId || process.env.GOOGLE_ANALYTICS_ID || "",
    };
    const headers = getHeaderMetaData(header_data);

    res.json(createSuccessResponse("Data retrieved successfully.", headers));

  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const contact = async (req, res, next) => {
  try {

    const { name, subject, email, phone_number, message } = req.body;

    // Create new contact
    const newContact = {
      name,
      email,
      phone: phone_number,
      subject,
      msg: message,
      status: 0
    };


    // Save the massage to the database
    const insertedId = await insertRecord('massage', newContact);

    res.json(createSuccessResponse('Your message successfully sent.', { messageId: insertedId }, "CONTACT_SUCCESS"));

  } catch (error) {
    next(error);
  }
};

const aboutSeo = async (req, res, next) => {
  try {

    const settings = await getSettingsData();

    let logo_img = 'backend/images/settings/header_logo_15477661460.png';
    if (settings?.header_logo_path && fileExists(settings.header_logo_path)) {
      logo_img = `${req.appBaseUrl}/uploads/${settings.header_logo_path}`;
    } else {
      logo_img = `${req.appBaseUrl}/uploads/${logo_img}`;
    }

    const site_name = settings?.site_name || 'localxlist';
    const pageMetaData = await getPageMetaData(META_PAGES.ABOUT_US);
    // Generate headers using the metadata utility
    const header_data = {
      title: pageMetaData?.title || `About | ${site_name}`,
      description: pageMetaData?.description || `Cities | ${site_name}`,
      keywords: pageMetaData?.keywords || `About | ${site_name}`,
      robots: pageMetaData?.robots || "",
      ogTitle: pageMetaData?.og_title || `About | ${site_name}`,
      ogDescription: pageMetaData?.og_description || `About | ${site_name}`,
      ogImage: pageMetaData?.og_image || logo_img || '',
      ogImageHeight: pageMetaData?.og_image_height || '377',
      ogImageWidth: pageMetaData?.og_image_width || '',
      ogSiteName: pageMetaData?.og_site_name || 'localxlist.org',
      ogType: pageMetaData?.og_type || 'localxlist.org',
      ogUrl: pageMetaData?.og_url || 'https://localxlist.org/',

      twitterTitle: pageMetaData?.twitter_title || `About | ${site_name}`,
      twitterDescription: pageMetaData?.twitter_description || `About | ${site_name}`,
      twitterUrl: pageMetaData?.twitter_url || 'https://localxlist.org/',
      twitterSite: pageMetaData?.twitter_site || `${site_name}`,
      twitterCard: pageMetaData?.twitter_card || 'summary_large_image',
      twitterCreator: pageMetaData?.twitter_creator || `${site_name}`,
      twitterImage: pageMetaData?.twitter_image || logo_img || '',

      pageHeading: pageMetaData?.page_heading || '',
      author: pageMetaData?.author || 'localxlist.org',
      favicon: (settings?.favicon && fileExists(settings.favicon) && `${req.appBaseUrl}/uploads/${settings.favicon}`) || '',
      image: logo_img || '',
      generator: pageMetaData?.generator || 'localxlist.org',
      fbAppId: settings?.fbAppId || process.env.FB_APP_ID || "",
      yandexVerificationId: settings?.yandexVerificationId || process.env.YANDEX_VERIFICATION || "",
      googleAnalyticsId: settings?.googleAnalyticsId || process.env.GOOGLE_ANALYTICS_ID || "",
    };
    const headers = getHeaderMetaData(header_data);
    res.json(createSuccessResponse("Data retrieved successfully.", headers));

  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const about = async (req, res, next) => {
  try {

    const aboutDetail = await getTableRecord(`SELECT * FROM about LIMIT 1`, [], true);

    res.json(createSuccessResponse("Data retrieved successfully.", aboutDetail));

  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const termsSeo = async (req, res, next) => {
  try {

    const settings = await getSettingsData();

    let logo_img = 'backend/images/settings/header_logo_15477661460.png';
    if (settings?.header_logo_path && fileExists(settings.header_logo_path)) {
      logo_img = `${req.appBaseUrl}/uploads/${settings.header_logo_path}`;
    } else {
      logo_img = `${req.appBaseUrl}/uploads/${logo_img}`;
    }

    const site_name = settings?.site_name || 'localxlist';
    const pageMetaData = await getPageMetaData(META_PAGES.TERMS_AND_CONDITIONS);
    // Generate headers using the metadata utility
    const header_data = {
      title: pageMetaData?.title || `Terms and conditions | ${site_name}`,
      description: pageMetaData?.description || `Cities | ${site_name}`,
      keywords: pageMetaData?.keywords || `Terms and conditions | ${site_name}`,
      robots: pageMetaData?.robots || "",
      ogTitle: pageMetaData?.og_title || `Terms and conditions | ${site_name}`,
      ogDescription: pageMetaData?.og_description || `Terms and conditions | ${site_name}`,
      ogImage: pageMetaData?.og_image || logo_img || '',
      ogImageHeight: pageMetaData?.og_image_height || '377',
      ogImageWidth: pageMetaData?.og_image_width || '',
      ogSiteName: pageMetaData?.og_site_name || 'localxlist.org',
      ogType: pageMetaData?.og_type || 'localxlist.org',
      ogUrl: pageMetaData?.og_url || 'https://localxlist.org/',

      twitterTitle: pageMetaData?.twitter_title || `Terms and conditions | ${site_name}`,
      twitterDescription: pageMetaData?.twitter_description || `Terms and conditions | ${site_name}`,
      twitterUrl: pageMetaData?.twitter_url || 'https://localxlist.org/',
      twitterSite: pageMetaData?.twitter_site || `${site_name}`,
      twitterCard: pageMetaData?.twitter_card || 'summary_large_image',
      twitterCreator: pageMetaData?.twitter_creator || `${site_name}`,
      twitterImage: pageMetaData?.twitter_image || logo_img || '',

      pageHeading: pageMetaData?.page_heading || '',
      author: pageMetaData?.author || 'localxlist.org',
      favicon: (settings?.favicon && fileExists(settings.favicon) && `${req.appBaseUrl}/uploads/${settings.favicon}`) || '',
      image: logo_img || '',
      generator: pageMetaData?.generator || 'localxlist.org',
      fbAppId: settings?.fbAppId || process.env.FB_APP_ID || "",
      yandexVerificationId: settings?.yandexVerificationId || process.env.YANDEX_VERIFICATION || "",
      googleAnalyticsId: settings?.googleAnalyticsId || process.env.GOOGLE_ANALYTICS_ID || "",

    };
    const headers = getHeaderMetaData(header_data);

    res.json(createSuccessResponse("Data retrieved successfully.", headers));

  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const terms = async (req, res, next) => {
  try {

    const termsList = await getTableRecord(`SELECT * FROM terms`);

    res.json(createSuccessResponse("Data retrieved successfully.", termsList));

  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const commonSettings = async (req, res, next) => {
  try {
    const settings = await getSettingsData();
    const footerLinks = await getTableRecord(`SELECT id, text, url, new_window_open FROM footer_links WHERE status = 1 ORDER BY id DESC`);

    res.json(createSuccessResponse("Data retrieved successfully.", { ...settings, footerLinks }));
  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const categoriesSitemap = async (req, res, next) => {
  try {
    const urls = new Set();
    const startTime = Date.now();

    // Try to fetch from cache first
    const cacheKey = 'categories-sitemap';
    const cacheTime = 60 * 3600; // Second
    const cacheCondition = {};
    const cachedPosts = await getCache(cacheKey, cacheCondition);
    if (cachedPosts) {
      return res.json(createSuccessResponse("Data retrieved successfully.", cachedPosts)); // If cached data exists, return it
    }

    // 1. Fetch all necessary data in parallel
    const [countries, cities, subcities, categories, subcategories] = await Promise.all([
      executeQuery('SELECT country.id, country.country FROM country ORDER BY id ASC;'),
      executeQuery('SELECT city.id, city.city, country.id AS country_id, country.country FROM city INNER JOIN country ON country.id = city.country;'),
      executeQuery('SELECT subcity.id, subcity.subcity, city.id AS city_id, city.city FROM subcity INNER JOIN city ON city.id = subcity.city INNER JOIN country ON country.id = city.country;'),
      executeQuery('SELECT id, category FROM category'),
      executeQuery('SELECT subcategory.id, subcategory.subcategory, category.id AS category_id, category.category FROM subcategory INNER JOIN category ON category.id = subcategory.category;'),
    ]);

    // 2. Create lookup maps for O(1) access
    const countryMap = new Map(countries.map(c => [c.id, c]));
    const cityMap = new Map(cities.map(c => [c.id, {
      ...c,
      country: countryMap.get(c.country_id)?.country || 'unknown'
    }]));
    const subcityMap = new Map(subcities.map(s => [s.id, {
      ...s,
      city: cityMap.get(s.city_id)?.city || 'unknown',
      country: cityMap.get(s.city_id)?.country || 'unknown'
    }]));

    const categoryMap = new Map(categories.map(c => [c.id, c]));

    const subcategoriesByCategory = new Map();
    subcategories.forEach(subcat => {
      const categoryId = subcat.category_id;
      if (!subcategoriesByCategory.has(categoryId)) {
        subcategoriesByCategory.set(categoryId, []);
      }
      subcategoriesByCategory.get(categoryId).push({
        ...subcat,
        category: categoryMap.get(categoryId)?.category || 'unknown'
      });
    });

    for (const subcity of subcities) {
      const subcityData = subcityMap.get(subcity.id);
      const cityData = cityMap.get(subcity.city_id);
      const countryData = countryMap.get(cityData?.country_id);
      if (!countryData || !cityData || !subcityData) continue;
      const countrySlug = slugify(countryData.country);
      const citySlug = slugify(cityData.city);
      const subcitySlug = slugify(subcityData.subcity);
      const locationPath = `${countrySlug}/${citySlug}/${subcitySlug}`;
      // Add subcity URL
      urls.add(`/s/${locationPath}`);
      for (const category of categories) {
        const categorySlug = slugify(category.category);
        const categorySubcats = subcategoriesByCategory.get(category.id) || [];
        for (const subcat of categorySubcats) {
          const subcatSlug = slugify(subcat.subcategory);
          // Add post-list URL
          urls.add(`/p/${locationPath}/categories/${categorySlug}/${subcatSlug}/post-list`);
        }
      }
    }

    const responseData = {
      total_urls: urls.size,
      generation_time: `${(Date.now() - startTime) / 1000} seconds`,
      urls: Array.from(urls)
    };

    // Set Cache :::::::::
    await setCache(cacheKey, responseData, cacheCondition, cacheTime);

    res.json(createSuccessResponse("Data retrieved successfully.", responseData));

  } catch (error) {
    console.error('Categories Sitemap generation error:', error);
    next(error);
  }
};

const postsSitemap = async (req, res, next) => {
  try {
    const {
      page = 1,
    } = req.query;


    const urls = new Set();
    const startTime = Date.now();

    // Try to fetch from cache first
    const cacheKey = 'post-sitemap';
    const cacheTime = 60 * 3600; // Second
    const cacheCondition = {
      page,
    };
    const cachedPosts = await getCache(cacheKey, cacheCondition);
    if (cachedPosts) {
      return res.json(createSuccessResponse("Data retrieved successfully.", cachedPosts)); // If cached data exists, return it
    }

    const [countries, cities, subcities, categories, subcategories] = await Promise.all([
      executeQuery('SELECT country.id, country.country FROM country ORDER BY id ASC;'),
      executeQuery('SELECT city.id, city.city, country.id AS country_id, country.country FROM city INNER JOIN country ON country.id = city.country;'),
      executeQuery('SELECT subcity.id, subcity.subcity, city.id AS city_id, city.city FROM subcity INNER JOIN city ON city.id = subcity.city INNER JOIN country ON country.id = city.country;'),
      executeQuery('SELECT id, category FROM category'),
      executeQuery('SELECT subcategory.id, subcategory.subcategory, category.id AS category_id, category.category FROM subcategory INNER JOIN category ON category.id = subcategory.category;'),
    ]);

    // Pagination and post fetching
    let totalPages, totalPosts;
    // const perPageLimit = LIMIT.POST || 10;
    const perPageLimit = 10;
    const offset = (page - 1) * perPageLimit;


    const countryMap = new Map(countries.map(c => [c.id, c]));
    const cityMap = new Map(cities.map(c => [c.id, {
      ...c,
      country: countryMap.get(c.country_id)?.country || 'unknown'
    }]));
    const subcityMap = new Map(subcities.map(s => [s.id, {
      ...s,
      city: cityMap.get(s.city_id)?.city || 'unknown',
      country: cityMap.get(s.city_id)?.country || 'unknown'
    }]));

    const categoryMap = new Map(categories.map(c => [c.id, c]));

    let postList = [];

    if (subcities.length > 0 && subcategories.length > 0) {
      const subcityIds = subcities.map(s => s.id);
      const subcategoryIds = subcategories.map(s => s.id);


      // Fetch total post count for pagination
      const totalPostCount = await executeQuery(
        `SELECT COUNT(p.id) AS total_post 
        FROM post p
        JOIN country c ON p.country_id = c.id
        JOIN city ci ON p.city_id = ci.id
        JOIN subcity sc ON p.subcity_id = sc.id
        JOIN category cat ON p.category_id = cat.id
        JOIN subcategory subcat ON p.subcategory_id = subcat.id

       WHERE p.status = 1 
    -- AND (p.post_delete_date IS NULL OR p.post_delete_date >= NOW()) 
        AND p.subcity_id IN (?)
        AND p.subcategory_id IN (?);
      `,
        [subcityIds, subcategoryIds]
      );
      totalPosts = totalPostCount[0]?.total_post || 0;
      totalPages = Math.ceil(totalPosts / perPageLimit);

      postList = await executeQuery(`
        SELECT 
          DISTINCT p.id, 
          p.title, 
          p.country_id, 
          p.city_id, 
          p.subcity_id, 
          p.category_id, 
          p.subcategory_id,
          c.country,
          ci.city,
          sc.subcity,
          cat.category,
          subcat.subcategory
        FROM post p
        JOIN country c ON p.country_id = c.id
        JOIN city ci ON p.city_id = ci.id
        JOIN subcity sc ON p.subcity_id = sc.id
        JOIN category cat ON p.category_id = cat.id
        JOIN subcategory subcat ON p.subcategory_id = subcat.id
        WHERE p.status = 1 
        -- AND (p.post_delete_date IS NULL OR p.post_delete_date >= NOW()) 
        AND p.subcity_id IN (?)
        AND p.subcategory_id IN (?)
        LIMIT ? OFFSET ?;
      `, [subcityIds, subcategoryIds, perPageLimit, offset]);
    }
    console.log('Posts fetched:', postList.length);

    const subcategoriesByCategory = new Map();
    subcategories.forEach(subcat => {
      const categoryId = subcat.category_id;
      if (!subcategoriesByCategory.has(categoryId)) {
        subcategoriesByCategory.set(categoryId, []);
      }
      subcategoriesByCategory.get(categoryId).push({
        ...subcat,
        category: categoryMap.get(categoryId)?.category || 'unknown'
      });
    });

    for (const subcity of subcities) {
      const subcityData = subcityMap.get(subcity.id);
      const cityData = cityMap.get(subcity.city_id);
      const countryData = countryMap.get(cityData?.country_id);
      if (!countryData || !cityData || !subcityData) continue;

      const countrySlug = slugify(countryData.country);
      const citySlug = slugify(cityData.city);
      const subcitySlug = slugify(subcityData.subcity);
      const locationPath = `${countrySlug}/${citySlug}/${subcitySlug}`;

      for (const category of categories) {
        const categorySlug = slugify(category.category);
        const categorySubcats = subcategoriesByCategory.get(category.id) || [];
        for (const subcat of categorySubcats) {
          const subcatSlug = slugify(subcat.subcategory);
          const matchingPosts = postList.filter(post =>
            +post.country_id === +countryData.id &&
            +post.city_id === +cityData.id &&
            +post.subcity_id === +subcity.id &&
            +post.category_id === +category.id &&
            +post.subcategory_id === +subcat.id
          );
          for (const post of matchingPosts) {
            const titleSlug = slugify(sanitizeXSSInput(post.title));
            urls.add(`/${locationPath}/${categorySlug}/${subcatSlug}/post-view/${titleSlug}/${post.id}.html`);
          }
        }
      }
    }

    const responseData = {
      total_urls: urls.size,
      generation_time: `${(Date.now() - startTime) / 1000} seconds`,
      urls: Array.from(urls),
      pagination: {
        currentPage: page,
        totalPages,
        perPageLimit,
        totalPosts
      }
    };
    // Set Cache :::::::::
    await setCache(cacheKey, responseData, cacheCondition, cacheTime);

    res.json(createSuccessResponse("Data retrieved successfully.", responseData));

  } catch (error) {
    console.error('Sitemap generation error:', error);
    next(error);
  }
};

const partnersSitemap = async (req, res, next) => {
  try {
    const urls = new Set();
    const startTime = Date.now();

    // Try to fetch from cache first
    const cacheKey = 'partners-sitemap';
    const cacheTime = 60 * 3600; // 1 hour in seconds
    const cacheCondition = {};
    const cachedPosts = await getCache(cacheKey, cacheCondition);
    if (cachedPosts) {
      return res.json(createSuccessResponse("Data retrieved successfully.", cachedPosts));
    }

    // Fetch site links with their categories
    const [siteLinks] = await Promise.all([
      executeQuery(`
        SELECT 
          site_link.id AS siteId, 
          site_link.title AS siteTitle,
          site_link.updated_at AS siteUpdatedAt,
          sites_link_category.id AS siteCategoryId,
          sites_link_category.category AS siteCategoryTitle
        FROM site_link
        INNER JOIN sites_link_category ON site_link.category_id = sites_link_category.id
        ORDER BY site_link.updated_at DESC;
      `),
    ]);

    // Group site links by category for efficient URL generation
    const siteLinksByCategory = new Map();
    for (const sl of siteLinks) {
      const categoryId = sl.siteCategoryId;

      const categoryTitle = slugify(sl.siteCategoryTitle); // URL-friendly category name
      const siteTitle = slugify(sl.siteTitle); // URL-friendly site title

      // Initialize category if not already present
      if (!siteLinksByCategory.has(categoryId)) {
        siteLinksByCategory.set(categoryId, {
          categoryTitle,
          sites: [],
        });
      }

      // Add site to category
      siteLinksByCategory.get(categoryId).sites.push({
        siteId: sl.siteId,
        siteTitle,
      });
    }

    // Generate URLs
    for (const [categoryId, { categoryTitle, sites }] of siteLinksByCategory.entries()) {
      // Add Partner Category URL (e.g., /partners/category-name)
      const categoryUrl = `/partners/${categoryTitle}`;
      urls.add(categoryUrl);

      // Add Partner Category's Site URLs (e.g., /partners/category-name/site-title)
      for (const { siteTitle } of sites) {
        const siteUrl = `/partners/${categoryTitle}/${siteTitle}`;
        urls.add(siteUrl);
      }
    }

    const responseData = {
      total_urls: urls.size,
      generation_time: `${((Date.now() - startTime) / 1000).toFixed(2)} seconds`,
      urls: Array.from(urls),
    };

    // Set cache
    await setCache(cacheKey, responseData, cacheCondition, cacheTime);

    return res.json(createSuccessResponse("Data retrieved successfully.", responseData));
  } catch (error) {
    console.error('Partners Sitemap generation error:', error);
    next(error);
  }
};
module.exports = { contactSeo, contact, aboutSeo, about, termsSeo, terms, commonSettings, categoriesSitemap, postsSitemap, partnersSitemap };
