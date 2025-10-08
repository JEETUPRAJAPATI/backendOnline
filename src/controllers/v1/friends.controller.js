const { createSuccessResponse } = require('../../utils/responseUtils');
const { getHeaderMetaData } = require('../../utils/metaUtils');
const { getSettingsData, getFriendsList, getFriendsAds, getPageMetaData } = require("../../services/common.service");
const { fileExists } = require('../../utils/generalUtils');
const { META_PAGES } = require('../../constants');

const getFriendsSeo = async (req, res, next) => {
  try {
    const settings = await getSettingsData();

    let logo_img = 'backend/images/settings/header_logo_15477661460.png';
    if (settings?.header_logo_path && fileExists(settings.header_logo_path)) {
      logo_img = `${req.appBaseUrl}/uploads/${settings.header_logo_path}`;
    } else {
      logo_img = `${req.appBaseUrl}/uploads/${logo_img}`;
    }

    const site_name = settings?.site_name || 'localxlist';
    const pageMetaData = await getPageMetaData(META_PAGES.FRIENDS);
    // Generate headers using the metadata utility
    const header_data = {
      title: pageMetaData?.title || `Friends | ${site_name}`,
      description: pageMetaData?.description || `Friends | ${site_name}`,
      keywords: pageMetaData?.keywords || `Friends | ${site_name}`,
      robots: pageMetaData?.robots || "",
      ogTitle: pageMetaData?.og_title || `Friends | ${site_name}`,
      ogDescription: pageMetaData?.og_description || `Friends | ${site_name}`,
      ogImage: pageMetaData?.og_image || logo_img || '',
      ogImageHeight: pageMetaData?.og_image_height || '377',
      ogImageWidth: pageMetaData?.og_image_width || '',
      ogSiteName: pageMetaData?.og_site_name || 'localxlist.org',
      ogType: pageMetaData?.og_type || 'localxlist.org',
      ogUrl: pageMetaData?.og_url || 'https://localxlist.org/',

      twitterTitle: pageMetaData?.twitter_title || `Friends | ${site_name}`,
      twitterDescription: pageMetaData?.twitter_description || `Friends | ${site_name}`,
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

const getFriends = async (req, res, next) => {
  try {
    const data = await getFriendsList(req);
    const responseData = createSuccessResponse("Data retrieved successfully.", data);
    res.json(responseData);
  } catch (error) {
    // Pass the error to the error handler middleware
    next(error);
  }
};

const getFriendsAdsList = async (req, res, next) => {
  try {
    const data = await getFriendsAds();
    const responseData = createSuccessResponse("Data retrieved successfully.", data);
    res.json(responseData);
  } catch (error) {
    // Pass the error to the error handler middleware
    next(error);
  }
};


module.exports = { getFriendsSeo, getFriends, getFriendsAdsList };
