const { executeQuery } = require('../../utils/dbUtils');
const { createSuccessResponse, createErrorResponse } = require('../../utils/responseUtils');
const { getHeaderMetaData } = require('../../utils/metaUtils');
const { ucwords, fileExists } = require('../../utils/generalUtils');
const { getSettingsData, getCountryDetail, getCityDetail, getSubCityDetail, getSubCityContent, getSponsersListWithHeading, getPageMetaData, getTableRecord } = require("../../services/common.service");
const { META_PAGES } = require('../../constants');


const getCategorySeo = async (req, res, next) => {
  try {
    // Extracting parameters from the URL
    const { country, city, subCity } = req.params;

    const [locationDetail, settings] = await Promise.all([
      getTableRecord("SELECT country.id AS countryId, country.country, city.id AS cityId, city.city, subcity.id AS subCityId, subcity.subcity FROM subcity LEFT JOIN city ON subcity.city = city.id LEFT JOIN country ON subcity.country = country.id WHERE subcity.subcity = ? AND city.city = ? AND country.country = ?;", [subCity, city, country], true),
      getSettingsData()
    ]);

    const site_name = settings?.site_name || 'localxlist';
    let customTitle = `Choose a category | ${ucwords(locationDetail?.subcity)} | ${site_name}`;
    let customDescription = `Choose a category | ${ucwords(locationDetail?.subcity)} | ${site_name}`;

    let logo_img = 'backend/images/settings/header_logo_15477661460.png';
    if (settings?.header_logo_path && fileExists(settings.header_logo_path)) {
      logo_img = `${req.appBaseUrl}/uploads/${settings.header_logo_path}`;
    } else {
      logo_img = `${req.appBaseUrl}/uploads/${logo_img}`;
    }

    // Fetch From Page Based Meta Data
    let singlePageMeta = await getTableRecord(
      'SELECT * FROM page_meta WHERE page_type = ? AND is_default = ? AND country_id = ? AND city_id = ? AND subcity_id = ? LIMIT 1;',
      [META_PAGES.CATEGORIES, 0, locationDetail?.countryId, locationDetail?.cityId, locationDetail?.subCityId],
      true,
    );

    if (!singlePageMeta) {
      singlePageMeta = await getTableRecord(
        'SELECT * FROM page_meta WHERE page_type = ? AND is_default = ? LIMIT 1;',
        [META_PAGES.CATEGORIES, 1],
        true,
      );
    }

    const pageMetaDataV = singlePageMeta;
    const pageMetaData = Object.fromEntries(Object.entries(pageMetaDataV || {}).map(([k, v]) => [k, typeof v === 'string' ? v.replace(/{{country}}/g, locationDetail?.country).replace(/{{city}}/g, locationDetail?.city).replace(/{{subcity}}/g, locationDetail?.subcity) : v]));

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
    const responseData = createSuccessResponse("Data retrieved successfully.", headers);
    res.json(responseData);
  } catch (error) {
    // Pass the error to the error handler middleware
    next(error);
  }
};

const getCategoryPostAdsList = async (req, res, next) => {
  try {

    // Fetch Category Post Ads data
    const categoryPostAds = await executeQuery('SELECT id, target_url, target_blank, path FROM cat_post_ads WHERE ads_type = ? AND active_yn = ?', ["category", "Y"]);

    // Handle image 
    const allAds = await Promise.all(categoryPostAds.map((ads) => {
      const adsImg = ads?.path && fileExists(ads?.path || "");
      return {
        ...ads,
        path: adsImg && `${req.appBaseUrl}/uploads/${ads.path}` || ""
      };
    }));
    // Send response
    res.json(createSuccessResponse("Data retrieved successfully.", allAds));
  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const getAllCategorySubCategoryList = async (req, res, next) => {
  try {
    // Extracting parameters from the URL
    const { country, city, subCity } = req.params;

    // Check if parameters are provided
    if (!country || !city || !subCity) {
      return res.status(404).json(createErrorResponse("No Content found."));
    }

    const countryDetail = await getCountryDetail(country);
    if (!countryDetail) {
      return res.status(404).json(createErrorResponse("No Country found."));
    }

    const cityDetail = await getCityDetail(city, countryDetail?.id);
    if (!cityDetail) {
      return res.status(404).json(createErrorResponse("No City found."));
    }

    const subCityDetail = await getSubCityDetail(subCity, cityDetail?.id);
    if (!subCityDetail) {
      return res.status(404).json(createErrorResponse("No SubCity found."));
    }

    const subcityContent = await getSubCityContent(subCityDetail?.id);

    // Fetch category data
    const categories = await executeQuery('SELECT * FROM category ORDER BY id DESC');

    const categoriesWithSubcategories = await Promise.all(categories.map(async (category) => {
      // Fetch Site Links for the current category
      const subcategories = await Promise.all((await executeQuery(`SELECT * FROM subcategory WHERE category = ? ORDER BY id ASC`, [category.id])));
      return {
        ...category,
        subcategories,
      };
    }));


    // Prepare response data
    const responseData = {
      list: categoriesWithSubcategories || [],
      subcityContent
    };

    // Send response
    res.json(createSuccessResponse("Data retrieved successfully.", responseData));
  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const getCategoryAgeVerificationModalContent = async (req, res, next) => {
  try {

    // Fetch Age Verification Modal Content
    const ageVerificationRulesModalData = {
      title: "Age verification & content rules",
      content: `<p>
            This section may contain adult oriented material of a graphic and
            sexual nature, and could be viewed objectionable to some persons.
            This material is <strong> INTENDED ONLY FOR PERSONS OVER 18 YEARS OF AGE.</strong> If
            you are accessing this area from any location that deems this type
            of material to be inappropriate, you should not proceed.
          </p>
          <p>
            By agreeing / proceeding you certify that you&apos;ve read our
            <Link to="/terms-and-conditions"> terms </Link> and agree to
            fully abide by them. You also understand that <strong> NO SEX WORK OR DRUG SELLING IS TOLERATED ON THIS SITE,
            </strong> and you understand that we fully cooperate with law enforcement regarding these matters. This site uses cookies for logins, ads and  other normal site function.
          </p>`
    };

    // Send response
    res.json(createSuccessResponse("Data retrieved successfully.", ageVerificationRulesModalData));
  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const getCategoryTopSideNavLinks = async (req, res, next) => {
  try {

    // Fetch Top Side Navigation List
    const topSideNavLinks = await executeQuery('SELECT * FROM link_list');
    // const topSideNavLinks = [{
    //   url:"https://google.com",
    //   text:"Google"
    // }];
    // Send response
    res.json(createSuccessResponse("Data retrieved successfully.", topSideNavLinks));
  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const getCategorySponsers = async (req, res, next) => {
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

module.exports = { getCategorySeo, getCategoryPostAdsList, getCategoryAgeVerificationModalContent, getCategoryTopSideNavLinks, getAllCategorySubCategoryList, getCategorySponsers };
