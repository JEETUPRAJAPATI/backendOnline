const { executeQuery } = require('../../utils/dbUtils');
const { createSuccessResponse, createErrorResponse } = require('../../utils/responseUtils');
const { getHeaderMetaData } = require('../../utils/metaUtils');
const { getSettingsData, getTableRecord, getPageMetaData } = require("../../services/common.service");
const { fileExists, calculateReadTime, truncatedContent, formattedDate } = require('../../utils/generalUtils');
const { LIMIT, COMMON_CONFIG, META_PAGES } = require('../../constants');

const getBlogSeo = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { category = '' } = query;

    let categoryName = '';
    if (category) {
      const categoryDetail = await getTableRecord(`SELECT name FROM blog_categories WHERE slug = ? LIMIT 1;`, [category], true);
      categoryName = categoryDetail ? `${categoryDetail?.name} - ` : "";
    }

    const settings = await getSettingsData();
    let logo_img = 'backend/images/settings/header_logo_15477661460.png';
    if (settings?.header_logo_path && fileExists(settings.header_logo_path)) {
      logo_img = `${req.appBaseUrl}/uploads/${settings.header_logo_path}`;
    } else {
      logo_img = `${req.appBaseUrl}/uploads/${logo_img}`;
    }

    const site_name = settings?.site_name || 'localxlist';
    const pageMetaData = await getPageMetaData(META_PAGES.BLOGS);
    // Generate headers using the metadata utility
    const header_data = {
      title: pageMetaData?.title || `Blogs | ${site_name}`,
      description: pageMetaData?.description || `Cities | ${site_name}`,
      keywords: pageMetaData?.keywords || `Blogs | ${site_name}`,
      robots: pageMetaData?.robots || "",
      ogTitle: pageMetaData?.og_title || `Blogs | ${site_name}`,
      ogDescription: pageMetaData?.og_description || `Blogs | ${site_name}`,
      ogImage: pageMetaData?.og_image || logo_img || '',
      ogImageHeight: pageMetaData?.og_image_height || '377',
      ogImageWidth: pageMetaData?.og_image_width || '',
      ogSiteName: pageMetaData?.og_site_name || 'localxlist.org',
      ogType: pageMetaData?.og_type || 'localxlist.org',
      ogUrl: pageMetaData?.og_url || 'https://localxlist.org/',

      twitterTitle: pageMetaData?.twitter_title || `Blogs | ${site_name}`,
      twitterDescription: pageMetaData?.twitter_description || `Blogs | ${site_name}`,
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

const getBlogs = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { page = 1, keyword = '', category = '' } = query;

    const perPageLimit = LIMIT.BLOGS || 10;
    const offset = (page - 1) * perPageLimit;

    let whereClauses = [];
    let queryParams = [];

    // Get Category Detail
    const categoryDetail = category ? (await getTableRecord("SELECT id, name FROM blog_categories WHERE slug = ? LIMIT 1;", [category], true)) : "";

    whereClauses.push("(status = ?)");
    queryParams.push('published');

    // Keyword search
    if (keyword.trim()) {
      whereClauses.push("(title LIKE ?)");
      const searchKeyword = `%${keyword}%`;
      queryParams.push(searchKeyword);
    }

    // Category Filter
    if (categoryDetail) {
      whereClauses.push("(category_id = ?)");
      queryParams.push(categoryDetail?.id);
    }

    // Construct WHERE clause dynamically
    const whereCondition = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

    // Fetch total count for pagination
    const totalRecordCount = await executeQuery(`SELECT COUNT(id) AS total_count FROM blogs ${whereCondition};`, queryParams);
    const totalRecords = totalRecordCount[0]?.total_count || 0;
    const totalPages = Math.ceil(totalRecords / perPageLimit);

    // Fetch list with only required fields
    const q = `
        SELECT blog_categories.name AS category, blogs.id, blogs.title,blogs.slug, blogs.featured_image, blogs.excerpt, blogs.content
        FROM blogs
        LEFT JOIN blog_categories ON blog_categories.id = blogs.category_id
        ${whereCondition}
        ORDER BY blogs.id DESC
        LIMIT ? OFFSET ?;
      `;
    queryParams.push(perPageLimit, offset);
    const getList = await getTableRecord(q, queryParams);

    // Map to include only requested fields
    const formattedList = getList.map((item, index) => ({
      srNo: offset + (index + 1),
      title: item.title,
      slug: item.slug,
      image: item?.featured_image && fileExists(item?.featured_image)
        ? `${req.appBaseUrl}/uploads/${item.featured_image}`
        : `${req.appBaseUrl}/uploads/${COMMON_CONFIG.admin.DEFAULT_NO_IMG}`,
      category: item.category,
      read_time: calculateReadTime(item?.content || ''),
      excerpt: truncatedContent(item.excerpt, 300),
    }));

    res.json(createSuccessResponse('Data retrieved successfully.', {
      category: categoryDetail,
      list: formattedList,
      pagination: { currentPage: page, totalPages, perPageLimit, totalRecords }
    }));

  } catch (error) {
    next(error);
  }
};

