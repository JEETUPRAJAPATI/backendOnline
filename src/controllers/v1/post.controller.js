const { createSuccessResponse, createErrorResponse } = require('../../utils/responseUtils');
const { getHeaderMetaData } = require('../../utils/metaUtils');
const { formattedDate, getRelativeTime, sanitizeXSSInput, fileExists } = require('../../utils/generalUtils');
const { getSettingsData, getCountryDetail, getCityDetail, getSubCityDetail, getSubCategoryDetail, getCategoryDetail, getSinglePostImage, getPostWithPrevAndNext, getPostImages, updatePostVisitorCounter, getAds, makePostReport, getTableRecord } = require("../../services/common.service");
const { getCache, setCache } = require('../../utils/cache');
const { META_PAGES } = require('../../constants');

const getPostSeo = async (req, res, next) => {
  try {
    const {
      country,
      city,
      subCity,
      category,
      subCategory,
      postId
    } = req.params;

    // Check if required parameters are provided
    if (!country || !city || !subCity || !category || !subCategory || !postId) {
      return res.status(400).json(createErrorResponse("Missing required parameters."));
    }

    const [postDetail, settings] = await Promise.all([
      getTableRecord(`
        SELECT 
          post.id, 
          post.title, 
          post.description,
          post.img_id,
          country.id AS countryId, 
          country.country, 
          city.id AS cityId, 
          city.city, 
          subcity.id AS subCityId, 
          subcity.subcity,
          category.id AS categoryId, 
          category.category, 
          subcategory.id AS subCategoryId, 
          subcategory.subcategory
        FROM post 
          INNER JOIN subcity ON post.subcity_id = subcity.id 
          INNER JOIN city ON subcity.city = city.id
          INNER JOIN country ON subcity.country = country.id
          INNER JOIN subcategory ON post.subcategory_id = subcategory.id 
          INNER JOIN category ON subcategory.category = category.id
        WHERE post.id = ?  
          AND post.status = ? 
          AND subcity.subcity = ? 
          AND city.city = ? 
          AND country.country = ? 
          AND subcategory.subcategory = ? 
          AND category.category = ?;`
        , [postId, 1, subCity, city, country, subCategory, category], true),
      getSettingsData()
    ]);


    if (!postDetail) {
      return res.status(400).json(createErrorResponse("Post not found."));
    }

    // Get Post Single Image
    const postImage = await getSinglePostImage(req, postDetail?.img_id);
    const setPostImage = postImage?.path && fileExists(postImage?.path || "") && postImage?.fullpath || "";

    const site_name = settings?.site_name || 'localxlist';
    let customTitle = `${postDetail?.title} | ${site_name}`;
    let customDescription = `${postDetail?.description}`;

    let logo_img = 'backend/images/settings/header_logo_15477661460.png';
    if (settings?.header_logo_path && fileExists(settings.header_logo_path)) {
      logo_img = `${req.appBaseUrl}/uploads/${settings.header_logo_path}`;
    } else {
      logo_img = `${req.appBaseUrl}/uploads/${logo_img}`;
    }

    // Fetch From Page Based Meta Data
    let singlePageMeta = await getTableRecord(
      'SELECT * FROM page_meta WHERE page_type = ? AND is_default = ? AND country_id = ? AND city_id = ? AND subcity_id = ? AND category_id = ? AND subcategory_id = ? LIMIT 1;',
      [META_PAGES.POST_DETAIL, 0, postDetail?.countryId, postDetail?.cityId, postDetail?.subCityId, postDetail?.categoryId, postDetail?.subCategoryId],
      true,
    );

    if (!singlePageMeta) {
      singlePageMeta = await getTableRecord(
        'SELECT * FROM page_meta WHERE page_type = ? AND is_default = ? LIMIT 1;',
        [META_PAGES.POST_DETAIL, 1],
        true,
      );
    }

    const pageMetaDataV = singlePageMeta;
    const pageMetaData = Object.fromEntries(Object.entries(pageMetaDataV || {}).map(([k, v]) => [k, typeof v === 'string' ? v.replace(/{{country}}/g, postDetail?.country).replace(/{{city}}/g, postDetail?.city).replace(/{{subcity}}/g, postDetail?.subcity).replace(/{{category}}/g, postDetail?.category).replace(/{{subcategory}}/g, postDetail?.subcategory).replace(/{{title}}/g, postDetail?.title) : v]));

    // Generate headers using the metadata utility
    const header_data = {
      title: pageMetaData?.title || customTitle,
      description: pageMetaData?.description || customDescription,
      keywords: pageMetaData?.keywords || customTitle,
      robots: pageMetaData?.robots || "",

      ogTitle: pageMetaData?.og_title || customTitle,
      ogDescription: pageMetaData?.og_description || customDescription,
      ogImage: pageMetaData?.og_image || setPostImage || '',
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
      twitterImage: pageMetaData?.twitter_image || setPostImage || '',

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

const getPostDetail = async (req, res, next) => {
  try {
    const {
      country,
      city,
      subCity,
      category,
      subCategory,
      postId
    } = req.params;

    // Check if required parameters are provided
    if (!country || !city || !subCity || !category || !subCategory || !postId) {
      return res.status(400).json(createErrorResponse("Missing required parameters."));
    }

    // Try to fetch from cache first
    const cacheKey = 'postDetail';
    const cacheTime = 180; // Second
    const cacheCondition = {
      country,
      city,
      subCity,
      category,
      subCategory,
      postId,
      ip: req.ip
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

    const postWhereCondition = `WHERE status = 1 AND country_id = ${countryDetail?.id} AND city_id = ${cityDetail?.id} AND subcity_id = ${subCityDetail?.id} AND category_id = ${categoryDetail?.id} AND subcategory_id = ${subCategoryDetail?.id}`;
    const postDetail = await getPostWithPrevAndNext(postWhereCondition, postId);
    if (!postDetail) {
      return res.status(400).json(createErrorResponse("POST ALREADY EXPIRED OR DELETED", null, "POST_ALREADY_EXPIRED_OR_DELETED"));
    }

    // Format Post Date
    postDetail.formattedDate = formattedDate(postDetail?.date, 'yyyy-MM-dd HH:mm');
    postDetail.relativeTime = getRelativeTime(postDetail?.date);

    // Get Post All Images
    const postImages = await getPostImages(req, postDetail?.img_id);

    // Handle images
    const allPostImages = await Promise.all(postImages.map((image) => {
      const postImg = image?.path && fileExists(image?.path || "");
      return {
        ...image,
        path: postImg ? image?.fullpath : `${req.appBaseUrl}/uploads/frontend/images/no-image.png`,
      };
    }));

    postDetail.images = allPostImages;

    // Manage Visitor IPs
    await updatePostVisitorCounter(req, postDetail);

    // Set Cache :::::::::
    await setCache(cacheKey, postDetail, cacheCondition, cacheTime);

    res.json(createSuccessResponse("Data retrieved successfully.", postDetail));

  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const getPostDetailAds = async (req, res, next) => {
  try {
    const ads = await getAds(req);
    res.json(createSuccessResponse("Data retrieved successfully.", ads));
  } catch (error) {
    next(error);
  }
};

const addPostReport = async (req, res, next) => {
  try {
    const { post_id, email, description } = req.body;

    // Check if required parameters are provided
    if (!post_id || !email || !description) {
      return res.status(400).json(createErrorResponse("Missing required parameters."));
    }

    // Save report data
    const reportData = {
      date: new Date(),
      post_id: sanitizeXSSInput(post_id),
      email: sanitizeXSSInput(email),
      description: sanitizeXSSInput(description),
    };

    const { message, reportId } = await makePostReport(reportData);

    res.json(createSuccessResponse(message, reportId));

  } catch (error) {
    next(error);
  }
};

module.exports = { getPostSeo, getPostDetail, getPostDetailAds, addPostReport };
