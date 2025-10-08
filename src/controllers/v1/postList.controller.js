const { executeQuery } = require('../../utils/dbUtils');
const { createSuccessResponse, createErrorResponse } = require('../../utils/responseUtils');
const { getHeaderMetaData } = require('../../utils/metaUtils');
const { formattedDate, fileExists } = require('../../utils/generalUtils');
const { LIMIT, META_PAGES } = require("../../constants");
const { getSettingsData, getCountryDetail, getCityDetail, getSubCityDetail, getSubCategoryDetail, getAlertMessage, getSubCityContent, getSponsersListWithHeading, getCategoryDetail, getSubCategoryContentDetail, getSliderAds, getPosts, getSinglePostImage, getPostAds, getNewPostAds, getGoogleAds, getSubCityList, getCategoryList, getSubCategoryList, getCategoryPostAds, updateNewPostAdsClickCount, getTableRecord, getPageMetaData } = require("../../services/common.service");
const { setCache, getCache } = require('../../utils/cache');


const getPostSeo = async (req, res, next) => {
  try {
    const {
      country,
      city,
      subCity,
      category,
      subCategory
    } = req.query;

    // Check if required parameters are provided
    if (!country || !city || !subCity || !category || !subCategory) {
      return res.status(400).json(createErrorResponse("Missing required parameters."));
    }

    const [locationDetail, categoryDetail, settings] = await Promise.all([
      getTableRecord("SELECT country.id AS countryId, country.country, city.id AS cityId, city.city, subcity.id AS subCityId, subcity.subcity FROM subcity LEFT JOIN city ON subcity.city = city.id LEFT JOIN country ON subcity.country = country.id WHERE subcity.subcity = ? AND city.city = ? AND country.country = ?;", [subCity, city, country], true),
      getTableRecord("SELECT category.id AS categoryId, category.category, subcategory.id AS subCategoryId, subcategory.subcategory FROM subcategory LEFT JOIN category ON subcategory.category = category.id WHERE subcategory.subcategory = ? AND category.category = ?;", [subCategory, category], true),
      getSettingsData()
    ]);

    const site_name = settings?.site_name || 'localxlist';
    let customTitle = `${categoryDetail.subcategory} | ${locationDetail.subcity} | ${site_name}`;
    let customDescription = `${categoryDetail.subcategory} | ${locationDetail.subcity} | ${site_name}`;

    let logo_img = 'backend/images/settings/header_logo_15477661460.png';
    if (settings?.header_logo_path && fileExists(settings.header_logo_path)) {
      logo_img = `${req.appBaseUrl}/uploads/${settings.header_logo_path}`;
    } else {
      logo_img = `${req.appBaseUrl}/uploads/${logo_img}`;
    }

    // Fetch From Page Based Meta Data
    let singlePageMeta = await getTableRecord(
      'SELECT * FROM page_meta WHERE page_type = ? AND is_default = ? AND country_id = ? AND city_id = ? AND subcity_id = ? AND category_id = ? AND subcategory_id = ? LIMIT 1;',
      [META_PAGES.POSTS, 0, locationDetail?.countryId, locationDetail?.cityId, locationDetail?.subCityId, categoryDetail?.categoryId, categoryDetail?.subCategoryId],
      true,
    );

    if (!singlePageMeta) {
      singlePageMeta = await getTableRecord(
        'SELECT * FROM page_meta WHERE page_type = ? AND is_default = ? LIMIT 1;',
        [META_PAGES.POSTS, 1],
        true,
      );
    }

    const pageMetaDataV = singlePageMeta;
    const pageMetaData = Object.fromEntries(Object.entries(pageMetaDataV || {}).map(([k, v]) => [k, typeof v === 'string' ? v.replace(/{{country}}/g, locationDetail?.country).replace(/{{city}}/g, locationDetail?.city).replace(/{{subcity}}/g, locationDetail?.subcity).replace(/{{category}}/g, categoryDetail?.category).replace(/{{subcategory}}/g, categoryDetail?.subcategory) : v]));

    // Generate headers using the metadata utility
    const header_data = {
      title: pageMetaData?.title || customTitle,
      description: pageMetaData?.description || customDescription,
      keywords: pageMetaData?.keywords || customTitle,
      robots: pageMetaData?.robots || "",
      ogTitle: pageMetaData?.og_title || customTitle,
      ogDescription: pageMetaData?.og_description || customDescription,
      ogImage: pageMetaData?.og_image || logo_img || '',
      ogImageHeight: pageMetaData?.og_image_height || '377',
      ogImageWidth: pageMetaData?.og_image_width || '',
      ogSiteName: pageMetaData?.og_site_name || 'localxlist.org',
      ogType: pageMetaData?.og_type || 'localxlist.org',
      ogUrl: pageMetaData?.og_url || 'https://localxlist.org/',

      twitterTitle: pageMetaData?.twitter_title || customTitle,
      twitterDescription: pageMetaData?.twitter_description || customDescription,
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

const getPostAlertMsg = async (req, res, next) => {
  try {

    const alertMessageDetail = await getAlertMessage();
    res.json(createSuccessResponse("Data retrieved successfully.", alertMessageDetail?.msg || ""));

  } catch (error) {
    next(error);
  }
};

const getPostList = async (req, res, next) => {
  try {
    const {
      country,
      city,
      subCity,
      category,
      subCategory,
      page = 1,
      searchKeyword = ''
    } = req.query;

    // Check if required parameters are provided
    if (!country || !city || !subCity || !category || !subCategory) {
      return res.status(400).json(createErrorResponse("Missing required parameters."));
    }

    // Try to fetch from cache first
    const cacheKey = 'post';
    const cacheTime = 60; // Second
    const cacheCondition = {
      country,
      city,
      subCity,
      category,
      subCategory,
      page,
      searchKeyword
    };
    const cachedPosts = await getCache(cacheKey, cacheCondition);
    if (cachedPosts) {
      return res.json(createSuccessResponse("Data retrieved successfully.", cachedPosts)); // If cached data exists, return it
    }

    const countryDetail = await getCountryDetail(country);
    const cityDetail = await getCityDetail(city, countryDetail?.id);
    const subCityDetail = await getSubCityDetail(subCity, cityDetail?.id);
    const categoryDetail = await getCategoryDetail(category);
    const subCategoryDetail = await getSubCategoryDetail(subCategory);
    const settings = await getSettingsData();

    // Pagination and post fetching
    const perPageLimit = LIMIT.POST || 10;
    const offset = (page - 1) * perPageLimit;
    const searchCondition = searchKeyword ? `AND (title LIKE ? OR description LIKE ?)` : '';
    const searchParams = searchKeyword ? [`%${searchKeyword}%`, `%${searchKeyword}%`] : [];

    const wherePostCondition = `WHERE status = 1 AND (post_delete_date IS NULL OR post_delete_date >= NOW()) AND country_id = ${countryDetail?.id} AND city_id = ${cityDetail?.id} AND subcity_id = ${subCityDetail?.id} AND category_id = ${categoryDetail?.id} AND subcategory_id = ${subCategoryDetail?.id} ${searchCondition}`;
    // const wherePostCondition = `WHERE status = 1 ${searchCondition}`; 

    // Fetch total post count for pagination
    const totalPostCount = await executeQuery(
      `SELECT COUNT(id) AS total_post FROM post ${wherePostCondition}`,
      searchParams
    );
    const totalPosts = totalPostCount[0]?.total_post || 0;
    const totalPages = Math.ceil(totalPosts / perPageLimit);

    // Fetch posts and ads in parallel
    const [postList, newPostAdsList, postOrGoogleAds] = await Promise.all([
      getPosts(wherePostCondition, searchParams, perPageLimit, offset),
      getNewPostAds(LIMIT.POST, offset),
      settings?.current_ad === 'google' ? getGoogleAds(LIMIT.POST, offset) : getPostAds(LIMIT.POST, offset),
    ]);

    const newPostAdsArray = newPostAdsList.map((newPostAds) => ({
      ...newPostAds,
      postDate: formattedDate(newPostAds.created_at, 'MMM-dd'),
      postAdsType: "newPostAds",
    }));

    const postOrGoogleAdsArray = postOrGoogleAds.map((ads) => ({
      ...ads,
      postDate: formattedDate(ads.created_at, 'MMM-dd'),
      postAdsType: settings.current_ad === 'google' ? "googleAds" : "postAds",
      thumbnail: ads.path && fileExists(ads?.path || "") ? `${req.appBaseUrl}/uploads/${ads.path}` : `${req.appBaseUrl}/uploads/frontend/images/no-image.png`,
    }));

    // Handle image fetching for posts
    const uniqueImgIds = [...new Set(postList.map(post => post.img_id))].filter(id => id); // Get unique img_id values
    let imageDataMap = {};
    if (uniqueImgIds.length > 0) {
      const placeholders = uniqueImgIds.map(() => '?').join(','); // Generate `?, ?, ?` placeholders
      const query = `SELECT img_id, path, CONCAT(?, path) AS fullpath FROM post_img_table WHERE img_id IN (${placeholders}) ORDER BY id ASC`;
      const images = await executeQuery(query, [req.appBaseUrl + '/uploads/', ...uniqueImgIds]);
      // Map images to their corresponding img_id
      imageDataMap = images.reduce((acc, img) => {
        acc[img.img_id] = img; // Store single record for each img_id
        return acc;
      }, {});
    }

    const allPosts = await Promise.all(postList.map(async (post) => {
      // const singlePostImage = await getSinglePostImage(req, post.img_id);
      const singlePostImage = imageDataMap[post.img_id] || { path: '', fullpath: '' }; // Get image data or default
      const postImg = singlePostImage?.path && fileExists(singlePostImage?.path || "");
      return {
        ...post,
        postDate: formattedDate(post.date, 'MMM-dd'),
        thumbnail: postImg ? singlePostImage?.fullpath : `${req.appBaseUrl}/uploads/frontend/images/no-image.png`,
        hasImg: singlePostImage ? 'Img' : 'No Img',
        city,
        subCity,
        postAdsType: post.featured_post === 1 ? "featuredPostAds" : "",
      };
    }));

    //:::::::::::: Logic to place new ads, post ads, and google ads ::::::::::::
    // Insert new post ads at specified positions
    newPostAdsArray.forEach(newPostAds => {
      if (newPostAds.position <= allPosts.length) {
        allPosts.splice(newPostAds.position - 1, 0, newPostAds);
      }
    });

    // Insert post or google ads for every 10th index
    postOrGoogleAdsArray.forEach((postOrGoogleAd, index) => {
      const insertPosition = (index + 1) * 10 - 1;
      if (insertPosition < allPosts.length) {
        if (allPosts[insertPosition]?.postAdsType === "newPostAds") {
          allPosts.splice(insertPosition + 1, 0, postOrGoogleAd);
        } else {
          allPosts.splice(insertPosition, 0, postOrGoogleAd);
        }
      }
    });

    // Send response
    const responseData = {
      list: allPosts,
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
    next(error); // Pass the error to the error handler middleware
  }
};

const getPostTypeAdsList = async (req, res, next) => {
  try {

    const postTypeAds = await getCategoryPostAds(req, 'post');
    res.json(createSuccessResponse("Data retrieved successfully.", postTypeAds));

  } catch (error) {
    next(error);
  }
};

const getPostLeftAds = async (req, res, next) => {
  try {

    const leftSliderAds = await getSliderAds(req);
    res.json(createSuccessResponse("Data retrieved successfully.", leftSliderAds));

  } catch (error) {
    next(error);
  }
};

const getPostRightAds = async (req, res, next) => {
  try {

    const rightSliderAds = await getSliderAds(req, 'right');
    res.json(createSuccessResponse("Data retrieved successfully.", rightSliderAds));

  } catch (error) {
    next(error);
  }
};

const getPostSubCategoryContent = async (req, res, next) => {
  try {
    const {
      country,
      city,
      subCity,
      category,
      subCategory
    } = req.query;

    // Check if required parameters are provided
    if (!country || !city || !subCity || !category || !subCategory) {
      return res.status(400).json(createErrorResponse("Missing required parameters."));
    }

    const countryDetail = await getCountryDetail(country);
    const cityDetail = await getCityDetail(city, countryDetail?.id);
    const subCityDetail = await getSubCityDetail(subCity, cityDetail?.id);
    const subCategoryDetail = await getSubCategoryDetail(subCategory);

    const subCategoryContent = await getSubCategoryContentDetail(subCategoryDetail?.id, subCityDetail?.id);
    res.json(createSuccessResponse("Data retrieved successfully.", subCategoryContent.content || ""));

  } catch (error) {
    next(error);
  }
};

const getPostLeftSideFilters = async (req, res, next) => {
  try {
    const {
      country,
      city,
      subCity,
      category,
      subCategory,
    } = req.query;

    // Check if required parameters are provided
    if (!country || !city || !subCity || !category || !subCategory) {
      return res.status(400).json(createErrorResponse("Missing required parameters."));
    }

    const countryDetail = await getCountryDetail(country);
    const cityDetail = await getCityDetail(city, countryDetail?.id);
    const subCityDetail = await getSubCityDetail(subCity, cityDetail?.id);

    const categoryDetail = await getCategoryDetail(category);
    const subCategoryDetail = await getSubCategoryDetail(subCategory);

    const categories = await getCategoryList();
    const subCategories = await getSubCategoryList(categoryDetail?.id);
    const subCities = await getSubCityList(countryDetail?.id, cityDetail?.id);


    // Prepare response data
    const responseData = {
      countryDetail,
      cityDetail,
      subCityDetail,
      categoryDetail,
      subCategoryDetail,
      subCities: subCities,
      categories: categories,
      subCategories: subCategories,
    };

    // Send response
    res.json(createSuccessResponse("Data retrieved successfully.", responseData));

  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const getSubCategories = async (req, res, next) => {
  try {
    // Extracting parameters from the URL
    const { category } = req.query;

    // Check if parameters are provided
    if (!category) {
      return res.status(404).json(createErrorResponse("No Content found."));
    }

    // Fetch category data
    const categoryData = await executeQuery('SELECT id FROM category WHERE id = ?', [category]);
    if (!categoryData.length) {
      return res.status(404).json(createErrorResponse("No Category found."));
    }
    const singleCategoryData = categoryData[0] || {};


    // Fetch Sub Category data
    const subCategories = await getSubCategoryList(singleCategoryData?.id);
    if (!subCategories.length) {
      return res.status(404).json(createErrorResponse("No Sub Category found."));
    }

    // Send response
    res.json(createSuccessResponse("Data retrieved successfully.", subCategories));
  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const updatePostAdsClickCount = async (req, res, next) => {
  try {
    const {
      postId
    } = req.params;

    // Check if required parameters are provided
    if (!postId) {
      return res.status(400).json(createErrorResponse("Missing required parameters."));
    }
    const { message, data } = await updateNewPostAdsClickCount(postId);
    res.json(createSuccessResponse(message, data));

  } catch (error) {
    next(error);
  }
};

module.exports = { getPostSeo, getPostAlertMsg, getPostList, getPostLeftSideFilters, getPostTypeAdsList, getPostLeftAds, getPostRightAds, getSubCategories, getPostSubCategoryContent, updatePostAdsClickCount };