const getBlogCategories = async (req, res, next) => {
  try {

    // Fetch list
    let q = `
      SELECT 
      id, name, slug FROM blog_categories
      ORDER BY id DESC;
    `;

    const getList = await getTableRecord(q);

    res.json(createSuccessResponse('Data retrieved successfully.', getList));

  } catch (error) {
    next(error);
  }
};

const getBlogDetailSeo = async (req, res, next) => {
  const { params } = req;
  const { slug = '' } = params;

  try {

    const [settings, blogDetail] = await Promise.all([
      getSettingsData(),
      getTableRecord(`SELECT title, excerpt, featured_image FROM blogs WHERE slug = ? LIMIT 1;`, [slug], true)
    ]);

    // Get Blog Single Image
    const setPostImage = blogDetail?.featured_image && fileExists(blogDetail?.featured_image)
      ? `${req.appBaseUrl}/uploads/${blogDetail.featured_image}`
      : `${req.appBaseUrl}/uploads/${COMMON_CONFIG.admin.DEFAULT_NO_IMG}`;

    const site_name = settings?.site_name || 'localxlist';
    let customTitle = `${blogDetail?.title} | ${site_name}`;
    let customDescription = `${blogDetail?.excerpt}`;

    let logo_img = 'backend/images/settings/header_logo_15477661460.png';
    if (settings?.header_logo_path && fileExists(settings.header_logo_path)) {
      logo_img = `${req.appBaseUrl}/uploads/${settings.header_logo_path}`;
    } else {
      logo_img = `${req.appBaseUrl}/uploads/${logo_img}`;
    }

    // Fetch From Page Based Meta Data
    let singlePageMeta = await getTableRecord(
      'SELECT * FROM page_meta WHERE page_type = ? AND is_default = ? LIMIT 1;',
      [META_PAGES.BLOG_DETAIL, 0],
      true,
    );

    if (!singlePageMeta) {
      singlePageMeta = await getTableRecord(
        'SELECT * FROM page_meta WHERE page_type = ? AND is_default = ? LIMIT 1;',
        [META_PAGES.BLOG_DETAIL, 1],
        true,
      );
    }

    const pageMetaDataV = singlePageMeta;
    const pageMetaData = Object.fromEntries(Object.entries(pageMetaDataV || {}).map(([k, v]) => [k, typeof v === 'string' ? v.replace(/{{title}}/g, blogDetail?.title) : v]));

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
    const responseData = createSuccessResponse("Data retrieved successfully.", headers);
    res.json(responseData);
  } catch (error) {
    // Pass the error to the error handler middleware
    next(error);
  }
};

const getBlogDetail = async (req, res, next) => {
  try {
    const { user, query, params } = req;
    const { slug } = params;

    // Check if required parameters are provided
    if (!slug) {
      return res.status(400).json(createErrorResponse("Missing required parameters."));
    }


    const q = `
  SELECT 
    blogs.id, 
    blogs.title, 
    blogs.excerpt, 
    blogs.content, 
    blogs.category_id, 
    blogs.featured_image, 
    blogs.created_at, 
    blog_categories.name AS category_name,
    blog_categories.slug AS category_slug
  FROM blogs
  LEFT JOIN blog_categories ON blogs.category_id = blog_categories.id WHERE blogs.slug = ?
  ORDER BY blogs.id DESC;
`;

    const recordDetail = await getTableRecord(q, [slug], true);
    if (!recordDetail) {
      return res.status(400).json(createErrorResponse(message = "Record Not Found.", data = null, code = "RECORD_NOT_FOUND"));
    }

    res.json(createSuccessResponse('Data retrieved successfully.', {
      blogId: recordDetail?.id || '',
      title: recordDetail?.title || '',
      excerpt: recordDetail?.excerpt || '',
      description: recordDetail?.content || '',
      image: recordDetail?.featured_image && fileExists(recordDetail?.featured_image) ? `${req.appBaseUrl}/uploads/${recordDetail.featured_image}` : `${req.appBaseUrl}/uploads/${COMMON_CONFIG.admin.DEFAULT_NO_IMG}`,
      category: recordDetail?.category_name || '',
      categorySlug: recordDetail?.category_slug || '',
      publishedDate: formattedDate(recordDetail.created_at, 'MMM dd, yyyy'),
      readTime: calculateReadTime(recordDetail?.content || ''),
      author: recordDetail?.author || "Localxlist Team",
      authorPic: recordDetail?.authorPic && fileExists(recordDetail?.authorPic) ? `${req.appBaseUrl}/uploads/${recordDetail.authorPic}` : `${req.appBaseUrl}/uploads/${COMMON_CONFIG.admin.DEFAULT_USER_IMG}`,


    }));

  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

module.exports = {
  getBlogSeo,
  getBlogs,
  getBlogCategories,
  getBlogDetailSeo,
  getBlogDetail
};
