const { executeQuery } = require('../../utils/dbUtils');
const { createSuccessResponse } = require('../../utils/responseUtils');
const { getHeaderMetaData } = require('../../utils/metaUtils');
const { getHomeDashboardData, getSettingsData, getHomeTopNoticeData, getHomePartnersList, getSponsersListWithHeading, updateSiteVisitorCounter, getPageMetaData } = require("../../services/common.service");
const { fileExists } = require('../../utils/generalUtils');
const { setCache, getCache } = require('../../utils/cache');
const { META_PAGES, LIMIT } = require('../../constants');

const getHomeSeo = async (req, res, next) => {
  try {
    const settings = await getSettingsData();
    let logo_img = 'backend/images/settings/header_logo_15477661460.png';
    if (settings?.header_logo_path && fileExists(settings.header_logo_path)) {
      logo_img = `${req.appBaseUrl}/uploads/${settings.header_logo_path}`;
    } else {
      logo_img = `${req.appBaseUrl}/uploads/${logo_img}`;
    }

    const site_name = settings?.site_name || 'localxlist';

    const pageMetaData = await getPageMetaData(META_PAGES.HOME);
    // Generate headers using the metadata utility
    const header_data = {
      title: pageMetaData?.title || `Find Male and Female Escorts Online - Casual Dating | ${site_name}`,
      description: pageMetaData?.description || `Cities | ${site_name}`,
      keywords: pageMetaData?.keywords || "backpage alternatives,backpage replacement,cityxguide alternatives,skipthegames,doublelist,backpage,Casual Dating Site Online,Female Escorts Online,Find Male Escorts Online,Platonic Dating,Birmingham Escorts,Birmingham Female Escorts,Chicago Female Escorts,Las Vegas Female Escorts,Find Female Escorts,Charlottesville Escorts,Iowa Female Escorts,Escort Girls Houston Tx,Charlotte Nc Female Escorts,Female Escorts Denver,Washington Female Escorts,local escorts,escort sites,escort website,cheap escorts,escort list",
      robots: pageMetaData?.robots || "",
      ogTitle: pageMetaData?.og_title || `Find Male and Female Escorts Online - Casual Dating | ${site_name}`,
      ogDescription: pageMetaData?.og_description || 'Localxlist.org is a Free casual dating and personal classified website. female escorts,male escorts,women for men,female massage services etc available here',
      ogImage: pageMetaData?.og_image || logo_img || '',
      ogImageHeight: pageMetaData?.og_image_height || '377',
      ogImageWidth: pageMetaData?.og_image_width || '',
      ogSiteName: pageMetaData?.og_site_name || 'localxlist.org',
      ogType: pageMetaData?.og_type || 'localxlist.org',
      ogUrl: pageMetaData?.og_url || 'https://localxlist.org/',

      twitterTitle: pageMetaData?.twitter_title || `Find Male and Female Escorts Online - Casual Dating | ${site_name}`,
      twitterDescription: pageMetaData?.twitter_description || 'Localxlist.org is a Free casual dating and personal classified website. female escorts,male escorts,women for men,female massage services etc available here',
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
    const responseData = createSuccessResponse("Data retrieved successfully.", headers);
    res.json(responseData);
  } catch (error) {
    // Pass the error to the error handler middleware
    next(error);
  }
};

const getHomeTopNotice = async (req, res, next) => {
  try {
    const data = await getHomeTopNoticeData();
    const responseData = createSuccessResponse("Data retrieved successfully.", data);
    res.json(responseData);
  } catch (error) {
    // Pass the error to the error handler middleware
    next(error);
  }
};

const getHomeDashboardContent = async (req, res, next) => {
  try {
    const data = await getHomeDashboardData();
    const responseData = createSuccessResponse("Data retrieved successfully.", data);
    res.json(responseData);
  } catch (error) {
    // Pass the error to the error handler middleware
    next(error);
  }
};


const getHomeCountries = async (req, res, next) => {
  try {

    // Try to fetch from cache first
    const cacheKey = 'homeCountries';
    const cacheTime = 180; // 180 Seconds
    const cacheCondition = {
      ip: req.ip
    };
    const cachedPosts = await getCache(cacheKey, cacheCondition);
    if (cachedPosts) {
      return res.json(createSuccessResponse("Data retrieved successfully.", cachedPosts)); // If cached data exists, return it
    }


    // Execute all queries concurrently using Promise.all
    const [allCountries, allCities, allSubcities] = await Promise.all([
      executeQuery('SELECT * FROM country ORDER BY id ASC'),
      executeQuery('SELECT * FROM city'),
      executeQuery('SELECT * FROM subcity'),
    ]);

    // Create a map for quick lookups of cities and subcities by country and city ids
    const citiesByCountry = allCities.reduce((acc, city) => {
      if (!acc[city.country]) {
        acc[city.country] = [];
      }
      acc[city.country].push(city);
      return acc;
    }, {});

    const subcitiesByCity = allSubcities.reduce((acc, subcity) => {
      if (!acc[subcity.city]) {
        acc[subcity.city] = [];
      }
      acc[subcity.city].push(subcity);
      return acc;
    }, {});

    // Process countries and add cities and subcities from the maps
    const countries = allCountries.map(country => {
      const cities = citiesByCountry[country.id] || [];
      const citiesWithSubcities = cities.map(city => ({
        ...city,
        subcities: subcitiesByCity[city.id] || [],
      }));

      return {
        ...country,
        cities: citiesWithSubcities,
      };
    });

    // Update Home Page Visitor
    updateSiteVisitorCounter(req);

    // Set Cache :::::::::
    await setCache(cacheKey, countries, cacheCondition, cacheTime);

    res.json(createSuccessResponse("Data retrieved successfully.", countries));
  } catch (error) {
    // Pass the error to the error handler middleware
    next(error);
  }
};


const getHomePartners = async (req, res, next) => {
  try {

    // Try to fetch from cache first
    const cacheKey = 'homePartners';
    const cacheTime = 180; // 180 Seconds
    const cacheCondition = {
      ip: req.ip
    };
    const cachedPosts = await getCache(cacheKey, cacheCondition);
    if (cachedPosts) {
      return res.json(createSuccessResponse("Data retrieved successfully.", cachedPosts)); // If cached data exists, return it
    }

    const data = await getHomePartnersList(req);

    // Set Cache :::::::::
    await setCache(cacheKey, data, cacheCondition, cacheTime);

    res.json(createSuccessResponse("Data retrieved successfully.", data));
  } catch (error) {
    // Pass the error to the error handler middleware
    next(error);
  }
};

const getHomeSponsers = async (req, res, next) => {
  try {
    const {
      deviceWidth = ''
    } = req.query;

    const isDesktop = deviceWidth !== '' ? (deviceWidth > 768 ? true : false) : '';

    const data = await getSponsersListWithHeading(isDesktop);
    const responseData = createSuccessResponse("Data retrieved successfully.", data);
    res.json(responseData);
  } catch (error) {
    // Pass the error to the error handler middleware
    next(error);
  }
};


const getHomeCountriesV2 = async (req, res, next) => {
  try {

    // Main limits
    const COUNTRY_LIMIT = parseInt(req.query.countryLimit || LIMIT.HOME_COUNTRIES || 10, 10);
    const CITY_LIMIT = parseInt(req.query.cityLimit || LIMIT.HOME_CITIES || 10, 10);
    const SUBCITY_LIMIT = parseInt(req.query.subcityLimit || LIMIT.HOME_SUBCITIES || 10, 10);

    const countryPage = parseInt(req.query.countryPage || "1", 10);


    const cacheKey = 'homeCountries_subcityDriven';
    const cacheTime = 180;
    const cacheCondition = { ip: req.ip, countryPage };

    const cached = await getCache(cacheKey, cacheCondition);
    if (cached) {
      return res.json(createSuccessResponse("Data retrieved successfully.", cached));
    }


    // --------> 1. Fetch paginated countries
    const countryOffset = (countryPage - 1) * COUNTRY_LIMIT;
    const countryRows = await executeQuery(
      `SELECT id, country FROM country ORDER BY id ASC LIMIT ?, ?`,
      [countryOffset, COUNTRY_LIMIT]
    );
    const countryCountResult = await executeQuery(`SELECT COUNT(*) as total FROM country`);
    const totalCountries = countryCountResult[0]?.total || 0;
    const countryTotalPages = Math.ceil(totalCountries / COUNTRY_LIMIT);
    const hasMoreCountries = countryPage < countryTotalPages;

    // --------> 2. Fetch paginated cities per country
    // For all fetched countries
    const countryIds = countryRows.map(row => row.id);
    let cityRows = [];
    if (countryIds.length) {
      // Get the first X cities for each country
      cityRows = await executeQuery(
        `SELECT c.id as city_id, c.city, c.country as country_id
         FROM (
           SELECT id, city, country,
                  ROW_NUMBER() OVER (PARTITION BY country ORDER BY id ASC) as rn
           FROM city WHERE country IN ( ${countryIds.join(',')} )
         ) as c
         WHERE c.rn <= ?
         ORDER BY c.country, c.id`,
        [CITY_LIMIT]
      );
    }

    // --------> 3. Fetch total city counts for these countries
    let cityCountRows = [];
    if (countryIds.length) {
      cityCountRows = await executeQuery(
        `SELECT country, COUNT(*) as totalCities FROM city WHERE country IN (${countryIds.join(',')}) GROUP BY country`
      );
    }
    const countryCityCountMap = {};
    for (const { country, totalCities } of cityCountRows) {
      countryCityCountMap[country] = totalCities;
    }

    // --------> 4. Fetch subcities per city (limited)
    const cityIds = cityRows.map(row => row.city_id);
    let subcityRows = [];
    if (cityIds.length) {
      subcityRows = await executeQuery(
        `SELECT subcity_filtered.subcity_id, subcity_filtered.subcity, subcity_filtered.city AS city_id
         FROM (
           SELECT id as subcity_id, subcity, city,
                  ROW_NUMBER() OVER (PARTITION BY city ORDER BY id ASC) as rn
           FROM subcity WHERE city IN ( ${cityIds.join(',')} )
         ) as subcity_filtered
         WHERE subcity_filtered.rn <= ?
         ORDER BY subcity_filtered.city, subcity_filtered.subcity_id`,
        [SUBCITY_LIMIT]
      );
    }

    // --------> 5. Fetch subcity counts per city
    let subcityCounts = [];
    if (cityIds.length) {
      subcityCounts = await executeQuery(
        `SELECT city, COUNT(*) as totalSubcities FROM subcity WHERE city IN (${cityIds.join(',')}) GROUP BY city`
      );
    }
    const citySubcityCountMap = {};
    for (const { city, totalSubcities } of subcityCounts) {
      citySubcityCountMap[city] = totalSubcities;
    }

    // --------> 6. Construct nested structure with pagination per level
    const resultCountries = countryRows.map(country => {
      // Find cities for this country
      const cityList = cityRows
        .filter(row => Number(row.country_id) === Number(country.id))
        .map(city => {
          // Find subcities for this city
          const subcities = subcityRows
            .filter(s => Number(s.city_id) === Number(city.city_id))
            .map(s => ({
              id: s.subcity_id,
              subcity: s.subcity,
            }));

          const subcityTotal = citySubcityCountMap[city.city_id] || 0;
          const subCityTotalPages = Math.ceil(subcityTotal / SUBCITY_LIMIT);
          const hasMoreSubcities = subcityTotal > SUBCITY_LIMIT;
          return {
            countryId: country.id,
            id: city.city_id,
            city: city.city,
            subcities,
            hasMoreSubcities,
            subCityPagination: {
              totalPages: subCityTotalPages,
              currentPage: 1,
              nextPage: subCityTotalPages > 1 ? 2 : null,
            },
          };
        });

      const totalCities = countryCityCountMap[country.id] || 0;
      const cityTotalPages = Math.ceil(totalCities / CITY_LIMIT);
      const hasMoreCities = totalCities > CITY_LIMIT;

      return {
        id: country.id,
        country: country.country,
        cities: cityList,
        hasMoreCities,
        cityPagination: {
          totalPages: cityTotalPages,
          currentPage: 1,
          nextPage: cityTotalPages > 1 ? 2 : null,
        },
      };
    });

    // --------> 7. Add global country-level pagination
    const response = {
      list: resultCountries,
      hasMoreCountries,
      countryPagination: {
        totalPages: countryTotalPages,
        currentPage: countryPage,
        nextPage: hasMoreCountries ? countryPage + 1 : null,
      },
    };
    // Update visitor counter and set cache
    updateSiteVisitorCounter(req);
    await setCache(cacheKey, response, cacheCondition, cacheTime);

    return res.json(createSuccessResponse("Data retrieved successfully.", response));
  } catch (err) {
    next(err);
  }
};

// Load more countries (paginated)
const loadMoreCountries = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page || "1");
    const limit = parseInt(req.query.limit || "10");

    if (page < 1) {
      return res.status(400).json({ status: "error", message: "Invalid page number" });
    }

    const offset = (page - 1) * limit;

    // Fetch paginated countries
    const countries = await executeQuery(
      `SELECT id, country FROM country ORDER BY id ASC LIMIT ?, ?`,
      [offset, limit]
    );

    // Get total count
    const countResult = await executeQuery(`SELECT COUNT(*) AS total FROM country`);
    const totalCount = countResult[0]?.total || 0;
    const totalPages = Math.ceil(totalCount / limit);

    return res.json({
      status: "success",
      message: "Countries loaded successfully.",
      data: {
        list: countries,
        pagination: {
          totalPages,
          currentPage: page,
          nextPage: page < totalPages ? page + 1 : null,
        }
      }
    });
  } catch (err) {
    next(err);
  }
};


