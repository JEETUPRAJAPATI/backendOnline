const { executeQuery } = require('../../utils/dbUtils');
const { createSuccessResponse, createErrorResponse } = require('../../utils/responseUtils');
const { getHeaderMetaData } = require('../../utils/metaUtils');
const { getSettingsData, getSponsersListWithHeading, getPartnersList, getPartnerContentData, insertRecord, getTableRecord, getPartnersListByCategory, getPageMetaData } = require("../../services/common.service");
const { fileExists } = require('../../utils/generalUtils');
const { LIMIT, META_PAGES } = require('../../constants');

const getPartnerSeo = async (req, res, next) => {
  try {
    const settings = await getSettingsData();

    let logo_img = 'backend/images/settings/header_logo_15477661460.png';
    if (settings?.header_logo_path && fileExists(settings.header_logo_path)) {
      logo_img = `${req.appBaseUrl}/uploads/${settings.header_logo_path}`;
    } else {
      logo_img = `${req.appBaseUrl}/uploads/${logo_img}`;
    }

    const site_name = settings?.site_name || 'localxlist';
    const pageMetaData = await getPageMetaData(META_PAGES.PARTNER_CATEGORIES);
    // Generate headers using the metadata utility
    const header_data = {
      title: pageMetaData?.title || `Adult Directory | ${site_name}`,
      description: pageMetaData?.description || `Cities | ${site_name}`,
      keywords: pageMetaData?.keywords || `Adult Directory | ${site_name}`,
      robots: pageMetaData?.robots || "",
      ogTitle: pageMetaData?.og_title || `Adult Directory | ${site_name}`,
      ogDescription: pageMetaData?.og_description || `Adult Directory | ${site_name}`,
      ogImage: pageMetaData?.og_image || logo_img || '',
      ogImageHeight: pageMetaData?.og_image_height || '377',
      ogImageWidth: pageMetaData?.og_image_width || '',
      ogSiteName: pageMetaData?.og_site_name || 'localxlist.org',
      ogType: pageMetaData?.og_type || 'localxlist.org',
      ogUrl: pageMetaData?.og_url || 'https://localxlist.org/',

      twitterTitle: pageMetaData?.twitter_title || `Adult Directory | ${site_name}`,
      twitterDescription: pageMetaData?.twitter_description || `Adult Directory | ${site_name}`,
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

const getPartners = async (req, res, next) => {
  try {
    const data = await getPartnersList(req);
    const responseData = createSuccessResponse("Data retrieved successfully.", data);
    res.json(responseData);
  } catch (error) {
    // Pass the error to the error handler middleware
    next(error);
  }
};

const getPartnersSponsers = async (req, res, next) => {
  try {
    const data = await getSponsersListWithHeading();
    const responseData = createSuccessResponse("Data retrieved successfully.", data);
    res.json(responseData);
  } catch (error) {
    // Pass the error to the error handler middleware
    next(error);
  }
};

const getPartnersContent = async (req, res, next) => {
  try {
    const data = await getPartnerContentData();
    const responseData = createSuccessResponse("Data retrieved successfully.", data);
    res.json(responseData);
  } catch (error) {
    // Pass the error to the error handler middleware
    next(error);
  }
};

const getPartnerAddSeo = async (req, res, next) => {
  try {
    const settings = await getSettingsData();

    let logo_img = 'backend/images/settings/header_logo_15477661460.png';
    if (settings?.header_logo_path && fileExists(settings.header_logo_path)) {
      logo_img = `${req.appBaseUrl}/uploads/${settings.header_logo_path}`;
    } else {
      logo_img = `${req.appBaseUrl}/uploads/${logo_img}`;
    }

    // Generate headers using the metadata utility
    const header_data = {
      author: 'localxlist.org',
      title: `Submit Your Site, Add Porn Tube, Share | Localxlist`,
      description: 'Submit Your Site, Add Porn Tube, Share | Localxlist',
      keywords: "Submit Your Site, Add Porn Tube, Share | Localxlist",
      robots: "",
      favicon: settings?.favicon && fileExists(settings.favicon) && `${req.appBaseUrl}/uploads/${settings?.favicon}` || '',
      image: logo_img || '',

      ogType: "localxlist.org",
      ogTitle: "Submit Your Site, Add Porn Tube, Share | Localxlist",
      ogSiteName: "localxlist.org",
      ogUrl: "https://localxlist.org/",
      ogDescription: "Submit Your Site, Add Porn Tube, Share | Localxlist",
      ogImage: logo_img || '',
      ogImageHeight: "377",

      twitterCard: "summary_large_image",
      twitterSite: "localxlist",
      twitterCreator: "localxlist",
      twitterTitle: "Submit Your Site, Add Porn Tube, Share | Localxlist",
      twitterDescription: "Submit Your Site, Add Porn Tube, Share | Localxlist",
      twitterImage: logo_img || '',

      generator: "localxlist.org",
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

const addPartner = async (req, res, next) => {
  try {

    const {
      name,
      email,
      url,
      html_url,
      description,
      answer,
    } = req.body;

    const partnerSet = {
      name,
      email,
      url,
      html_url,
      description,
      answer,
    };

    const insertedId = await insertRecord('site_request', partnerSet);

    res.json(createSuccessResponse('Your request has been submitted successfully.', { id: insertedId }, "PARTNER_ADDED_SUCCESS"));

  } catch (error) {
    next(error);
  }
};

const getPartnersCategorySeo = async (req, res, next) => {
  try {
    // Extracting parameters from the URL
    const { category } = req.params;

    const categoryDetail = await getTableRecord(`SELECT category FROM sites_link_category WHERE REPLACE(category, ' ', '') LIKE ? LIMIT 1`, [`%${category.replace(/\s/g, '')}%`], true);
    const settings = await getSettingsData();

    let logo_img = 'backend/images/settings/header_logo_15477661460.png';
    if (settings?.header_logo_path && fileExists(settings.header_logo_path)) {
      logo_img = `${req.appBaseUrl}/uploads/${settings.header_logo_path}`;
    } else {
      logo_img = `${req.appBaseUrl}/uploads/${logo_img}`;
    }

    const site_name = settings?.site_name || 'localxlist';
    const pageMetaDataV = await getPageMetaData(META_PAGES.PARTNERS);
    const pageMetaData = Object.fromEntries(Object.entries(pageMetaDataV || {}).map(([k, v]) => [k, typeof v === 'string' ? v.replace(/{{category}}/g, categoryDetail?.category) : v]));

    // Generate headers using the metadata utility
    const header_data = {
      title: pageMetaData?.title || `${categoryDetail?.category} | ${site_name}`,
      description: pageMetaData?.description || `Cities | ${site_name}`,
      keywords: pageMetaData?.keywords || `${categoryDetail?.category} | ${site_name}`,
      robots: pageMetaData?.robots || "",
      ogTitle: pageMetaData?.og_title || `${categoryDetail?.category} | ${site_name}`,
      ogDescription: pageMetaData?.og_description || `${categoryDetail?.category} | ${site_name}`,
      ogImage: pageMetaData?.og_image || logo_img || '',
      ogImageHeight: pageMetaData?.og_image_height || '377',
      ogImageWidth: pageMetaData?.og_image_width || '',
      ogSiteName: pageMetaData?.og_site_name || 'localxlist.org',
      ogType: pageMetaData?.og_type || 'localxlist.org',
      ogUrl: pageMetaData?.og_url || 'https://localxlist.org/',

      twitterTitle: pageMetaData?.twitter_title || `${categoryDetail?.category} | ${site_name}`,
      twitterDescription: pageMetaData?.twitter_description || `${categoryDetail?.category} | ${site_name}`,
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

const getPartnersByCategory = async (req, res, next) => {
  try {
    // Extracting parameters from the URL
    const { category } = req.params;

    // Check if parameters are provided
    if (!category) {
      return res.status(404).json(createErrorResponse("No Content found."));
    }
    const categoryDetail = await getTableRecord(`SELECT id, category, content FROM sites_link_category WHERE REPLACE(category, ' ', '') LIKE ? LIMIT 1`, [`%${category.replace(/\s/g, '')}%`], true);

    const data = await getPartnersListByCategory(req, categoryDetail);
    const responseData = createSuccessResponse("Data retrieved successfully.", { list: data || [], content: categoryDetail?.content || "" });
    res.json(responseData);
  } catch (error) {
    // Pass the error to the error handler middleware
    next(error);
  }
};

const getDetailPartnerByCategorySeo = async (req, res, next) => {
  try {
    // Extracting parameters from the URL
    const { category, title } = req.params;

    const categoryDetail = await getTableRecord(`SELECT category FROM sites_link_category WHERE REPLACE(category, ' ', '') LIKE ? LIMIT 1`, [`%${category.replace(/\s/g, '')}%`], true);

    const partnerDetail = await getTableRecord(`SELECT * FROM site_link WHERE REPLACE(title, ' ', '') LIKE ? LIMIT 1`, [`%${title.replace(/\s/g, '')}%`], true);

    const settings = await getSettingsData();

    let logo_img = 'backend/images/settings/header_logo_15477661460.png';
    if (settings?.header_logo_path && fileExists(settings.header_logo_path)) {
      logo_img = `${req.appBaseUrl}/uploads/${settings.header_logo_path}`;
    } else {
      logo_img = `${req.appBaseUrl}/uploads/${logo_img}`;
    }

    const site_name = settings?.site_name || 'localxlist';
    let custom_title = `${partnerDetail?.title || ""} | ${categoryDetail?.category || ""} | ${site_name}`;
    let custom_description = `${(partnerDetail?.description || "").slice(0, 30)} | ${site_name}`;

    const pageMetaDataV = await getPageMetaData(META_PAGES.PARTNER_DETAIL);
    const pageMetaData = Object.fromEntries(Object.entries(pageMetaDataV || {}).map(([k, v]) => [k, typeof v === 'string' ? v.replace(/{{category}}/g, categoryDetail?.category).replace(/{{partner_name}}/g, partnerDetail?.title) : v]));

    // Generate headers using the metadata utility
    const header_data = {
      title: pageMetaData?.title || custom_title,
      description: pageMetaData?.description || custom_description,
      keywords: pageMetaData?.keywords || custom_title,
      robots: pageMetaData?.robots || "",
      ogTitle: pageMetaData?.og_title || custom_title,
      ogDescription: pageMetaData?.og_description || custom_description,
      ogImage: pageMetaData?.og_image || logo_img || '',
      ogImageHeight: pageMetaData?.og_image_height || '377',
      ogImageWidth: pageMetaData?.og_image_width || '',
      ogSiteName: pageMetaData?.og_site_name || 'localxlist.org',
      ogType: pageMetaData?.og_type || 'localxlist.org',
      ogUrl: pageMetaData?.og_url || 'https://localxlist.org/',

      twitterTitle: pageMetaData?.twitter_title || custom_title,
      twitterDescription: pageMetaData?.twitter_description || custom_description,
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

const getDetailPartnerByCategory = async (req, res, next) => {
  try {
    // Extracting parameters from the URL
    const { category, title } = req.params;

    // Check if parameters are provided
    if (!category || !title) {
      return res.status(404).json(createErrorResponse("No Content found."));
    }

    const categoryDetail = await getTableRecord(`SELECT * FROM sites_link_category WHERE REPLACE(category, ' ', '') LIKE ? LIMIT 1`, [`%${category.replace(/\s/g, '')}%`], true);
    // const partnerDetail = await getTableRecord(`SELECT id, title, url, logo, image, description, rating FROM site_link WHERE title LIKE ? LIMIT 1`, [`%${title}%`], true);
    const partnerDetail = await getTableRecord(
      `SELECT id, title, url, logo, image, description, rating 
       FROM site_link 
       WHERE REPLACE(title, ' ', '') LIKE ? 
       LIMIT 1`,
      [`%${title.replace(/\s/g, '')}%`], // Remove spaces from input title
      true
    );


    if (partnerDetail) {

      partnerDetail.shortUrl = partnerDetail?.url.replace(/^https?:\/\//, '').replace(/\/+$/, '');// Remove trailing slash(es);
      partnerDetail.image = partnerDetail?.image && fileExists(partnerDetail?.image || "") && `${req.appBaseUrl}/uploads/${partnerDetail?.image}` || `${req.appBaseUrl}/uploads/frontend/images/no-image.png`;

      partnerDetail.logo = partnerDetail?.logo && fileExists(partnerDetail?.logo || "") && `${req.appBaseUrl}/uploads/${partnerDetail?.logo}` || `${req.appBaseUrl}/uploads/frontend/images/no-image.png`;

      partnerDetail.preview_header = fileExists('frontend/images/preview_header.png') && `${req.appBaseUrl}/uploads/frontend/images/preview_header.png` || `${req.appBaseUrl}/uploads/frontend/images/no-image.png`;
    }

    // Fetch Other with Same Category
    const siteLinks = await executeQuery(`
      SELECT id, title, logo, url, image
      FROM site_link
      WHERE category_id = ? AND id != ?
      ORDER BY updated_at DESC
    `, [categoryDetail?.id, partnerDetail?.id]);

    const otherPartnerList = await Promise.all(siteLinks.map((site) => {
      const siteLogo = site?.logo && fileExists(site?.logo || "");
      return {
        ...site,
        category_id: categoryDetail?.id || "",
        category_name: categoryDetail?.category || "",
        logo: siteLogo && `${req.appBaseUrl}/uploads/${site?.logo}` || `${req.appBaseUrl}/uploads/frontend/images/no-image.png`,
        image: site?.image && fileExists(site?.image || "") && `${req.appBaseUrl}/uploads/${site?.image}` || `${req.appBaseUrl}/uploads/frontend/images/no-image.png`,
      }
    }));

    const responseData = createSuccessResponse("Data retrieved successfully.", { detail: partnerDetail, others: otherPartnerList || [], content: categoryDetail?.content || "" });
    res.json(responseData);
  } catch (error) {
    // Pass the error to the error handler middleware
    next(error);
  }
};

const getSearchPartnersSeo = async (req, res, next) => {
  try {

    const {
      searchKeyword = ''
    } = req.query;

    const settings = await getSettingsData();
    const site_name = settings?.site_name || 'localxlist';

    // Generate headers using the metadata utility
    let customTitle = `Best ${searchKeyword} porn tubes & ${searchKeyword} sex sites | ${site_name}`;
    let customDescription = `Best ${searchKeyword} porn tubes & ${searchKeyword} sex sites | ${site_name}`;

    let logo_img = 'backend/images/settings/header_logo_15477661460.png';
    if (settings?.header_logo_path && fileExists(settings.header_logo_path)) {
      logo_img = `${req.appBaseUrl}/uploads/${settings.header_logo_path}`;
    } else {
      logo_img = `${req.appBaseUrl}/uploads/${logo_img}`;
    }

    const pageMetaDataV = await getPageMetaData(META_PAGES.SITE_LINKS_SEARCH);
    const pageMetaData = Object.fromEntries(Object.entries(pageMetaDataV || {}).map(([k, v]) => [k, typeof v === 'string' ? v.replace(/{{search-keyword}}/g, searchKeyword) : v]));

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

const getSearchPartners = async (req, res, next) => {
  try {
    const {
      page = 1,
      searchKeyword = ''
    } = req.query;

    // Pagination and post fetching
    const perPageLimit = LIMIT.PARTNERS || 10;
    const offset = (page - 1) * perPageLimit;
    const keyword = searchKeyword.replace(/\s/g, '');
    const searchCondition = searchKeyword ? `AND (REPLACE(site_link.title, ' ', '') LIKE '%${keyword}%' OR REPLACE(site_link.description, ' ', '') LIKE '%${keyword}%' OR REPLACE(site_link.url, ' ', '')  LIKE '%${keyword}%' OR REPLACE(site_link.rating, ' ', '') LIKE '%${keyword}%')` : '';

    const wherePostCondition = `WHERE 1 = 1 ${searchCondition}`;

    // Fetch total count for pagination
    const totalCount = await executeQuery(`SELECT COUNT(id) AS total_partners FROM site_link ${wherePostCondition}`);
    const totalPartners = totalCount[0]?.total_partners || 0;
    const totalPages = Math.ceil(totalPartners / perPageLimit);

    // Fetch partners
    const partnerList = await executeQuery(`SELECT site_link.id, site_link.title, site_link.url, site_link.logo, site_link.image, site_link.description, site_link.rating, sites_link_category.category AS category_name FROM site_link LEFT JOIN sites_link_category ON sites_link_category.id = site_link.category_id ${wherePostCondition} ORDER BY site_link.category_id ASC,site_link.updated_at DESC LIMIT ${perPageLimit} OFFSET ${offset}`);
    // Handle image fetching for partnerList
    const allpartnerList = await Promise.all(partnerList.map((site, index) => {
      const siteLogo = site?.logo && fileExists(site?.logo || "");
      return {
        ...site,
        srNo: offset + (index + 1),
        logo: siteLogo && `${req.appBaseUrl}/uploads/${site?.logo}` || `${req.appBaseUrl}/uploads/frontend/images/no-image.png`,
        image: site?.image && fileExists(site?.image || "") && `${req.appBaseUrl}/uploads/${site?.image}` || `${req.appBaseUrl}/uploads/frontend/images/no-image.png`,
      }
    }));

    // Send response
    const responseData = {
      list: allpartnerList,
      pagination: {
        currentPage: page,
        totalPages,
        perPageLimit,
        totalPartners
      }
    };
    res.json(createSuccessResponse("Data retrieved successfully.", responseData));
  } catch (error) {
    // Pass the error to the error handler middleware
    next(error);
  }
};

module.exports = { getPartnerSeo, getPartners, getPartnersSponsers, getPartnersContent, getPartnerAddSeo, addPartner, getPartnersCategorySeo, getPartnersByCategory, getDetailPartnerByCategorySeo, getDetailPartnerByCategory, getSearchPartnersSeo, getSearchPartners };