// Load more cities for a given country (paginated)
const loadMoreCities = async (req, res, next) => {
  try {
    // Parse limits and page params with fallback to LIMIT constants
    const CITY_LIMIT = parseInt(req.query.cityLimit || LIMIT.HOME_CITIES || 10, 10);
    const SUBCITY_LIMIT = parseInt(req.query.subcityLimit || LIMIT.HOME_SUBCITIES || 10, 10);
    const countryId = parseInt(req.query.countryId, 10);
    const page = parseInt(req.query.page || '1', 10);

    if (!countryId || isNaN(countryId) || countryId <= 0) {
      return res.status(400).json({ status: 'error', message: 'Invalid countryId' });
    }
    if (isNaN(page) || page < 1) {
      return res.status(400).json({ status: 'error', message: 'Invalid page number' });
    }

    const cacheKey = `homeCities_country_${countryId}_page_${page}_cityLimit_${CITY_LIMIT}_subcityLimit_${SUBCITY_LIMIT}`;
    const cacheTime = 180;
    const cacheCondition = { ip: req.ip, countryId, page, CITY_LIMIT, SUBCITY_LIMIT };

    const cached = await getCache(cacheKey, cacheCondition);
    if (cached) {
      return res.json(createSuccessResponse('Data retrieved successfully.', cached));
    }

    const offset = (page - 1) * CITY_LIMIT;

    // Fetch paginated cities
    const cities = await executeQuery(
      `SELECT id, city FROM city WHERE country = ? ORDER BY id ASC LIMIT ?, ?`,
      [countryId, offset, CITY_LIMIT]
    );

    const cityIds = cities.map(c => c.id);

    let subcities = [];
    if (cityIds.length) {
      const placeholders = cityIds.map(() => '?').join(',');
      // Fetch paginated subcities per city using ROW_NUMBER
      const query = `
        SELECT subcity_filtered.subcity_id, subcity_filtered.subcity, subcity_filtered.city AS city_id
        FROM (
          SELECT id AS subcity_id, subcity, city,
                 ROW_NUMBER() OVER (PARTITION BY city ORDER BY id ASC) AS rn
          FROM subcity WHERE city IN (${placeholders})
        ) AS subcity_filtered
        WHERE subcity_filtered.rn <= ?
        ORDER BY subcity_filtered.city, subcity_filtered.subcity_id`;

      subcities = await executeQuery(query, [...cityIds, SUBCITY_LIMIT]);
    }

    // Get subcity counts
    let subcityCounts = [];
    if (cityIds.length) {
      const placeholders = cityIds.map(() => '?').join(',');
      const query = `SELECT city, COUNT(*) AS totalSubcities FROM subcity WHERE city IN (${placeholders}) GROUP BY city`;
      subcityCounts = await executeQuery(query, cityIds);
    }

    const citySubcityCountMap = {};
    for (const { city, totalSubcities } of subcityCounts) {
      citySubcityCountMap[city] = totalSubcities;
    }

    // Attach subcities to each city
    const citiesWithSubcities = cities.map(city => {
      const subcityArr = subcities
        .filter(s => Number(s.city_id) === Number(city.id))
        .map(s => ({
          id: s.subcity_id,
          subcity: s.subcity,
        }));

      const totalSubcities = citySubcityCountMap[city.id] || 0;
      const totalPages = Math.ceil(totalSubcities / SUBCITY_LIMIT);
      const hasMoreSubcities = totalSubcities > SUBCITY_LIMIT;

      return {
        ...city,
        countryId,
        subcities: subcityArr,
        hasMoreSubcities,
        subCityPagination: {
          totalPages,
          currentPage: 1,
          nextPage: totalPages > 1 ? 2 : null,
        },
      };
    });

    // Get total cities count for pagination
    const countResult = await executeQuery(
      `SELECT COUNT(*) AS total FROM city WHERE country = ?`,
      [countryId]
    );
    const totalCount = countResult[0]?.total || 0;
    const totalPages = Math.ceil(totalCount / CITY_LIMIT);

    const responseData = {
      list: citiesWithSubcities,
      pagination: {
        totalPages,
        currentPage: page,
        nextPage: page < totalPages ? page + 1 : null,
      },
    };

    await setCache(cacheKey, responseData, cacheCondition, cacheTime);

    return res.json({
      status: 'success',
      message: 'Cities loaded successfully.',
      data: responseData,
    });
  } catch (err) {
    next(err);
  }
};


const loadMoreSubcities = async (req, res, next) => {
  try {
    const DEFAULT_SUBCITY_LIMIT = LIMIT.HOME_SUBCITIES || 10;
    const cityId = parseInt(req.query.cityId);
    const page = parseInt(req.query.page || "1");

    const limit = parseInt(req.query.subcityLimit || DEFAULT_SUBCITY_LIMIT, 10);

    if (!cityId || isNaN(cityId) || cityId <= 0) {
      return res.status(400).json({
        status: "error",
        message: "Invalid or missing cityId",
      });
    }

    if (page < 1) {
      return res.status(400).json({
        status: "error",
        message: "Invalid page number",
      });
    }

    // Get cache key and condition
    const cacheKey = `homeSubcities_city_${cityId}_page_${page}`;
    const cacheTime = 180;
    const cacheCondition = { ip: req.ip, cityId, page };

    // Check cache first
    const cached = await getCache(cacheKey, cacheCondition);
    if (cached) {
      return res.json(createSuccessResponse("Data retrieved successfully.", cached));
    }

    const offset = (page - 1) * limit;

    // Fetch paginated subcities
    const subcities = await executeQuery(
      `
      SELECT id, subcity
      FROM subcity
      WHERE city = ?
      ORDER BY id ASC
      LIMIT ?, ?
      `,
      [cityId, offset, limit]
    );

    // Get total count of subcities
    const countResult = await executeQuery(
      `SELECT COUNT(*) AS total FROM subcity WHERE city = ?`,
      [cityId]
    );

    const totalCount = countResult[0]?.total || 0;
    const totalPages = Math.ceil(totalCount / limit);

    // Set Response Data
    const responseData = {
      list: subcities,
      pagination: {
        totalPages,
        currentPage: page,
        nextPage: page < totalPages ? page + 1 : null,
      }
    };

    // Set Cache :::::::::
    await setCache(cacheKey, responseData, cacheCondition, cacheTime);

    return res.json({
      status: "success",
      message: "Subcities loaded successfully.",
      data: responseData
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getHomeSeo, getHomeCountries, getHomePartners, getHomeSponsers, getHomeTopNotice, getHomeDashboardContent, getHomeCountriesV2, loadMoreCountries, loadMoreCities, loadMoreSubcities };
