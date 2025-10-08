const fs = require('fs');
const path = require('path');
const { createSuccessResponse, createErrorResponse, createValidationErrorResponse } = require('../../utils/responseUtils');
const { getHeaderMetaData } = require('../../utils/metaUtils');
const { fileExists, hashPassword, formattedDate, getRelativeTime, generateRandomCode, formatTotal, sanitizeXSSInput, slugify, truncatedContent } = require('../../utils/generalUtils');
const { getSettingsData, getTableRecord, updateRecord, getPostWithPrevAndNext, getPostImages, deleteRecord, insertRecord, getUploadImageId } = require("../../services/common.service");
const { loadEmailTemplate, sendEmail } = require('../../utils/sendMail.Utils');
const { addDays, format } = require('date-fns'); // Import the necessary functions from date-fns

const { LIMIT, COMMON_CONFIG, UPLOADED_PATH } = require('../../constants');
const { executeQuery, startTransaction, commitTransaction, rollbackTransaction } = require('../../utils/dbUtils');
const { generateAccessToken, generateRefreshToken } = require('../../utils/jwt');

const loginSeo = async (req, res, next) => {
  try {

    const settings = await getSettingsData();

    // Prepare metadata for headers
    const logo_img = settings.header_logo_path && fileExists(settings.header_logo_path) ? `${req.appBaseUrl}/uploads/${settings.header_logo_path}` : `${req.appBaseUrl}/uploads/backend/images/settings/header_logo_15477661460.png`;

    const header_data = {
      author: 'localxlist.org',
      title: `Login | Localxlist`,
      description: `Login | Localxlist`,
      keywords: "Login | Localxlist",
      favicon: settings.favicon && fileExists(settings.favicon) ? `${req.appBaseUrl}/uploads/${settings.favicon}` : '',
      image: logo_img,

      ogType: "website",
      ogTitle: `Login | Localxlist`,
      ogSiteName: "localxlist.org",
      ogUrl: "https://localxlist.org/",
      ogDescription: `Login | Localxlist`,
      ogImage: logo_img,
      ogImageHeight: "377",

      twitterCard: "summary_large_image",
      twitterSite: "localxlist",
      twitterCreator: "localxlist",
      twitterTitle: `Login | Localxlist`,
      twitterDescription: `Login | Localxlist`,
      twitterImage: logo_img,
      generator: "localxlist.org",
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

const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    const hashedPassword = hashPassword(password); // Hash password before storing
    const user = await getTableRecord(`SELECT id, username, email FROM user WHERE username = ? AND password = ? AND status = 1`, [username, hashedPassword], true);

    if (!user) {
      return res.status(400).json(createErrorResponse(message = "Invalid username or password.", data = null, code = 'INALID_LOGIN_CREDENTIAL'));
    }

    const jwtUser = {
      id: user?.id,
      username: user?.username,
      email: user?.email,
    };

    // Generate JWT Token
    const accessToken = generateAccessToken(jwtUser);
    const refreshToken = generateRefreshToken(jwtUser);

    // Respond with success and token
    res.json(
      createSuccessResponse(
        message = "You have logged-in successfully.", data = { token: accessToken, refreshToken, id: user?.id }, code = "LOGIN_SUCCESS")
    );

  } catch (error) {
    next(error);
  }
};

const profile = async (req, res, next) => {
  try {
    const { user } = req;

    // Validate if the user object is available
    if (!user || !user.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Parameterized query to prevent SQL injection
    const query = `SELECT id, user_type AS role, username, name, email, date, image, phone, status, (SELECT support_email FROM settings WHERE id = ?) AS supportEmail FROM user WHERE id = ?;`;

    const params = [1, user.id];
    const userDetail = await getTableRecord(query, params, true);

    // Notification count
    const notificationCount = await executeQuery(`SELECT COUNT(id) AS total_unread_count FROM notices WHERE read_yn = ?;`, ['N']);
    const totalUnreadNotificationCount = notificationCount[0]?.total_unread_count || 0;

    // Link request count
    const linkRequestCount = await executeQuery(`SELECT COUNT(id) AS total_count FROM site_request WHERE status = ?;`, [0]);
    const totalUnreadLinkRequestCount = linkRequestCount[0]?.total_count || 0;

    // Unread message count
    const messageCount = await executeQuery(`SELECT COUNT(id) AS total_unread_count FROM massage WHERE status = ?;`, [0]);
    const totalUnreadMessageCount = messageCount[0]?.total_unread_count || 0;

    if (userDetail) {

      // Get Modules Permissions For Role
      const modulePermissions = await getTableRecord(`SELECT role_user_permissions.id, modules.identifier, modules.name AS module_name, role_user_permissions.allowed_actions FROM role_user_permissions INNER JOIN modules ON modules.id = role_user_permissions.module_id WHERE role_user_permissions.user_id = ?;`, [userDetail?.id]);
      userDetail.modulePermissions = modulePermissions;

      userDetail.profilePicFullPath = userDetail?.image && fileExists(userDetail?.image) ? `${req.appBaseUrl}/uploads/${userDetail.image}` : `${req.appBaseUrl}/uploads/${COMMON_CONFIG.admin.DEFAULT_USER_IMG}`;

      userDetail.totalUnreadNotificationCount = totalUnreadNotificationCount;
      userDetail.totalUnreadNotificationCountFormatted = formatTotal(totalUnreadNotificationCount);

      userDetail.totalUnreadLinkRequestCount = totalUnreadLinkRequestCount;
      userDetail.totalUnreadLinkRequestCountFormatted = formatTotal(totalUnreadLinkRequestCount);

      userDetail.totalUnreadMessageCount = totalUnreadMessageCount;
      userDetail.totalUnreadMessageCountFormatted = formatTotal(totalUnreadMessageCount);
    }

    res.json(createSuccessResponse('Data retrieved successfully.', userDetail));
  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const notificationsSeo = async (req, res, next) => {
  try {

    const settings = await getSettingsData();

    // Prepare metadata for headers
    const logo_img = settings.header_logo_path && fileExists(settings.header_logo_path) ? `${req.appBaseUrl}/uploads/${settings.header_logo_path}` : `${req.appBaseUrl}/uploads/backend/images/settings/header_logo_15477661460.png`;

    const header_data = {
      author: 'localxlist.org',
      title: `Notifications | Localxlist`,
      description: `Notifications | Localxlist`,
      keywords: "Notifications | Localxlist",
      favicon: settings.favicon && fileExists(settings.favicon) ? `${req.appBaseUrl}/uploads/${settings.favicon}` : '',
      image: logo_img,

      ogType: "website",
      ogTitle: `Notifications | Localxlist`,
      ogSiteName: "localxlist.org",
      ogUrl: "https://localxlist.org/",
      ogDescription: `Notifications | Localxlist`,
      ogImage: logo_img,
      ogImageHeight: "377",

      twitterCard: "summary_large_image",
      twitterSite: "localxlist",
      twitterCreator: "localxlist",
      twitterTitle: `Notifications | Localxlist`,
      twitterDescription: `Notifications | Localxlist`,
      twitterImage: logo_img,
      generator: "localxlist.org",
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

const notices = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { page = 1, type = 'all', pageList = 0 } = query;

    // Validate if the user object is available
    if (!user || !user.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Pagination and fetching
    const perPageLimit = LIMIT.ADMIN_NOTIFICATIONS || 10;
    const offset = (page - 1) * perPageLimit;

    // Define the WHERE condition dynamically
    let whereCondition = "";
    let queryParams = [];

    if (pageList == 1) {
      if (type === 'unread') {
        whereCondition = "WHERE read_yn = ?";
        queryParams.push('N'); // Assuming unread notifications have read_yn = 0
      } else {
        whereCondition = "WHERE read_yn = ?";
        queryParams.push('Y'); // Assuming unread notifications have read_yn = 0
      }
    }


    // Fetch total count for pagination
    const totalRecordCount = await executeQuery(`SELECT COUNT(id) AS total_count FROM notices ${whereCondition};`, queryParams);
    const totalRecords = totalRecordCount[0]?.total_count || 0;
    const totalPages = Math.ceil(totalRecords / perPageLimit);

    // Parameterized query to prevent SQL injection
    const q = `SELECT id, title, notice_url, notice_body as description, created_at, read_yn, manual_payment_request_id  FROM notices ${whereCondition} ORDER BY read_yn ASC, id DESC  LIMIT ? OFFSET ?;`;
    const params = [...queryParams, perPageLimit, offset];
    const notifications = await getTableRecord(q, params);

    notifications.map((item, index) => {
      item.srNo = offset + (index + 1);
      item.relativeTime = getRelativeTime(item?.created_at);
    });

    // Send response
    const responseData = {
      list: notifications,
      pagination: {
        currentPage: page,
        totalPages,
        perPageLimit,
        totalRecords
      }
    };

    res.json(createSuccessResponse('Data retrieved successfully.', responseData));
  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const noticeDetail = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { id } = query;

    // Validate if the user object is available
    if (!user || !user.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Check if required parameters are provided
    if (!id) {
      return res.status(400).json(createErrorResponse("Missing required parameters."));
    }
    else if (id && isNaN(id)) {
      return res.status(400).json(createErrorResponse("Invalid parameter value."));
    }


    // Parameterized query to prevent SQL injection
    const q = `SELECT id, title, notice_url, notice_body, manual_payment_request_id, created_at FROM notices WHERE id = ?;`;
    const params = [id];
    const notification = await getTableRecord(q, params, true);

    if (!notification) {
      return res.status(400).json(createErrorResponse("Invalid notification ID."));
    }
    notification.relativeTime = getRelativeTime(notification?.created_at);

    // Update Notification status to read
    await updateRecord('notices', { read_yn: 'Y' }, { id });

    res.json(createSuccessResponse('Data retrieved successfully.', notification));
  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const notifications = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { page = 1 } = query;

    // Validate if the user object is available
    if (!user || !user.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Pagination and fetching
    const perPageLimit = LIMIT.ADMIN_NOTIFICATIONS || 10;
    const offset = (page - 1) * perPageLimit;

    // Fetch total count for pagination
    const totalRecordCount = await executeQuery(`SELECT COUNT(id) AS total_count FROM notifications;`, []);
    const totalRecords = totalRecordCount[0]?.total_count || 0;
    const totalPages = Math.ceil(totalRecords / perPageLimit);

    // Parameterized query to prevent SQL injection
    const q = `SELECT id, title, description, created_at  FROM notifications ORDER BY id DESC  LIMIT ? OFFSET ?;`;
    const params = [perPageLimit, offset];
    const notifications = await getTableRecord(q, params);

    notifications.map((item, index) => {
      item.srNo = offset + (index + 1);
      item.relativeTime = getRelativeTime(item?.created_at);
    });

    // Send response
    const responseData = {
      list: notifications,
      pagination: {
        currentPage: page,
        totalPages,
        perPageLimit,
        totalRecords
      }
    };

    res.json(createSuccessResponse('Data retrieved successfully.', responseData));
  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const notificationAdd = async (req, res, next) => {
  try {
    const { user, body } = req;
    const { title, description } = body;

    console.log(user, body);

    // Validate if the user object is available
    if (!user || !user.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Validate if required parameters are provided
    if (!title || !description) {
      return res.status(400).json(createErrorResponse('Missing required parameters.'));
    }

    // Prepare the data for insertion
    const data = {
      title,
      description,
      created_at: new Date(),
      updated_at: new Date(),
    };

    // Insert the record
    const insertId = await insertRecord('notifications', data);

    res.json(createSuccessResponse('Notification added successfully.', { id: insertId }, 'NOTIFICATION_ADDED'));

  } catch (error) {
    next(error);
  }
};

const linkRequestsSeo = async (req, res, next) => {
  try {

    const settings = await getSettingsData();

    // Prepare metadata for headers
    const logo_img = settings.header_logo_path && fileExists(settings.header_logo_path) ? `${req.appBaseUrl}/uploads/${settings.header_logo_path}` : `${req.appBaseUrl}/uploads/backend/images/settings/header_logo_15477661460.png`;

    const header_data = {
      author: 'localxlist.org',
      title: `Site Requests | Localxlist`,
      description: `Site Requests | Localxlist`,
      keywords: "Site Requests | Localxlist",
      favicon: settings.favicon && fileExists(settings.favicon) ? `${req.appBaseUrl}/uploads/${settings.favicon}` : '',
      image: logo_img,

      ogType: "website",
      ogTitle: `Site Requests | Localxlist`,
      ogSiteName: "localxlist.org",
      ogUrl: "https://localxlist.org/",
      ogDescription: `Site Requests | Localxlist`,
      ogImage: logo_img,
      ogImageHeight: "377",

      twitterCard: "summary_large_image",
      twitterSite: "localxlist",
      twitterCreator: "localxlist",
      twitterTitle: `Site Requests | Localxlist`,
      twitterDescription: `Site Requests | Localxlist`,
      twitterImage: logo_img,
      generator: "localxlist.org",
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

const linkRequests = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { page = 1, pageList = 0 } = query;

    // Validate if the user object is available
    if (!user || !user.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Pagination and fetching
    const perPageLimit = LIMIT.ADMIN_LINKREQUESTS || 10;
    const offset = (page - 1) * perPageLimit;

    // Fetch total count for pagination
    const totalRecordCount = await executeQuery(`SELECT COUNT(id) AS total_count FROM site_request;`, []);
    const totalRecords = totalRecordCount[0]?.total_count || 0;
    const totalPages = Math.ceil(totalRecords / perPageLimit);

    // Parameterized query to prevent SQL injection
    let q = '';
    if (pageList == 1) {
      q = `SELECT id, name, email, url, html_url, created_at  FROM site_request ORDER BY id DESC  LIMIT ? OFFSET ?;`;
    } else {
      q = `SELECT id, name as title, email, url, created_at  FROM site_request ORDER BY id DESC  LIMIT ? OFFSET ?;`;
    }

    const params = [perPageLimit, offset];
    const linkRequests = await getTableRecord(q, params);

    linkRequests.map((item, index) => {
      item.srNo = offset + (index + 1);
      item.relativeTime = getRelativeTime(item?.created_at);
    });

    // Send response
    const responseData = {
      list: linkRequests,
      pagination: {
        currentPage: page,
        totalPages,
        perPageLimit,
        totalRecords
      }
    };

    res.json(createSuccessResponse('Data retrieved successfully.', responseData));
  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const linkRequestDetail = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { id } = query;

    // Validate if the user object is available
    if (!user || !user.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Check if required parameters are provided
    if (!id) {
      return res.status(400).json(createErrorResponse("Missing required parameters."));
    }
    else if (id && isNaN(id)) {
      return res.status(400).json(createErrorResponse("Invalid parameter value."));
    }

    // Parameterized query to prevent SQL injection
    const q = `SELECT id, name, email, url, html_url, description, answer FROM site_request WHERE id = ?;`;
    const params = [id];
    const site = await getTableRecord(q, params, true);

    if (!site) {
      return res.status(400).json(createErrorResponse("Invalid site request ID."));
    }

    // Update Site status
    await updateRecord('site_request', { status: 1 }, { id });

    res.json(createSuccessResponse('Data retrieved successfully.', site));
  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const siteLinkCategories = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { page = 1, keyword = '' } = query;

    // Validate if the user object is available
    if (!user || !user.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Pagination and fetching
    const perPageLimit = LIMIT.ADMIN_SITELINK_CATEGORIES || 10;
    const offset = (page - 1) * perPageLimit;

    let whereClauses = [];
    let queryParams = [];

    // Keyword search
    if (keyword.trim()) {
      whereClauses.push("(category LIKE ?)");
      const searchKeyword = `%${keyword.trim()}%`;
      queryParams.push(searchKeyword);
    }

    // Construct WHERE clause dynamically
    const whereCondition = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

    // Fetch total count for pagination
    const totalRecordCount = await executeQuery(`SELECT COUNT(id) AS total_count FROM sites_link_category ${whereCondition};`, queryParams);
    const totalRecords = totalRecordCount[0]?.total_count || 0;
    const totalPages = Math.ceil(totalRecords / perPageLimit);

    // Parameterized query to prevent SQL injection

    let q;
    if (page == 0) {
      q = `SELECT id, category  FROM sites_link_category  ${whereCondition} ORDER BY id DESC;`;
    } else {
      q = `SELECT id, category, content FROM sites_link_category  ${whereCondition} ORDER BY id DESC LIMIT ? OFFSET ?;`;
      queryParams.push(perPageLimit, offset);
    }

    const getList = await getTableRecord(q, queryParams);

    getList.map((item, index) => {
      item.srNo = offset + (index + 1);
    });

    // Send response
    const responseData = {
      list: getList,
      pagination: {
        currentPage: page,
        totalPages,
        perPageLimit,
        totalRecords
      }
    };

    res.json(createSuccessResponse('Data retrieved successfully.', responseData));
  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const siteLinksAdded = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { page = 1, categoryId = 0 } = query;

    // Validate if the user object is available
    if (!user || !user.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    let whereCondition = '';
    let queryParams = [];

    if (categoryId > 0) {
      whereCondition = "WHERE site_link.category_id = ?";
      queryParams.push(categoryId);
    }

    // Pagination and fetching
    const perPageLimit = LIMIT.ADMIN_SITE_LINKS || 10;
    const offset = (page - 1) * perPageLimit;

    // Fetch total count for pagination
    const totalRecordCount = await executeQuery(`SELECT COUNT(id) AS total_count FROM site_link ${whereCondition};`, [...queryParams]);
    const totalRecords = totalRecordCount[0]?.total_count || 0;
    const totalPages = Math.ceil(totalRecords / perPageLimit);

    // Parameterized query to prevent SQL injection
    const q = `SELECT site_link.id, site_link.title, site_link.logo, site_link.url, sites_link_category.category FROM site_link LEFT JOIN sites_link_category ON sites_link_category.id = site_link.category_id ${whereCondition} ORDER BY site_link.category_id, site_link.id DESC LIMIT ? OFFSET ?;`;

    const params = [...queryParams, perPageLimit, offset];
    const linksAdded = await getTableRecord(q, params);

    linksAdded.map((item, index) => {
      item.srNo = offset + (index + 1);
      item.logo = item?.logo && fileExists(item?.logo || "") && `${req.appBaseUrl}/uploads/${item?.logo}` || `${req.appBaseUrl}/uploads/frontend/images/no-image.png`
    });

    // Send response
    const responseData = {
      list: linksAdded,
      pagination: {
        currentPage: page,
        totalPages,
        perPageLimit,
        totalRecords,
        categoryId
      }
    };

    res.json(createSuccessResponse('Data retrieved successfully.', responseData));
  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const siteLinkEdit = async (req, res, next) => {
  try {
    const { user } = req;
    const { id } = req.params;

    // Validate if the user object is available
    if (!user || !user.id || !user.username) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Check if required parameters are provided
    if (!id) {
      return res.status(400).json(createErrorResponse("Missing required parameters."));
    }

    const query = `
      SELECT *
      FROM site_link
      WHERE id = ? LIMIT 1;`;

    const siteDetail = await getTableRecord(query, [id], true);
    if (!siteDetail) {
      return res.status(400).json(createErrorResponse(message = "Site Not Found.", data = null, code = "SITELINK_NOT_FOUND"));
    }

    siteDetail.logo = siteDetail?.logo && fileExists(siteDetail?.logo || "") && `${req.appBaseUrl}/uploads/${siteDetail?.logo}` || `${req.appBaseUrl}/uploads/frontend/images/no-image.png`
    siteDetail.image = siteDetail?.image && fileExists(siteDetail?.image || "") && `${req.appBaseUrl}/uploads/${siteDetail?.image}` || `${req.appBaseUrl}/uploads/frontend/images/no-image.png`


    res.json(createSuccessResponse('Data retrieved successfully.', siteDetail));

  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const messagesSeo = async (req, res, next) => {
  try {

    const settings = await getSettingsData();

    // Prepare metadata for headers
    const logo_img = settings.header_logo_path && fileExists(settings.header_logo_path) ? `${req.appBaseUrl}/uploads/${settings.header_logo_path}` : `${req.appBaseUrl}/uploads/backend/images/settings/header_logo_15477661460.png`;

    const header_data = {
      author: 'localxlist.org',
      title: `Messages | Localxlist`,
      description: `Messages | Localxlist`,
      keywords: "Messages | Localxlist",
      favicon: settings.favicon && fileExists(settings.favicon) ? `${req.appBaseUrl}/uploads/${settings.favicon}` : '',
      image: logo_img,

      ogType: "website",
      ogTitle: `Messages | Localxlist`,
      ogSiteName: "localxlist.org",
      ogUrl: "https://localxlist.org/",
      ogDescription: `Messages | Localxlist`,
      ogImage: logo_img,
      ogImageHeight: "377",

      twitterCard: "summary_large_image",
      twitterSite: "localxlist",
      twitterCreator: "localxlist",
      twitterTitle: `Messages | Localxlist`,
      twitterDescription: `Messages | Localxlist`,
      twitterImage: logo_img,
      generator: "localxlist.org",
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

const messages = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { page = 1, pageList = 0, type = '' } = query;

    // Validate if the user object is available
    if (!user || !user.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Pagination and fetching
    const perPageLimit = LIMIT.ADMIN_MESSAGES || 10;
    const offset = (page - 1) * perPageLimit;

    // Define the WHERE condition dynamically
    let whereCondition = "";
    let queryParams = [];

    if (type === 'unread') {
      whereCondition = "WHERE status = ?";
      queryParams.push(0); // Assuming unread notifications have status = 0
    }
    else if (type === 'read') {
      whereCondition = "WHERE status = ?";
      queryParams.push(1); // Assuming read notifications have status = 1
    }

    // Fetch total count for pagination
    const totalRecordCount = await executeQuery(`SELECT COUNT(id) AS total_count FROM massage ${whereCondition};`, queryParams);
    const totalRecords = totalRecordCount[0]?.total_count || 0;
    const totalPages = Math.ceil(totalRecords / perPageLimit);

    // Parameterized query to prevent SQL injection
    let q = '';
    if (pageList == 1) {
      q = `SELECT id, name, email, phone, 
          CASE 
            WHEN LENGTH(subject) > 50 THEN CONCAT(SUBSTRING(subject, 1, 47), '...') 
            ELSE subject 
          END as subject,
          CASE 
            WHEN LENGTH(msg) > 100 THEN CONCAT(SUBSTRING(msg, 1, 97), '...') 
            ELSE msg 
          END as msg,
          status, created_at 
          FROM massage ${whereCondition} 
          ORDER BY id DESC LIMIT ? OFFSET ?;`;
    } else {
      q = `SELECT id, name, email, 
          CASE 
            WHEN LENGTH(subject) > 50 THEN CONCAT(SUBSTRING(subject, 1, 47), '...') 
            ELSE subject 
          END as title,
          CASE 
            WHEN LENGTH(msg) > 100 THEN CONCAT(SUBSTRING(msg, 1, 97), '...') 
            ELSE msg 
          END as description,
          status, created_at  
          FROM massage 
          ORDER BY status ASC, id DESC LIMIT ? OFFSET ?;`;
    }

    const params = [...queryParams, perPageLimit, offset];
    const messages = await getTableRecord(q, params);

    messages.map((item, index) => {
      item.srNo = offset + (index + 1);
      item.image = fileExists(COMMON_CONFIG.admin.DEFAULT_USER_IMG) && `${req.appBaseUrl}/uploads/${COMMON_CONFIG.admin.DEFAULT_USER_IMG}`;
      item.relativeTime = getRelativeTime(item?.created_at);
    });

    // Send response
    const responseData = {
      list: messages,
      pagination: {
        currentPage: page,
        totalPages,
        perPageLimit,
        totalRecords
      }
    };

    res.json(createSuccessResponse('Data retrieved successfully.', responseData));
  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const messageDetail = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { id } = query;

    // Validate if the user object is available
    if (!user || !user.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Check if required parameters are provided
    if (!id) {
      return res.status(400).json(createErrorResponse("Missing required parameters."));
    }
    else if (id && isNaN(id)) {
      return res.status(400).json(createErrorResponse("Invalid parameter value."));
    }

    // Parameterized query to prevent SQL injection
    const q = `SELECT id, name, email, phone, subject, msg, status FROM massage WHERE id = ?;`;
    const params = [id];
    const message = await getTableRecord(q, params, true);

    if (!message) {
      return res.status(400).json(createErrorResponse("Invalid Message ID."));
    }

    // Update Message status
    await updateRecord('massage', { status: 1 }, { id });

    res.json(createSuccessResponse('Data retrieved successfully.', message));
  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const dashboardSeo = async (req, res, next) => {
  try {

    const settings = await getSettingsData();

    // Prepare metadata for headers
    const logo_img = settings.header_logo_path && fileExists(settings.header_logo_path) ? `${req.appBaseUrl}/uploads/${settings.header_logo_path}` : `${req.appBaseUrl}/uploads/backend/images/settings/header_logo_15477661460.png`;

    const header_data = {
      author: 'localxlist.org',
      title: `Dashboard | Localxlist`,
      description: `Dashboard | Localxlist`,
      keywords: "Dashboard | Localxlist",
      favicon: settings.favicon && fileExists(settings.favicon) ? `${req.appBaseUrl}/uploads/${settings.favicon}` : '',
      image: logo_img,

      ogType: "website",
      ogTitle: `Dashboard | Localxlist`,
      ogSiteName: "localxlist.org",
      ogUrl: "https://localxlist.org/",
      ogDescription: `Dashboard | Localxlist`,
      ogImage: logo_img,
      ogImageHeight: "377",

      twitterCard: "summary_large_image",
      twitterSite: "localxlist",
      twitterCreator: "localxlist",
      twitterTitle: `Dashboard | Localxlist`,
      twitterDescription: `Dashboard | Localxlist`,
      twitterImage: logo_img,
      generator: "localxlist.org",
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

const dashboard = async (req, res, next) => {
  try {
    const settings = await getSettingsData();
    const { user } = req;

    // Validate if the user object is available
    if (!user || !user.id || !user.username) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    const visitorQuery = `SELECT 
      COALESCE(SUM(count), 0) AS total_visitors, 
      COALESCE(SUM(CASE WHEN DATE(date) = CURDATE() THEN count ELSE 0 END), 0) AS total_todays_visitors 
    FROM visitors;`;

    const postQuery = `SELECT 
        COUNT(id) AS total_post,
        SUM(status = 0) AS total_pending_post,
        SUM(status = 1) AS total_active_post,
        SUM(DATE(date) = CURDATE()) AS total_today_post,
        COUNT(DISTINCT CASE WHEN DATE(date) = CURDATE() THEN member_id END) AS total_today_post_user,
        SUM(status = 1 AND member_id = 0) AS total_admin_post,
        SUM(status = 1 AND member_id != 0) AS total_user_post
      FROM post;`;

    const dashboardData = await Promise.all([
      getTableRecord(visitorQuery, [], true),
      getTableRecord(postQuery, [], true),
    ]);

    // Combine Results
    const [visitorData, postData] = dashboardData;

    const dashboardResponse = {
      total_visitors: visitorData?.total_visitors || 0,
      total_today_visitors: visitorData?.total_todays_visitors || 0,
      total_post: postData?.total_post || 0,
      total_pending_post: postData?.total_pending_post || 0,
      total_active_post: postData?.total_active_post || 0,
      total_today_post: postData?.total_today_post || 0,
      total_today_post_user: postData?.total_today_post_user || 0,
      total_admin_post: postData?.total_admin_post || 0,
      total_user_post: postData?.total_user_post || 0,
    };

    // Add formatted values
    for (const key in dashboardResponse) {
      if (dashboardResponse.hasOwnProperty(key)) {
        const formattedKey = `${key}_formatted`;
        dashboardResponse[formattedKey] = formatTotal(dashboardResponse[key]);
      }
    }

    res.json(createSuccessResponse('Data retrieved successfully.', dashboardResponse));
  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const usersSeo = async (req, res, next) => {
  try {

    const settings = await getSettingsData();

    // Prepare metadata for headers
    const logo_img = settings.header_logo_path && fileExists(settings.header_logo_path) ? `${req.appBaseUrl}/uploads/${settings.header_logo_path}` : `${req.appBaseUrl}/uploads/backend/images/settings/header_logo_15477661460.png`;

    const header_data = {
      author: 'localxlist.org',
      title: `Users | Localxlist`,
      description: `Users | Localxlist`,
      keywords: "Users | Localxlist",
      favicon: settings.favicon && fileExists(settings.favicon) ? `${req.appBaseUrl}/uploads/${settings.favicon}` : '',
      image: logo_img,

      ogType: "website",
      ogTitle: `Users | Localxlist`,
      ogSiteName: "localxlist.org",
      ogUrl: "https://localxlist.org/",
      ogDescription: `Users | Localxlist`,
      ogImage: logo_img,
      ogImageHeight: "377",

      twitterCard: "summary_large_image",
      twitterSite: "localxlist",
      twitterCreator: "localxlist",
      twitterTitle: `Users | Localxlist`,
      twitterDescription: `Users | Localxlist`,
      twitterImage: logo_img,
      generator: "localxlist.org",
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

const users = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { page = 1, type = '', keyword = '' } = query;

    if (!user?.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    const perPageLimit = LIMIT.ADMIN_USERS || 10;
    const offset = (page - 1) * perPageLimit;

    let whereClauses = [];
    let queryParams = [];

    // Status filter
    if (type === 'active') {
      whereClauses.push("status = ?");
      queryParams.push(1);
    } else if (type === 'deactive') {
      whereClauses.push("status = ? AND verified = ?");
      queryParams.push(0, 1);
    } else if (type === 'suspended') {
      whereClauses.push("status = ?");
      queryParams.push(2);
    } else if (type === 'unverified') {
      whereClauses.push("status = ? AND verified = ?");
      queryParams.push(0, 0);
    } else if (type === 'moredotsemail') {
      whereClauses.push("email LIKE ?");
      queryParams.push('%.%.%.%');
    }

    // Keyword search
    if (keyword.trim()) {
      whereClauses.push("(username LIKE ? OR email LIKE ?)");
      const searchKeyword = `%${keyword}%`;
      queryParams.push(searchKeyword, searchKeyword);
    }

    // Construct WHERE clause dynamically
    const whereCondition = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

    // Fetch total count for pagination
    const totalRecordCount = await executeQuery(`SELECT COUNT(id) AS total_count FROM member ${whereCondition};`, queryParams);
    const totalRecords = totalRecordCount[0]?.total_count || 0;
    const totalPages = Math.ceil(totalRecords / perPageLimit);

    // Fetch user list
    const q = `
      SELECT id, date_time, username, email, path, status, verified,
        (SELECT COUNT(id) FROM post WHERE post.member_id = member.id) AS total_post_count
      FROM member
      ${whereCondition}
      ORDER BY id DESC
      LIMIT ? OFFSET ?;
    `;
    queryParams.push(perPageLimit, offset);
    const getList = await getTableRecord(q, queryParams);

    getList.forEach((item, index) => {
      item.srNo = offset + index + 1;
      item.formattedDate = formattedDate(item.date_time, 'yyyy-MMM-dd hh:mm:ss a');
      item.profilePicFullPath = item?.path && fileExists(item?.path) ? `${req.appBaseUrl}/uploads/${item.path}` : `${req.appBaseUrl}/uploads/${COMMON_CONFIG.admin.DEFAULT_USER_IMG}`;
    });

    res.json(createSuccessResponse('Data retrieved successfully.', {
      list: getList,
      pagination: { currentPage: page, totalPages, perPageLimit, totalRecords }
    }));

  } catch (error) {
    next(error);
  }
};
const userDetail = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { id } = query;

    // Validate if the user object is available
    if (!user || !user.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Check if required parameters are provided
    if (!id) {
      return res.status(400).json(createErrorResponse("Missing required parameters."));
    }
    else if (id && isNaN(id)) {
      return res.status(400).json(createErrorResponse("Invalid parameter value."));
    }

    const settings = await getSettingsData();
    const currency = settings?.currency || '';

    const q = `SELECT id, date_time, username, email, path, status, verified FROM member WHERE id = ?;`;
    const params = [id];
    const record = await getTableRecord(q, params, true);

    if (!record) {
      return res.status(400).json(createErrorResponse("Invalid Profile ID."));
    }

    // Get User Balance
    const balanceDetail = await getTableRecord('SELECT id, balance FROM balance WHERE username = ?;', [record.username], true);
    record.balance = balanceDetail?.balance || 0;
    record.currency = currency || '';

    record.formattedDate = formattedDate(record.date_time, 'yyyy-MMM-dd hh:mm:ss a');
    record.profilePicFullPath = record?.path && fileExists(record?.path) ? `${req.appBaseUrl}/uploads/${record.path}` : `${req.appBaseUrl}/uploads/${COMMON_CONFIG.admin.DEFAULT_USER_IMG}`;

    res.json(createSuccessResponse('Data retrieved successfully.', record));
  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};
const userAllPost = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { page = 1, type = '', userId = '' } = query;

    if (!user?.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    const perPageLimit = LIMIT.ADMIN_MEMBER_POSTS || 10;
    const offset = (page - 1) * perPageLimit;

    let whereClauses = [];
    let queryParams = [];

    // filter
    if (userId) {
      whereClauses.push("post.member_id = ?");
      queryParams.push(userId);
    }

    // Construct WHERE clause dynamically
    const whereCondition = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

    // Fetch total count for pagination
    const totalRecordCount = await executeQuery(`SELECT COUNT(post.id) AS total_count FROM post ${whereCondition};`, queryParams);
    const totalRecords = totalRecordCount[0]?.total_count || 0;
    const totalPages = Math.ceil(totalRecords / perPageLimit);

    // Fetch user list
    const q = `
      SELECT 
      post.id, 
      post.title, 
      post.date, 
      post.status, 
      post.visitors_count,
      country.country, 
      city.city, 
      subcity.subcity, 
      category.category,
      subcategory.subcategory,
      IF(post.featured_end_date > '0000-00-00 00:00:00', 1, 0) AS featured_post
        FROM post
        LEFT JOIN country ON post.country_id = country.id
        LEFT JOIN city ON post.city_id = city.id
        LEFT JOIN subcity ON post.subcity_id = subcity.id
        LEFT JOIN category ON post.category_id = category.id
        LEFT JOIN subcategory ON post.subcategory_id = subcategory.id 
      ${whereCondition}
      ORDER BY id DESC
      LIMIT ? OFFSET ?;
    `;
    queryParams.push(perPageLimit, offset);
    const getList = await getTableRecord(q, queryParams);

    getList.forEach((item, index) => {
      item.srNo = offset + (index + 1);
      item.status_text = item.status == 1 ? 'Active' : 'Pending';
      item.status_text_color = item.status == 1 ? 'green' : 'red';
      item.formattedDate = formattedDate(item.date, 'yyyy-MMM-dd');
    });

    res.json(createSuccessResponse('Data retrieved successfully.', {
      list: getList,
      pagination: { currentPage: page, totalPages, perPageLimit, totalRecords }
    }));

  } catch (error) {
    next(error);
  }
};



const addSiteLink = async (req, res, next) => {

  let transaction;
  let uploadedFiles = [];

  const deleteUploadedFilesWhenError = (filePaths) => {
    if (filePaths && filePaths.length > 0) {
      filePaths.forEach((filePath) => {
        console.log("Deleting:", filePath);

        fs.unlink(filePath, (err) => {
          if (err) {
            console.error(`Failed to delete file: ${filePath}`, err);
          } else {
            console.log(`File deleted: ${filePath}`);
          }
        });
      });
    }
  };

  try {

    const { user, body, files } = req;
    const { id = '', title, description, category, url, rating } = body; // Other fields

    // Access uploaded files
    const logoFile = files.logo ? files.logo[0] : null; // Gets logo if uploaded
    const logoFilePath = `${UPLOADED_PATH.SITE_LINK_LOGO}/${logoFile?.filename}`;

    const imageFile = files.image ? files.image[0] : null; // Gets image if uploaded
    const imageFilePath = `${UPLOADED_PATH.SITE_LINK_IMAGE}/${imageFile?.filename}`;

    // Collect file paths for deletion if needed
    uploadedFiles = [logoFile?.path, imageFile?.path].filter(Boolean);

    // Validate if the user object is available
    if (!user || !user?.id) {
      deleteUploadedFilesWhenError(uploadedFiles);
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Start a transaction
    transaction = await startTransaction();

    // Create data object
    let siteData = {
      created_at: new Date(), // Format: "Y-m-d H:i:s"
      updated_at: new Date(), // Format: "Y-m-d H:i:s"
      category_id: category,
      title,
      description,
      url,
      rating,
    };

    if (id) {
      // Check and get existing
      const query = `
      SELECT id, logo, image
      FROM site_link
      WHERE id = ? LIMIT 1;`;
      const siteDetail = await getTableRecord(query, [id], true);
      if (!siteDetail) {
        deleteUploadedFilesWhenError(uploadedFiles);
        return res.status(400).json(createErrorResponse(message = "Site Not Found.", data = null, code = "SITELINK_NOT_FOUND"));
      }

      // ::::::::::: Update Site Data :::::::::::::
      if (logoFile?.filename) {
        // Delete the logo file if it exists
        const oldLogoPath = siteDetail.logo ? path.join(global.uploadsBaseDir, siteDetail.logo) : null;
        if (oldLogoPath) {
          try {
            await fs.promises.access(oldLogoPath); // Check if the logo exists
            await fs.promises.unlink(oldLogoPath); // Delete the logo
          } catch (err) {
            console.error(`Error deleting logo: ${siteDetail.logo}:`, err);
          }
        }
        // update with new
        siteData.logo = logoFile?.filename && logoFilePath || "";
      }

      if (imageFile?.filename) {
        // Delete the image file if it exists
        const oldImagePath = siteDetail.image ? path.join(global.uploadsBaseDir, siteDetail.image) : null;
        if (oldImagePath) {
          try {
            await fs.promises.access(oldImagePath); // Check if the logo exists
            await fs.promises.unlink(oldImagePath); // Delete the logo
          } catch (err) {
            console.error(`Error deleting image: ${siteDetail.image}:`, err);
          }
        }
        // update with new
        siteData.image = imageFile?.filename && imageFilePath || "";
      }

      const affectedRows = await updateRecord('site_link', siteData, { id: id }, transaction);
      console.log(`Updated Site Link affectedRows:${affectedRows}`);

    } else {

      if (!logoFile || !logoFile?.filename) {
        return res.status(400).json(createValidationErrorResponse("Logo is required.", []));
      }

      if (!imageFile || !imageFile?.filename) {
        return res.status(400).json(createValidationErrorResponse("Image preview is required.", []));
      }

      // Add Site
      siteData.logo = logoFile?.filename && logoFilePath || "";
      siteData.image = imageFile?.filename && imageFilePath || "";

      const siteLinkInsertedId = await insertRecord('site_link', siteData, transaction);
      console.log(`Saved Site Link Id:${siteLinkInsertedId}`);

      siteData.id = siteLinkInsertedId; // Add the ID for response purposes
    }

    // Commit the transaction
    await commitTransaction(transaction);
    console.log(`All done!!`);
    res.json(createSuccessResponse('Site link saved successfully.', siteData?.id || id, "SITE_LINK_SAVED"));

  } catch (error) {
    deleteUploadedFilesWhenError(uploadedFiles);
    // Rollback the transaction in case of an error
    if (transaction) await rollbackTransaction(transaction);
    next(error); // Pass the error to the error handler middleware
  }
};

const sendReplyToMessage = async (req, res, next) => {

  try {

    const { user, body } = req;
    const { id, email, description } = body;

    // Validate if the user object is available
    if (!user || !user?.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Check if required parameters are provided
    if (!id || !email || !description) {
      return res.status(400).json(createErrorResponse("Missing required parameters."));
    }


    const query = `
      SELECT id, msg, email
      FROM massage
      WHERE id = ? LIMIT 1;`;

    const messageDetail = await getTableRecord(query, [id], true);
    if (!messageDetail) {
      return res.status(400).json(createErrorResponse("Message Not Found.", data = null, code = "MESSAGE_NOT_FOUND"));
    }

    if (email !== messageDetail?.email) {
      return res.status(400).json(createErrorResponse("Invalid Email!"));
    }


    // Prepare placeholders
    const placeholders = {
      LOGO_URL: "https://localxlist.com/backend/images/settings/header_logo_15854785210.png",
      USER_MESSAGE: messageDetail?.msg,
      YOUR_REPLY_MESSAGE: description,
    };

    // Load Verification Email Template
    const templatePath = path.join(__dirname, '../../email_templates/replyMessageMailTemplate.html');
    const emailContent = loadEmailTemplate(templatePath, placeholders);

    // Send the verification email
    const emailOptions = {
      to: email,
      subject: 'Message Reply | Localxlist',
      html: emailContent,
    };
    const sentMail = await sendEmail(emailOptions);
    logger.info({ sentMail });

    res.json(createSuccessResponse('Message sent successfully.', {
      email, sentMail
    }, "REPLY_MESSAGE_SENT"));

  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const profilesSeo = async (req, res, next) => {
  try {

    const settings = await getSettingsData();

    // Prepare metadata for headers
    const logo_img = settings.header_logo_path && fileExists(settings.header_logo_path) ? `${req.appBaseUrl}/uploads/${settings.header_logo_path}` : `${req.appBaseUrl}/uploads/backend/images/settings/header_logo_15477661460.png`;

    const header_data = {
      author: 'localxlist.org',
      title: `Profile | Localxlist`,
      description: `Profile | Localxlist`,
      keywords: "Profile | Localxlist",
      favicon: settings.favicon && fileExists(settings.favicon) ? `${req.appBaseUrl}/uploads/${settings.favicon}` : '',
      image: logo_img,

      ogType: "website",
      ogTitle: `Profile | Localxlist`,
      ogSiteName: "localxlist.org",
      ogUrl: "https://localxlist.org/",
      ogDescription: `Profile | Localxlist`,
      ogImage: logo_img,
      ogImageHeight: "377",

      twitterCard: "summary_large_image",
      twitterSite: "localxlist",
      twitterCreator: "localxlist",
      twitterTitle: `Profile | Localxlist`,
      twitterDescription: `Profile | Localxlist`,
      twitterImage: logo_img,
      generator: "localxlist.org",
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

const allProfile = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { page = 1, role = '' } = query;

    // Validate if the user object is available
    if (!user || !user.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Pagination and fetching
    const perPageLimit = LIMIT.ADMIN_PROFILES || 10;
    const offset = (page - 1) * perPageLimit;

    // Define the WHERE condition dynamically
    let whereCondition = "";
    let queryParams = [];

    if (role) {
      whereCondition = "WHERE user_type = ?";
      queryParams.push(role);
    }

    // Fetch total count for pagination
    const totalRecordCount = await executeQuery(`SELECT COUNT(id) AS total_count FROM user ${whereCondition};`, queryParams);
    const totalRecords = totalRecordCount[0]?.total_count || 0;
    const totalPages = Math.ceil(totalRecords / perPageLimit);

    let q = '';
    let params = [];
    if (page == 0) {
      q = `SELECT id, date,image, user_type, name, email, username  FROM user ${whereCondition} ORDER BY id DESC;`;
      params = [...queryParams];
    } else {
      // Parameterized query to prevent SQL injection
      q = `SELECT id, date,image, user_type, name, email, username  FROM user ${whereCondition} ORDER BY id DESC  LIMIT ? OFFSET ?;`;
      params = [...queryParams, perPageLimit, offset];
    }
    const records = await getTableRecord(q, params);

    records.map((item, index) => {
      item.srNo = offset + (index + 1);
      item.name = item.id === user?.id ? `${item?.name || "N/A"} (You)` : item?.name || "N/A";
      item.formattedDate = formattedDate(item.date, 'yyyy-MMM-dd');
      item.profilePicFullPath = item?.image && fileExists(item?.image) ? `${req.appBaseUrl}/uploads/${item.image}` : `${req.appBaseUrl}/uploads/${COMMON_CONFIG.admin.DEFAULT_USER_IMG}`;
    });

    // Send response
    const responseData = {
      list: records,
      pagination: {
        currentPage: page,
        totalPages,
        perPageLimit,
        totalRecords
      }
    };

    res.json(createSuccessResponse('Data retrieved successfully.', responseData));
  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const profileDetail = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { id } = query;

    // Validate if the user object is available
    if (!user || !user.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Check if required parameters are provided
    if (!id) {
      return res.status(400).json(createErrorResponse("Missing required parameters."));
    }
    else if (id && isNaN(id)) {
      return res.status(400).json(createErrorResponse("Invalid parameter value."));
    }

    const q = `SELECT * FROM user WHERE id = ?;`;
    const params = [id];
    const record = await getTableRecord(q, params, true);

    if (!record) {
      return res.status(400).json(createErrorResponse("Invalid Profile ID."));
    }

    record.formattedName = record.id === user?.id ? `${record?.name || "N/A"} (You)` : record?.name || "N/A";
    record.formattedDate = formattedDate(record.date, 'yyyy-MMM-dd');
    record.profilePicFullPath = record?.image && fileExists(record?.image) ? `${req.appBaseUrl}/uploads/${record.image}` : `${req.appBaseUrl}/uploads/${COMMON_CONFIG.admin.DEFAULT_USER_IMG}`;

    res.json(createSuccessResponse('Data retrieved successfully.', record));
  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const profileSave = async (req, res, next) => {

  let transaction;
  let uploadedFiles = [];

  const deleteUploadedFilesWhenError = (filePaths) => {
    if (filePaths && filePaths.length > 0) {
      filePaths.forEach((filePath) => {
        console.log("Deleting:", filePath);

        fs.unlink(filePath, (err) => {
          if (err) {
            console.error(`Failed to delete file: ${filePath}`, err);
          } else {
            console.log(`File deleted: ${filePath}`);
          }
        });
      });
    }
  };

  try {

    const { user, body, file } = req;
    const { id = '', name, username, email, address, role, gender, country, phone, old_password, password } = body; // Other fields

    // Access uploaded file
    const imageFileName = file && file?.filename || "";
    const imageFilePath = `${UPLOADED_PATH.ADMIN_PROFILE_IMAGE}/${imageFileName}`;

    // Collect file paths for deletion if needed
    uploadedFiles = [file?.path || ""].filter(Boolean);

    // Validate if the user object is available
    if (!user || !user?.id) {
      deleteUploadedFilesWhenError(uploadedFiles);
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Start a transaction
    transaction = await startTransaction();

    // Create data object
    let profileData = {
      date: new Date(), // Format: "Y-m-d H:i:s"
      user_type: role,
      name,
      username,
      gender,
      phone,
      email,
      country,
      address,
      status: 1
      // password:hashPassword(password)
    };

    if (id) {
      // Check and get existing
      const query = `
      SELECT id, image, password
      FROM user
      WHERE id = ? LIMIT 1;`;
      const profileDetail = await getTableRecord(query, [id], true);
      if (!profileDetail) {
        deleteUploadedFilesWhenError(uploadedFiles);
        return res.status(400).json(createErrorResponse(message = "Profile Not Found.", data = null, code = "PROFILE_NOT_FOUND"));
      }


      // Check Username, Email, Phone
      const checkUserQuery = `
      SELECT id
      FROM user
      WHERE (username = ? OR email = ? OR phone = ?) AND id != ?  LIMIT 1;`;
      const profileFound = await getTableRecord(checkUserQuery, [username, email, phone, id], true);

      if (profileFound) {
        // Determine which field(s) are duplicated
        const duplicateFields = [];
        if (profileFound.username === username) {
          duplicateFields.push('Username');
        }
        if (profileFound.email === email) {
          duplicateFields.push('Email');
        }
        if (profileFound.phone === phone) {
          duplicateFields.push('Phone');
        }

        // Create an appropriate error message
        const errorMessage = duplicateFields.length > 1
          ? `${duplicateFields.join(', ')} are already in use.`
          : `${duplicateFields[0]} is already in use.`;

        deleteUploadedFilesWhenError(uploadedFiles);
        return res.status(400).json(createErrorResponse({ message: errorMessage, data: null, code: "EXISTING_FOUND" }));
      }

      // Check Password with old password
      if (password && old_password) {
        const hashedOldPassword = hashPassword(old_password);
        if (hashedOldPassword !== profileDetail?.password) {
          return res.status(400).json(createValidationErrorResponse("Old password is not matched with saved password.", []));
        }

        profileData.password = hashPassword(password);
      }



      // ::::::::::: Update Data :::::::::::::

      if (imageFileName) {
        // Delete the image file if it exists
        const oldImagePath = profileDetail.image ? path.join(global.uploadsBaseDir, profileDetail.image) : null;
        if (oldImagePath) {
          try {
            await fs.promises.access(oldImagePath); // Check if the logo exists
            await fs.promises.unlink(oldImagePath); // Delete the logo
          } catch (err) {
            console.error(`Error deleting image: ${profileDetail.image}:`, err);
          }
        }
        // update with new
        profileData.image = imageFileName && imageFilePath || "";
      }

      const affectedRows = await updateRecord('user', profileData, { id: id }, transaction);
      console.log(`Updated Profile affectedRows:${affectedRows}`);

    } else {
      // Validate Fields
      if (!imageFileName) {
        return res.status(400).json(createValidationErrorResponse("Image is required.", []));
      }

      // Check Username, Email, Phone
      const checkUserQuery = `
      SELECT id
      FROM user
      WHERE username = ? OR email = ? OR phone = ? LIMIT 1;`;
      const profileFound = await getTableRecord(checkUserQuery, [username, email, phone], true);

      if (profileFound) {
        // Determine which field(s) are duplicated
        const duplicateFields = [];
        if (profileFound.username === username) {
          duplicateFields.push('Username');
        }
        if (profileFound.email === email) {
          duplicateFields.push('Email');
        }
        if (profileFound.phone === phone) {
          duplicateFields.push('Phone');
        }

        // Create an appropriate error message
        const errorMessage = duplicateFields.length > 1
          ? `${duplicateFields.join(', ')} are already in use.`
          : `${duplicateFields[0]} is already in use.`;

        deleteUploadedFilesWhenError(uploadedFiles);
        return res.status(400).json(createErrorResponse({ message: errorMessage, data: null, code: "EXISTING_FOUND" }));
      }

      profileData.password = hashPassword(password);

      profileData.image = imageFileName && imageFilePath || "";

      const profileInsertedId = await insertRecord('user', profileData, transaction);
      console.log(`Saved Profile Id:${profileInsertedId}`);

      profileData.id = profileInsertedId; // Add the ID for response purposes
    }

    // Commit the transaction
    await commitTransaction(transaction);
    console.log(`All done!!`);
    res.json(createSuccessResponse('Profile saved successfully.', profileData?.id || id, "PROFILE_SAVED"));

  } catch (error) {
    deleteUploadedFilesWhenError(uploadedFiles);
    // Rollback the transaction in case of an error
    if (transaction) await rollbackTransaction(transaction);
    next(error); // Pass the error to the error handler middleware
  }
};

// Post SEO
const postsSeo = async (req, res, next) => {
  try {

    const settings = await getSettingsData();

    // Prepare metadata for headers
    const logo_img = settings.header_logo_path && fileExists(settings.header_logo_path) ? `${req.appBaseUrl}/uploads/${settings.header_logo_path}` : `${req.appBaseUrl}/uploads/backend/images/settings/header_logo_15477661460.png`;

    const header_data = {
      author: 'localxlist.org',
      title: `Posts | Localxlist`,
      description: `Posts | Localxlist`,
      keywords: "Posts | Localxlist",
      favicon: settings.favicon && fileExists(settings.favicon) ? `${req.appBaseUrl}/uploads/${settings.favicon}` : '',
      image: logo_img,

      ogType: "website",
      ogTitle: `Posts | Localxlist`,
      ogSiteName: "localxlist.org",
      ogUrl: "https://localxlist.org/",
      ogDescription: `Posts | Localxlist`,
      ogImage: logo_img,
      ogImageHeight: "377",

      twitterCard: "summary_large_image",
      twitterSite: "localxlist",
      twitterCreator: "localxlist",
      twitterTitle: `Posts | Localxlist`,
      twitterDescription: `Posts | Localxlist`,
      twitterImage: logo_img,
      generator: "localxlist.org",
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

const posts = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { page = 1, type = '', keyword = '', countryId = '', cityId = '', subCityId = '', categoryId = '', subCategoryId = '' } = query;


    if (!user?.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    const perPageLimit = LIMIT.ADMIN_POSTS || 10;
    const offset = (page - 1) * perPageLimit;

    let whereClauses = [];
    let queryParams = [];

    // Post filter
    if (type === 'activated') {
      whereClauses.push("post.status = ?");
      queryParams.push(1);
    } else if (type === 'deactivated') {
      whereClauses.push("post.status = ?");
      queryParams.push(0);
    } else if (type === 'trashed') {
      whereClauses.push("post.status = ?");
      queryParams.push(2);
    } else if (type === 'adminPosts') {
      whereClauses.push("post.member_id = ? AND post.status = ?");
      queryParams.push(0, 1);
    } else if (type === 'todayPosts') {
      whereClauses.push("post.member_id != ? AND post.status = ? AND DATE(post.date) = CURDATE()");
      queryParams.push(0, 1);
    }

    // Others filter
    if (countryId) {
      whereClauses.push("post.country_id = ?");
      queryParams.push(countryId);
    }
    if (cityId) {
      whereClauses.push("post.city_id = ?");
      queryParams.push(cityId);
    }
    if (subCityId) {
      whereClauses.push("post.subcity_id = ?");
      queryParams.push(subCityId);
    }
    if (categoryId) {
      whereClauses.push("post.category_id = ?");
      queryParams.push(categoryId);
    }
    if (subCategoryId) {
      whereClauses.push("post.subcategory_id = ?");
      queryParams.push(subCategoryId);
    }

    // Keyword search
    if (keyword.trim()) {
      whereClauses.push("(post.title LIKE ? OR post.description LIKE ?)");
      const searchKeyword = `%${keyword}%`;
      queryParams.push(searchKeyword, searchKeyword);
    }

    // Construct WHERE clause dynamically
    const whereCondition = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

    // Fetch total count for pagination
    const totalRecordCount = await executeQuery(`SELECT COUNT(id) AS total_count FROM post ${whereCondition};`, queryParams);
    const totalRecords = totalRecordCount[0]?.total_count || 0;
    const totalPages = Math.ceil(totalRecords / perPageLimit);

    // Fetch user list
    const q = `
      SELECT 
      post.id, 
      post.title, 
      post.date, 
      post.status, 
      post.visitors_count,
      country.country, 
      city.city, 
      subcity.subcity, 
      category.category,
      subcategory.subcategory,
      -- Post Expired Flag
        CASE 
            WHEN post.post_delete_date IS NOT NULL AND post.post_delete_date < NOW() THEN 1
            ELSE 0
        END AS is_expired,

        -- Expired DateTime
        post.post_delete_date AS expired_at,
      IF(post.featured_end_date > '0000-00-00 00:00:00', 1, 0) AS featured_post
        FROM post
        LEFT JOIN country ON post.country_id = country.id
        LEFT JOIN city ON post.city_id = city.id
        LEFT JOIN subcity ON post.subcity_id = subcity.id
        LEFT JOIN category ON post.category_id = category.id
        LEFT JOIN subcategory ON post.subcategory_id = subcategory.id 
      ${whereCondition}
      ORDER BY id DESC
      LIMIT ? OFFSET ?;
    `;
    queryParams.push(perPageLimit, offset);
    const getList = await getTableRecord(q, queryParams);

    getList.forEach((item, index) => {
      item.srNo = offset + (index + 1);
      item.formattedDate = formattedDate(item.date, 'yyyy-MMM-dd');
      item.formattedExpiredAt = formattedDate(item?.expired_at, 'yyyy-MM-dd HH:mm');
    });

    res.json(createSuccessResponse('Data retrieved successfully.', {
      list: getList,
      pagination: { currentPage: page, totalPages, perPageLimit, totalRecords }
    }));

  } catch (error) {
    next(error);
  }
};

const postDetail = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { id } = query;

    // Validate if the user object is available
    if (!user || !user.id || !user.username) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Check if required parameters are provided
    if (!id) {
      return res.status(400).json(createErrorResponse("Missing required parameters."));
    }
    else if (id && isNaN(id)) {
      return res.status(400).json(createErrorResponse("Invalid parameter value."));
    }

    const whereCondition = `WHERE 1=1`;
    const q = `
      SELECT 
        post.id, 
        post.title, 
        post.description, 
        post.date, 
        post.email, 
        post.phone, 
        post.location, 
        post.sexual_oriantation, 
        post.sex, 
        post.age, 
        post.status,
        post.img_id,        
        -- Post Expired Flag
        CASE 
            WHEN post.post_delete_date IS NOT NULL AND post.post_delete_date < NOW() THEN 1
            ELSE 0
        END AS is_expired,

        -- Expired DateTime
        post.post_delete_date AS expired_at,

        member.id AS member_id,
        member.name AS member_name,
        member.username AS member_username,
        member.email AS member_email,


        -- Previous post details
        (SELECT prev_post.id 
         FROM post AS prev_post
          ${whereCondition} AND prev_post.id < ?
         ORDER BY 
          prev_post.id DESC 
         LIMIT 1) AS prev_post_id,         
        (SELECT prev_post.title 
         FROM post AS prev_post
         ${whereCondition} AND prev_post.id < ?
         ORDER BY 
          prev_post.id DESC 
         LIMIT 1) AS prev_post_title,
         
        -- Next post details
        (SELECT next_post.id 
         FROM post AS next_post
         ${whereCondition} AND next_post.id > ?
         ORDER BY 
          next_post.id ASC 
         LIMIT 1) AS next_post_id,         
        (SELECT next_post.title 
         FROM post  AS next_post
         ${whereCondition} AND next_post.id > ?
         ORDER BY 
          next_post.id ASC 
         LIMIT 1) AS next_post_title
        
      FROM post LEFT JOIN member ON post.member_id = member.id
      ${whereCondition} AND post.id = ?
      ORDER BY post.id DESC;
    `;

    const postDetail = await getTableRecord(q, [id, id, id, id, id], true);
    if (!postDetail) {
      return res.status(400).json(createErrorResponse(message = "Post Not Found.", data = null, code = "POST_NOT_FOUND"));
    }

    // Format Post Date
    postDetail.formattedDate = formattedDate(postDetail?.date, 'yyyy-MM-dd HH:mm');
    postDetail.formattedExpiredAt = formattedDate(postDetail?.expired_at, 'yyyy-MM-dd HH:mm');
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

    res.json(createSuccessResponse('Data retrieved successfully.', postDetail));

  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};


const countriesSeo = async (req, res, next) => {
  try {

    const settings = await getSettingsData();

    // Prepare metadata for headers
    const logo_img = settings.header_logo_path && fileExists(settings.header_logo_path) ? `${req.appBaseUrl}/uploads/${settings.header_logo_path}` : `${req.appBaseUrl}/uploads/backend/images/settings/header_logo_15477661460.png`;

    const header_data = {
      author: 'localxlist.org',
      title: `Countries | Localxlist`,
      description: `Countries | Localxlist`,
      keywords: "Countries | Localxlist",
      favicon: settings.favicon && fileExists(settings.favicon) ? `${req.appBaseUrl}/uploads/${settings.favicon}` : '',
      image: logo_img,

      ogType: "website",
      ogTitle: `Countries | Localxlist`,
      ogSiteName: "localxlist.org",
      ogUrl: "https://localxlist.org/",
      ogDescription: `Countries | Localxlist`,
      ogImage: logo_img,
      ogImageHeight: "377",

      twitterCard: "summary_large_image",
      twitterSite: "localxlist",
      twitterCreator: "localxlist",
      twitterTitle: `Countries | Localxlist`,
      twitterDescription: `Countries | Localxlist`,
      twitterImage: logo_img,
      generator: "localxlist.org",
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

const countries = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { page = 1, keyword = '' } = query;

    if (!user?.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    const perPageLimit = LIMIT.ADMIN_COUNTRIES || 10;
    const offset = (page - 1) * perPageLimit;

    let whereClauses = [];
    let queryParams = [];

    // Keyword search
    if (keyword.trim()) {
      whereClauses.push("(country LIKE ?)");
      const searchKeyword = `%${keyword}%`;
      queryParams.push(searchKeyword);
    }

    // Construct WHERE clause dynamically
    const whereCondition = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

    // Fetch total count for pagination
    const totalRecordCount = await executeQuery(`SELECT COUNT(id) AS total_count FROM country ${whereCondition};`, queryParams);
    const totalRecords = totalRecordCount[0]?.total_count || 0;
    const totalPages = Math.ceil(totalRecords / perPageLimit);

    // Fetch user list
    let q = `
      SELECT 
      id, country FROM country
      ${whereCondition}
      ORDER BY id DESC
      LIMIT ? OFFSET ?;
    `;
    queryParams.push(perPageLimit, offset);

    if (page == 0) {
      q = `
      SELECT 
      id, country FROM country
      ${whereCondition}
      ORDER BY id DESC;
    `;
    }
    const getList = await getTableRecord(q, queryParams);

    getList.forEach((item, index) => {
      item.srNo = page == 0 ? (index + 1) : offset + (index + 1);
    });

    res.json(createSuccessResponse('Data retrieved successfully.', {
      list: getList,
      pagination: { currentPage: page, totalPages, perPageLimit, totalRecords }
    }));

  } catch (error) {
    next(error);
  }
};

const countryDetail = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { id } = query;

    // Validate if the user object is available
    if (!user || !user.id || !user.username) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Check if required parameters are provided
    if (!id) {
      return res.status(400).json(createErrorResponse("Missing required parameters."));
    }
    else if (id && isNaN(id)) {
      return res.status(400).json(createErrorResponse("Invalid parameter value."));
    }

    const whereCondition = `WHERE 1=1`;
    const q = `
      SELECT 
        id, 
        country FROM country
      ${whereCondition} AND id = ?
      ORDER BY id DESC;
    `;

    const recordDetail = await getTableRecord(q, [id], true);
    if (!recordDetail) {
      return res.status(400).json(createErrorResponse(message = "Record Not Found.", data = null, code = "RECORD_NOT_FOUND"));
    }

    res.json(createSuccessResponse('Data retrieved successfully.', recordDetail));

  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const countrySave = async (req, res, next) => {
  let transaction;

  try {
    const { user, body } = req;
    const { id = '', country } = body;

    // Validate user session
    if (!user || !user?.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Validate country input
    if (!country || typeof country !== 'string' || country.trim() === '') {
      return res.status(400).json(createErrorResponse('Country name is required.'));
    }

    const countryName = country.trim();

    // Start transaction
    transaction = await startTransaction();

    // Check if the country already exists (both for insert and update)
    const existingCountry = await getTableRecord(
      `SELECT id FROM country WHERE country = ? LIMIT 1;`,
      [countryName],
      true
    );

    if (existingCountry && (!id || existingCountry.id !== id)) {
      await rollbackTransaction(transaction);
      return res.status(400).json(createErrorResponse('Duplicate record found.', null, 'DUPLICATE_RECORD'));
    }

    // Prepare record data
    let setRecordData = {
      date: new Date(),
      country: countryName,
    };

    if (id) {
      // Check if the record exists before updating
      const existingRecord = await getTableRecord(`SELECT id FROM country WHERE id = ? LIMIT 1;`, [id], true);
      if (!existingRecord) {
        await rollbackTransaction(transaction);
        return res.status(400).json(createErrorResponse('Record Not Found.', null, 'RECORD_NOT_FOUND'));
      }

      // Update the country
      const affectedRows = await updateRecord('country', setRecordData, { id }, transaction);
      console.log(`Updated record affectedRows:${affectedRows}`);
    } else {
      // Insert new country
      const recordInsertedId = await insertRecord('country', setRecordData, transaction);
      console.log(`Saved record Id:${recordInsertedId}`);
      setRecordData.id = recordInsertedId;
    }

    // Commit transaction
    await commitTransaction(transaction);
    res.json(createSuccessResponse('Record saved successfully.', setRecordData.id || id, 'RECORD_SAVED'));

  } catch (error) {
    if (transaction) await rollbackTransaction(transaction);
    next(error);
  }
};


const citiesSeo = async (req, res, next) => {
  try {

    const settings = await getSettingsData();

    // Prepare metadata for headers
    const logo_img = settings.header_logo_path && fileExists(settings.header_logo_path) ? `${req.appBaseUrl}/uploads/${settings.header_logo_path}` : `${req.appBaseUrl}/uploads/backend/images/settings/header_logo_15477661460.png`;

    const header_data = {
      author: 'localxlist.org',
      title: `Cities | Localxlist`,
      description: `Cities | Localxlist`,
      keywords: "Cities | Localxlist",
      favicon: settings.favicon && fileExists(settings.favicon) ? `${req.appBaseUrl}/uploads/${settings.favicon}` : '',
      image: logo_img,

      ogType: "website",
      ogTitle: `Cities | Localxlist`,
      ogSiteName: "localxlist.org",
      ogUrl: "https://localxlist.org/",
      ogDescription: `Cities | Localxlist`,
      ogImage: logo_img,
      ogImageHeight: "377",

      twitterCard: "summary_large_image",
      twitterSite: "localxlist",
      twitterCreator: "localxlist",
      twitterTitle: `Cities | Localxlist`,
      twitterDescription: `Cities | Localxlist`,
      twitterImage: logo_img,
      generator: "localxlist.org",
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

const cities = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { page = 1, keyword = '', countryId = '' } = query;

    if (!user?.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    const perPageLimit = LIMIT.ADMIN_CITIES || 10;
    const offset = (page - 1) * perPageLimit;

    let whereClauses = [];
    let queryParams = [];

    // Keyword search
    if (keyword.trim()) {
      whereClauses.push("(city.city LIKE ? OR country.country LIKE ?)");
      const searchKeyword = `%${keyword}%`;
      queryParams.push(searchKeyword, searchKeyword);
    }

    if (countryId) {
      whereClauses.push("city.country IN (?)");
      queryParams.push(countryId.split(','));
    }

    // Construct WHERE clause dynamically
    const whereCondition = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

    // Fetch total count for pagination
    const totalRecordCount = await executeQuery(`SELECT COUNT(city.id) AS total_count FROM city LEFT JOIN country ON city.country = country.id ${whereCondition};`, queryParams);
    const totalRecords = totalRecordCount[0]?.total_count || 0;
    const totalPages = Math.ceil(totalRecords / perPageLimit);

    // Fetch list
    let q = '';
    if (page == 0) {
      q = `
      SELECT 
          city.id, city.city, country.id AS countryId, country.country 
      FROM city
      LEFT JOIN country ON city.country = country.id
       ${whereCondition} 
      ORDER BY city.id DESC;
  `;
    } else {
      q = `
      SELECT 
          city.id, city.city, country.id AS countryId, country.country
      FROM city
      LEFT JOIN country ON city.country = country.id
       ${whereCondition} 
      ORDER BY city.id DESC
      LIMIT ? OFFSET ?;
  `;
      queryParams.push(perPageLimit, offset);
    }



    const getList = await getTableRecord(q, queryParams);

    getList.forEach((item, index) => {
      item.srNo = offset + (index + 1);
    });

    res.json(createSuccessResponse('Data retrieved successfully.', {
      list: getList,
      pagination: { currentPage: page, totalPages, perPageLimit, totalRecords }
    }));

  } catch (error) {
    next(error);
  }
};

const cityDetail = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { id } = query;

    // Validate if the user object is available
    if (!user || !user.id || !user.username) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Check if required parameters are provided
    if (!id) {
      return res.status(400).json(createErrorResponse("Missing required parameters."));
    }
    else if (id && isNaN(id)) {
      return res.status(400).json(createErrorResponse("Invalid parameter value."));
    }

    const whereCondition = `WHERE 1=1`;
    const q = `
      SELECT 
        id, 
        city, country FROM city
      ${whereCondition} AND id = ?
      ORDER BY id DESC;
    `;

    const recordDetail = await getTableRecord(q, [id], true);
    if (!recordDetail) {
      return res.status(400).json(createErrorResponse(message = "Record Not Found.", data = null, code = "RECORD_NOT_FOUND"));
    }

    res.json(createSuccessResponse('Data retrieved successfully.', recordDetail));

  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const citySave = async (req, res, next) => {
  let transaction;

  try {
    const { user, body } = req;
    const { id = '', countryId = '', city = '' } = body;

    // Validate user session
    if (!user || !user?.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Start transaction
    transaction = await startTransaction();

    // Check if the city already exists (both for insert and update)
    const existingCity = await getTableRecord(
      `SELECT id FROM city WHERE city = ? AND country = ? LIMIT 1;`,
      [city, countryId],
      true
    );

    if (existingCity && (!id || existingCity.id !== id)) {
      await rollbackTransaction(transaction);
      return res.status(400).json(createErrorResponse('Duplicate record found.', null, 'DUPLICATE_RECORD'));
    }

    // Prepare record data
    let setRecordData = {
      date: new Date(),
      country: countryId,
      city: city,
    };

    if (id) {
      // Check if the record exists before updating
      const existingRecord = await getTableRecord(`SELECT id FROM city WHERE id = ? LIMIT 1;`, [id], true);
      if (!existingRecord) {
        await rollbackTransaction(transaction);
        return res.status(400).json(createErrorResponse('Record Not Found.', null, 'RECORD_NOT_FOUND'));
      }

      // Update the City
      const affectedRows = await updateRecord('city', setRecordData, { id }, transaction);
      console.log(`Updated record affectedRows:${affectedRows}`);
    } else {
      // Insert new City
      const recordInsertedId = await insertRecord('city', setRecordData, transaction);
      console.log(`Saved record Id:${recordInsertedId}`);
      setRecordData.id = recordInsertedId;
    }

    // Commit transaction
    await commitTransaction(transaction);
    res.json(createSuccessResponse('Record saved successfully.', setRecordData.id || id, 'RECORD_SAVED'));

  } catch (error) {
    if (transaction) await rollbackTransaction(transaction);
    next(error);
  }
};

const subCitiesSeo = async (req, res, next) => {
  try {

    const settings = await getSettingsData();

    // Prepare metadata for headers
    const logo_img = settings.header_logo_path && fileExists(settings.header_logo_path) ? `${req.appBaseUrl}/uploads/${settings.header_logo_path}` : `${req.appBaseUrl}/uploads/backend/images/settings/header_logo_15477661460.png`;

    const header_data = {
      author: 'localxlist.org',
      title: `Sub Cities | Localxlist`,
      description: `Sub Cities | Localxlist`,
      keywords: "Sub Cities | Localxlist",
      favicon: settings.favicon && fileExists(settings.favicon) ? `${req.appBaseUrl}/uploads/${settings.favicon}` : '',
      image: logo_img,

      ogType: "website",
      ogTitle: `Sub Cities | Localxlist`,
      ogSiteName: "localxlist.org",
      ogUrl: "https://localxlist.org/",
      ogDescription: `Sub Cities | Localxlist`,
      ogImage: logo_img,
      ogImageHeight: "377",

      twitterCard: "summary_large_image",
      twitterSite: "localxlist",
      twitterCreator: "localxlist",
      twitterTitle: `Sub Cities | Localxlist`,
      twitterDescription: `Sub Cities | Localxlist`,
      twitterImage: logo_img,
      generator: "localxlist.org",
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

const subCities = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { page = 1, keyword = '', countryId = '', cityId = '' } = query;

    if (!user?.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    const perPageLimit = LIMIT.ADMIN_SUBCITIES || 10;
    const offset = (page - 1) * perPageLimit;

    let whereClauses = [];
    let queryParams = [];

    // Keyword search
    if (keyword.trim()) {
      whereClauses.push("(subcity.subcity LIKE ?)");
      const searchKeyword = `%${keyword}%`;
      queryParams.push(searchKeyword);
    }

    if (countryId) {
      whereClauses.push("subcity.country = ?");
      queryParams.push(countryId);
    }


    if (cityId) {
      whereClauses.push("subcity.city IN (?)");
      queryParams.push(cityId.split(','));
    }

    // Construct WHERE clause dynamically
    const whereCondition = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

    // Fetch total count for pagination
    const totalRecordCount = await executeQuery(`SELECT COUNT(id) AS total_count FROM subcity ${whereCondition};`, queryParams);
    const totalRecords = totalRecordCount[0]?.total_count || 0;
    const totalPages = Math.ceil(totalRecords / perPageLimit);

    // Fetch list
    let q = '';
    if (page == 0) {
      q = `
      SELECT 
      subcity.id, 
      subcity.subcity, 

      city.id AS cityId, 
      city.city, 

      country.id AS countryId,
      country.country 
      
      FROM subcity
      LEFT JOIN city ON city.id = subcity.city
      LEFT JOIN country ON country.id = subcity.country
      ${whereCondition}
      ORDER BY subcity.id DESC;
    `;
    } else {
      q = `
      SELECT 
      
      subcity.id, 
      subcity.subcity, 

      city.id AS cityId, 
      city.city, 

      country.id AS countryId,
      country.country
      
      FROM subcity
      LEFT JOIN city ON city.id = subcity.city
      LEFT JOIN country ON country.id = subcity.country
      ${whereCondition}
      ORDER BY subcity.id DESC
      LIMIT ? OFFSET ?;
    `;
      queryParams.push(perPageLimit, offset);

    }

    const getList = await getTableRecord(q, queryParams);

    getList.forEach((item, index) => {
      item.srNo = offset + (index + 1);
    });

    res.json(createSuccessResponse('Data retrieved successfully.', {
      list: getList,
      pagination: { currentPage: page, totalPages, perPageLimit, totalRecords }
    }));

  } catch (error) {
    next(error);
  }
};

const subCityDetail = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { id } = query;

    // Validate if the user object is available
    if (!user || !user.id || !user.username) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Check if required parameters are provided
    if (!id) {
      return res.status(400).json(createErrorResponse("Missing required parameters."));
    }
    else if (id && isNaN(id)) {
      return res.status(400).json(createErrorResponse("Invalid parameter value."));
    }

    const whereCondition = `WHERE 1=1`;
    const q = `
      SELECT 
        * FROM subcity
      ${whereCondition} AND id = ?
      ORDER BY id DESC;
    `;

    const recordDetail = await getTableRecord(q, [id], true);
    if (!recordDetail) {
      return res.status(400).json(createErrorResponse(message = "Record Not Found.", data = null, code = "RECORD_NOT_FOUND"));
    }

    res.json(createSuccessResponse('Data retrieved successfully.', recordDetail));

  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const subCitySave = async (req, res, next) => {
  let transaction;

  try {
    const { user, body } = req;
    const { id = '', countryId = '', cityId = '', subCity } = body;

    // Validate user session
    if (!user || !user?.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Start transaction
    transaction = await startTransaction();

    // Check if the subcity already exists (both for insert and update)
    const existingSubCity = await getTableRecord(
      `SELECT id FROM subcity WHERE country = ? AND city = ? AND subcity = ? LIMIT 1;`,
      [countryId, cityId, subCity],
      true
    );

    if (existingSubCity && (!id || existingSubCity.id !== id)) {
      await rollbackTransaction(transaction);
      return res.status(400).json(createErrorResponse('Duplicate record found.', null, 'DUPLICATE_RECORD'));
    }

    // Prepare record data
    let setRecordData = {
      date: new Date(),
      country: countryId,
      city: cityId,
      subcity: subCity,
    };

    if (id) {
      // Check if the record exists before updating
      const existingRecord = await getTableRecord(`SELECT id FROM subcity WHERE id = ? LIMIT 1;`, [id], true);
      if (!existingRecord) {
        await rollbackTransaction(transaction);
        return res.status(400).json(createErrorResponse('Record Not Found.', null, 'RECORD_NOT_FOUND'));
      }

      // Update the subcity
      const affectedRows = await updateRecord('subcity', setRecordData, { id }, transaction);
      console.log(`Updated record affectedRows:${affectedRows}`);
    } else {
      // Insert new subcity
      const recordInsertedId = await insertRecord('subcity', setRecordData, transaction);
      console.log(`Saved record Id:${recordInsertedId}`);
      setRecordData.id = recordInsertedId;
    }

    // Commit transaction
    await commitTransaction(transaction);
    res.json(createSuccessResponse('Record saved successfully.', setRecordData.id || id, 'RECORD_SAVED'));

  } catch (error) {
    if (transaction) await rollbackTransaction(transaction);
    next(error);
  }
};

const categoriesSeo = async (req, res, next) => {
  try {

    const settings = await getSettingsData();

    // Prepare metadata for headers
    const logo_img = settings.header_logo_path && fileExists(settings.header_logo_path) ? `${req.appBaseUrl}/uploads/${settings.header_logo_path}` : `${req.appBaseUrl}/uploads/backend/images/settings/header_logo_15477661460.png`;

    const header_data = {
      author: 'localxlist.org',
      title: `Categories | Localxlist`,
      description: `Categories | Localxlist`,
      keywords: "Categories | Localxlist",
      favicon: settings.favicon && fileExists(settings.favicon) ? `${req.appBaseUrl}/uploads/${settings.favicon}` : '',
      image: logo_img,

      ogType: "website",
      ogTitle: `Categories | Localxlist`,
      ogSiteName: "localxlist.org",
      ogUrl: "https://localxlist.org/",
      ogDescription: `Categories | Localxlist`,
      ogImage: logo_img,
      ogImageHeight: "377",

      twitterCard: "summary_large_image",
      twitterSite: "localxlist",
      twitterCreator: "localxlist",
      twitterTitle: `Categories | Localxlist`,
      twitterDescription: `Categories | Localxlist`,
      twitterImage: logo_img,
      generator: "localxlist.org",
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

const categories = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { page = 1, keyword = '' } = query;

    if (!user?.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    const perPageLimit = LIMIT.ADMIN_CATEGORIES || 10;
    const offset = (page - 1) * perPageLimit;

    let whereClauses = [];
    let queryParams = [];

    // Keyword search
    if (keyword.trim()) {
      whereClauses.push("(category LIKE ?)");
      const searchKeyword = `%${keyword}%`;
      queryParams.push(searchKeyword);
    }

    // Construct WHERE clause dynamically
    const whereCondition = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

    // Fetch total count for pagination
    const totalRecordCount = await executeQuery(`SELECT COUNT(id) AS total_count FROM category ${whereCondition};`, queryParams);
    const totalRecords = totalRecordCount[0]?.total_count || 0;
    const totalPages = Math.ceil(totalRecords / perPageLimit);

    // Fetch list
    let q = '';

    if (page == 0) {
      q = `
      SELECT 
      id, category FROM category
      ${whereCondition}
      ORDER BY id DESC;
    `;
    } else {
      q = `
      SELECT 
      id, category FROM category
      ${whereCondition}
      ORDER BY id DESC
      LIMIT ? OFFSET ?;
    `;
      queryParams.push(perPageLimit, offset);
    }
    const getList = await getTableRecord(q, queryParams);

    getList.forEach((item, index) => {
      item.srNo = offset + (index + 1);
    });

    res.json(createSuccessResponse('Data retrieved successfully.', {
      list: getList,
      pagination: { currentPage: page, totalPages, perPageLimit, totalRecords }
    }));

  } catch (error) {
    next(error);
  }
};

const categoryDetail = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { id } = query;

    // Validate if the user object is available
    if (!user || !user.id || !user.username) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Check if required parameters are provided
    if (!id) {
      return res.status(400).json(createErrorResponse("Missing required parameters."));
    }
    else if (id && isNaN(id)) {
      return res.status(400).json(createErrorResponse("Invalid parameter value."));
    }

    const whereCondition = `WHERE 1=1`;
    const q = `
      SELECT 
        id, 
        category FROM category
      ${whereCondition} AND id = ?
      ORDER BY id DESC;
    `;

    const recordDetail = await getTableRecord(q, [id], true);
    if (!recordDetail) {
      return res.status(400).json(createErrorResponse(message = "Record Not Found.", data = null, code = "RECORD_NOT_FOUND"));
    }

    res.json(createSuccessResponse('Data retrieved successfully.', recordDetail));

  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const categorySave = async (req, res, next) => {
  let transaction;

  try {
    const { user, body } = req;
    const { id = '', category = '' } = body;

    // Validate user session
    if (!user || !user?.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Start transaction
    transaction = await startTransaction();

    // Check if the category already exists (both for insert and update)
    const existingCategory = await getTableRecord(
      `SELECT id FROM category WHERE category = ? LIMIT 1;`,
      [category],
      true
    );

    if (existingCategory && (!id || existingCategory.id !== id)) {
      await rollbackTransaction(transaction);
      return res.status(400).json(createErrorResponse('Duplicate record found.', null, 'DUPLICATE_RECORD'));
    }

    // Prepare record data
    let setRecordData = {
      category: category,
    };

    if (id) {
      // Check if the record exists before updating
      const existingRecord = await getTableRecord(`SELECT id FROM category WHERE id = ? LIMIT 1;`, [id], true);
      if (!existingRecord) {
        await rollbackTransaction(transaction);
        return res.status(400).json(createErrorResponse('Record Not Found.', null, 'RECORD_NOT_FOUND'));
      }

      // Update the category
      const affectedRows = await updateRecord('category', setRecordData, { id }, transaction);
      console.log(`Updated record affectedRows:${affectedRows}`);
    } else {
      // Insert new category
      const recordInsertedId = await insertRecord('category', setRecordData, transaction);
      console.log(`Saved record Id:${recordInsertedId}`);
      setRecordData.id = recordInsertedId;
    }

    // Commit transaction
    await commitTransaction(transaction);
    res.json(createSuccessResponse('Record saved successfully.', setRecordData.id || id, 'RECORD_SAVED'));

  } catch (error) {
    if (transaction) await rollbackTransaction(transaction);
    next(error);
  }
};

const subCategoriesSeo = async (req, res, next) => {
  try {

    const settings = await getSettingsData();

    // Prepare metadata for headers
    const logo_img = settings.header_logo_path && fileExists(settings.header_logo_path) ? `${req.appBaseUrl}/uploads/${settings.header_logo_path}` : `${req.appBaseUrl}/uploads/backend/images/settings/header_logo_15477661460.png`;

    const header_data = {
      author: 'localxlist.org',
      title: `Sub Categories | Localxlist`,
      description: `Sub Categories | Localxlist`,
      keywords: "Sub Categories | Localxlist",
      favicon: settings.favicon && fileExists(settings.favicon) ? `${req.appBaseUrl}/uploads/${settings.favicon}` : '',
      image: logo_img,

      ogType: "website",
      ogTitle: `Sub Categories | Localxlist`,
      ogSiteName: "localxlist.org",
      ogUrl: "https://localxlist.org/",
      ogDescription: `Sub Categories | Localxlist`,
      ogImage: logo_img,
      ogImageHeight: "377",

      twitterCard: "summary_large_image",
      twitterSite: "localxlist",
      twitterCreator: "localxlist",
      twitterTitle: `Sub Categories | Localxlist`,
      twitterDescription: `Sub Categories | Localxlist`,
      twitterImage: logo_img,
      generator: "localxlist.org",
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

const subCategories = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { page = 1, keyword = '', categoryId = '' } = query;

    if (!user?.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    const perPageLimit = LIMIT.ADMIN_SUBCATEGORIES || 10;
    const offset = (page - 1) * perPageLimit;

    let whereClauses = [];
    let queryParams = [];

    // Keyword search
    if (keyword.trim()) {
      whereClauses.push("(subcategory.subcategory LIKE ?)");
      const searchKeyword = `%${keyword}%`;
      queryParams.push(searchKeyword);
    }


    if (categoryId) {
      whereClauses.push("subcategory.category IN (?)");
      queryParams.push(categoryId.split(','));
    }

    // Construct WHERE clause dynamically
    const whereCondition = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

    // Fetch total count for pagination
    const totalRecordCount = await executeQuery(`SELECT COUNT(id) AS total_count FROM subcategory ${whereCondition};`, queryParams);
    const totalRecords = totalRecordCount[0]?.total_count || 0;
    const totalPages = Math.ceil(totalRecords / perPageLimit);

    // Fetch user list
    let q = '';
    if (page == 0) {
      q = `
      SELECT 
      subcategory.id, subcategory.subcategory, category.id AS categoryId, category.category FROM subcategory LEFT JOIN category ON category.id = subcategory.category
      ${whereCondition}
      ORDER BY subcategory.id DESC;
    `;
    } else {
      q = `
      SELECT 
      subcategory.id, subcategory.subcategory, category.id AS categoryId, category.category FROM subcategory LEFT JOIN category ON category.id = subcategory.category
      ${whereCondition}
      ORDER BY subcategory.id DESC
      LIMIT ? OFFSET ?;
    `;
      queryParams.push(perPageLimit, offset);
    }

    const getList = await getTableRecord(q, queryParams);

    getList.forEach((item, index) => {
      item.srNo = offset + (index + 1);
    });

    res.json(createSuccessResponse('Data retrieved successfully.', {
      list: getList,
      pagination: { currentPage: page, totalPages, perPageLimit, totalRecords }
    }));

  } catch (error) {
    next(error);
  }
};

const subCategoryDetail = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { id } = query;

    // Validate if the user object is available
    if (!user || !user.id || !user.username) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Check if required parameters are provided
    if (!id) {
      return res.status(400).json(createErrorResponse("Missing required parameters."));
    }
    else if (id && isNaN(id)) {
      return res.status(400).json(createErrorResponse("Invalid parameter value."));
    }

    const whereCondition = `WHERE 1=1`;
    const q = `
      SELECT 
        * FROM subcategory
      ${whereCondition} AND id = ?
      ORDER BY id DESC;
    `;

    const recordDetail = await getTableRecord(q, [id], true);
    if (!recordDetail) {
      return res.status(400).json(createErrorResponse(message = "Record Not Found.", data = null, code = "RECORD_NOT_FOUND"));
    }

    res.json(createSuccessResponse('Data retrieved successfully.', recordDetail));

  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const subCategorySave = async (req, res, next) => {
  let transaction;

  try {
    const { user, body } = req;
    const { id = '', categoryId = '', subCategory } = body;

    // Validate user session
    if (!user || !user?.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Start transaction
    transaction = await startTransaction();

    // Check if the subCategory already exists (both for insert and update)
    const existingSubCategory = await getTableRecord(
      `SELECT id FROM subcategory WHERE category = ?  AND subcategory = ? LIMIT 1;`,
      [categoryId, subCategory],
      true
    );

    if (existingSubCategory && (!id || existingSubCategory.id !== id)) {
      await rollbackTransaction(transaction);
      return res.status(400).json(createErrorResponse('Duplicate record found.', null, 'DUPLICATE_RECORD'));
    }

    // Prepare record data
    let setRecordData = {
      category: categoryId,
      subcategory: subCategory,
    };

    if (id) {
      // Check if the record exists before updating
      const existingRecord = await getTableRecord(`SELECT id FROM subcategory WHERE id = ? LIMIT 1;`, [id], true);
      if (!existingRecord) {
        await rollbackTransaction(transaction);
        return res.status(400).json(createErrorResponse('Record Not Found.', null, 'RECORD_NOT_FOUND'));
      }

      // Update the subcategory
      const affectedRows = await updateRecord('subcategory', setRecordData, { id }, transaction);
      console.log(`Updated record affectedRows:${affectedRows}`);
    } else {
      // Insert new subcategory
      const recordInsertedId = await insertRecord('subcategory', setRecordData, transaction);
      console.log(`Saved record Id:${recordInsertedId}`);
      setRecordData.id = recordInsertedId;
    }

    // Commit transaction
    await commitTransaction(transaction);
    res.json(createSuccessResponse('Record saved successfully.', setRecordData.id || id, 'RECORD_SAVED'));

  } catch (error) {
    if (transaction) await rollbackTransaction(transaction);
    next(error);
  }
};

const adsSeo = async (req, res, next) => {
  try {

    const settings = await getSettingsData();

    // Prepare metadata for headers
    const logo_img = settings.header_logo_path && fileExists(settings.header_logo_path) ? `${req.appBaseUrl}/uploads/${settings.header_logo_path}` : `${req.appBaseUrl}/uploads/backend/images/settings/header_logo_15477661460.png`;

    const header_data = {
      author: 'localxlist.org',
      title: `Ads | Localxlist`,
      description: `Ads | Localxlist`,
      keywords: "Ads | Localxlist",
      favicon: settings.favicon && fileExists(settings.favicon) ? `${req.appBaseUrl}/uploads/${settings.favicon}` : '',
      image: logo_img,

      ogType: "website",
      ogTitle: `Ads | Localxlist`,
      ogSiteName: "localxlist.org",
      ogUrl: "https://localxlist.org/",
      ogDescription: `Ads | Localxlist`,
      ogImage: logo_img,
      ogImageHeight: "377",

      twitterCard: "summary_large_image",
      twitterSite: "localxlist",
      twitterCreator: "localxlist",
      twitterTitle: `Ads | Localxlist`,
      twitterDescription: `Ads | Localxlist`,
      twitterImage: logo_img,
      generator: "localxlist.org",
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

const ads = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { page = 1, keyword = '' } = query;

    if (!user?.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    const perPageLimit = LIMIT.ADMIN_MAIN_ADS || 10;
    const offset = (page - 1) * perPageLimit;

    let whereClauses = [];
    let queryParams = [];

    // Keyword search
    if (keyword.trim()) {
      whereClauses.push("(target_url LIKE ?)");
      const searchKeyword = `%${keyword}%`;
      queryParams.push(searchKeyword);
    }

    // Construct WHERE clause dynamically
    const whereCondition = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

    // Fetch total count for pagination
    const totalRecordCount = await executeQuery(`SELECT COUNT(id) AS total_count FROM ad ${whereCondition};`, queryParams);
    const totalRecords = totalRecordCount[0]?.total_count || 0;
    const totalPages = Math.ceil(totalRecords / perPageLimit);

    // Fetch user list
    const q = `
      SELECT 
      id, target_url, path, status FROM ad
      ${whereCondition}
      ORDER BY id DESC
      LIMIT ? OFFSET ?;
    `;
    queryParams.push(perPageLimit, offset);
    const getList = await getTableRecord(q, queryParams);

    getList.forEach((item, index) => {
      item.srNo = offset + (index + 1);
      item.imgFullPath = item?.path && fileExists(item?.path) ? `${req.appBaseUrl}/uploads/${item.path}` : `${req.appBaseUrl}/uploads/${COMMON_CONFIG.admin.DEFAULT_NO_IMG}`;
      item.status = item.status == 1 ? "Enabled" : "Disabled";
    });

    res.json(createSuccessResponse('Data retrieved successfully.', {
      list: getList,
      pagination: { currentPage: page, totalPages, perPageLimit, totalRecords }
    }));

  } catch (error) {
    next(error);
  }
};

const adDetail = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { id } = query;

    // Validate if the user object is available
    if (!user || !user.id || !user.username) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Check if required parameters are provided
    if (!id) {
      return res.status(400).json(createErrorResponse("Missing required parameters."));
    }
    else if (id && isNaN(id)) {
      return res.status(400).json(createErrorResponse("Invalid parameter value."));
    }

    const whereCondition = `WHERE 1=1`;
    const q = `
      SELECT 
        id, target_url, path, status FROM ad
      ${whereCondition} AND id = ?
      ORDER BY id DESC;
    `;

    const recordDetail = await getTableRecord(q, [id], true);
    if (!recordDetail) {
      return res.status(400).json(createErrorResponse(message = "Record Not Found.", data = null, code = "RECORD_NOT_FOUND"));
    }
    recordDetail.imgFullPath = recordDetail?.path && fileExists(recordDetail?.path) ? `${req.appBaseUrl}/uploads/${recordDetail.path}` : `${req.appBaseUrl}/uploads/${COMMON_CONFIG.admin.DEFAULT_NO_IMG}`;

    res.json(createSuccessResponse('Data retrieved successfully.', recordDetail));

  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const adSave = async (req, res, next) => {
  let transaction;
  let uploadedFiles = [];

  const deleteUploadedFilesWhenError = (filePaths) => {
    if (filePaths && filePaths.length > 0) {
      filePaths.forEach((filePath) => {
        console.log("Deleting:", filePath);

        fs.unlink(filePath, (err) => {
          if (err) {
            console.error(`Failed to delete file: ${filePath}`, err);
          } else {
            console.log(`File deleted: ${filePath}`);
          }
        });
      });
    }
  };

  try {
    const { user, body, file } = req;
    const { id = '', url, status } = body;

    // Access uploaded file
    const imageFileName = file && file?.filename || "";
    const imageFilePath = `${UPLOADED_PATH.ADMIN_AD_IMAGE}/${imageFileName}`;

    // Collect file paths for deletion if needed
    uploadedFiles = [file?.path || ""].filter(Boolean);

    // Validate user session
    if (!user || !user?.id) {
      deleteUploadedFilesWhenError(uploadedFiles);

      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }


    // Start transaction
    transaction = await startTransaction();

    // Prepare record data
    let setRecordData = {
      target_url: url, status: status == "true" ? 1 : 0
    };

    if (id) {
      // Check if the record exists before updating
      const existingRecord = await getTableRecord(`SELECT id,path FROM ad WHERE id = ? LIMIT 1;`, [id], true);
      if (!existingRecord) {
        deleteUploadedFilesWhenError(uploadedFiles);
        await rollbackTransaction(transaction);
        return res.status(400).json(createErrorResponse('Record Not Found.', null, 'RECORD_NOT_FOUND'));
      }

      if (imageFileName) {
        // Delete the image file if it exists
        const oldImagePath = existingRecord.path ? path.join(global.uploadsBaseDir, existingRecord.path) : null;
        if (oldImagePath) {
          try {
            await fs.promises.access(oldImagePath); // Check if the logo exists
            await fs.promises.unlink(oldImagePath); // Delete the logo
          } catch (err) {
            console.error(`Error deleting image: ${existingRecord.path}:`, err);
          }
        }
        // update with new
        setRecordData.path = imageFileName && imageFilePath || "";
      }

      // Update the ad
      const affectedRows = await updateRecord('ad', setRecordData, { id }, transaction);
      console.log(`Updated record affectedRows:${affectedRows}`);
    } else {
      // Insert new ad
      const recordInsertedId = await insertRecord('ad', setRecordData, transaction);
      console.log(`Saved record Id:${recordInsertedId}`);
      setRecordData.id = recordInsertedId;
    }

    // Commit transaction
    await commitTransaction(transaction);
    res.json(createSuccessResponse('Record saved successfully.', setRecordData.id || id, 'RECORD_SAVED'));

  } catch (error) {
    deleteUploadedFilesWhenError(uploadedFiles);
    if (transaction) await rollbackTransaction(transaction);
    next(error);
  }
};

const sliderAdsSeo = async (req, res, next) => {
  try {

    const settings = await getSettingsData();

    // Prepare metadata for headers
    const logo_img = settings.header_logo_path && fileExists(settings.header_logo_path) ? `${req.appBaseUrl}/uploads/${settings.header_logo_path}` : `${req.appBaseUrl}/uploads/backend/images/settings/header_logo_15477661460.png`;

    const header_data = {
      author: 'localxlist.org',
      title: `Slider Ads | Localxlist`,
      description: `Slider Ads | Localxlist`,
      keywords: "Slider Ads | Localxlist",
      favicon: settings.favicon && fileExists(settings.favicon) ? `${req.appBaseUrl}/uploads/${settings.favicon}` : '',
      image: logo_img,

      ogType: "website",
      ogTitle: `Slider Ads | Localxlist`,
      ogSiteName: "localxlist.org",
      ogUrl: "https://localxlist.org/",
      ogDescription: `Slider Ads | Localxlist`,
      ogImage: logo_img,
      ogImageHeight: "377",

      twitterCard: "summary_large_image",
      twitterSite: "localxlist",
      twitterCreator: "localxlist",
      twitterTitle: `Slider Ads | Localxlist`,
      twitterDescription: `Slider Ads | Localxlist`,
      twitterImage: logo_img,
      generator: "localxlist.org",
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

const sliderAds = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { page = 1, keyword = '', type = '' } = query;

    if (!user?.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    const perPageLimit = LIMIT.ADMIN_SLIDER_ADS || 10;
    const offset = (page - 1) * perPageLimit;

    let whereClauses = [];
    let queryParams = [];

    // Keyword search
    if (keyword.trim()) {
      whereClauses.push("(url LIKE ?)");
      const searchKeyword = `%${keyword}%`;
      queryParams.push(searchKeyword);
    }

    if (type) {
      whereClauses.push("type = ?");
      queryParams.push(type);
    }

    // Construct WHERE clause dynamically
    const whereCondition = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

    // Fetch total count for pagination
    const totalRecordCount = await executeQuery(`SELECT COUNT(id) AS total_count FROM slider_ad ${whereCondition};`, queryParams);
    const totalRecords = totalRecordCount[0]?.total_count || 0;
    const totalPages = Math.ceil(totalRecords / perPageLimit);

    // Fetch user list
    const q = `
      SELECT 
      id, url, img, type, status FROM slider_ad
      ${whereCondition}
      ORDER BY id DESC
      LIMIT ? OFFSET ?;
    `;
    queryParams.push(perPageLimit, offset);
    const getList = await getTableRecord(q, queryParams);

    getList.forEach((item, index) => {
      item.srNo = offset + (index + 1);
      item.imgFullPath = item?.img && fileExists(item?.img) ? `${req.appBaseUrl}/uploads/${item.img}` : `${req.appBaseUrl}/uploads/${COMMON_CONFIG.admin.DEFAULT_NO_IMG}`;
      item.status = item.status == 1 ? "Enabled" : "Disabled";
    });

    res.json(createSuccessResponse('Data retrieved successfully.', {
      list: getList,
      pagination: { currentPage: page, totalPages, perPageLimit, totalRecords }
    }));

  } catch (error) {
    next(error);
  }
};

const sliderAdsDetail = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { id } = query;

    // Validate if the user object is available
    if (!user || !user.id || !user.username) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Check if required parameters are provided
    if (!id) {
      return res.status(400).json(createErrorResponse("Missing required parameters."));
    }
    else if (id && isNaN(id)) {
      return res.status(400).json(createErrorResponse("Invalid parameter value."));
    }

    const whereCondition = `WHERE 1=1`;
    const q = `
      SELECT 
        id, 
        url, img, type, status FROM slider_ad
      ${whereCondition} AND id = ?
      ORDER BY id DESC;
    `;

    const recordDetail = await getTableRecord(q, [id], true);
    if (!recordDetail) {
      return res.status(400).json(createErrorResponse(message = "Record Not Found.", data = null, code = "RECORD_NOT_FOUND"));
    }

    recordDetail.imgFullPath = recordDetail?.img && fileExists(recordDetail?.img) ? `${req.appBaseUrl}/uploads/${recordDetail.img}` : `${req.appBaseUrl}/uploads/${COMMON_CONFIG.admin.DEFAULT_NO_IMG}`;


    res.json(createSuccessResponse('Data retrieved successfully.', recordDetail));

  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const sliderAdsSave = async (req, res, next) => {
  let transaction;
  let uploadedFiles = [];

  const deleteUploadedFilesWhenError = (filePaths) => {
    if (filePaths && filePaths.length > 0) {
      filePaths.forEach((filePath) => {
        console.log("Deleting:", filePath);

        fs.unlink(filePath, (err) => {
          if (err) {
            console.error(`Failed to delete file: ${filePath}`, err);
          } else {
            console.log(`File deleted: ${filePath}`);
          }
        });
      });
    }
  };

  try {
    const { user, body, file } = req;
    const { id = '', url, type, status } = body;

    // Access uploaded file
    const imageFileName = file && file?.filename || "";
    const imageFilePath = `${UPLOADED_PATH.ADMIN_SLIDER_AD_IMAGE}/${imageFileName}`;

    // Collect file paths for deletion if needed
    uploadedFiles = [file?.path || ""].filter(Boolean);

    // Validate user session
    if (!user || !user?.id) {
      deleteUploadedFilesWhenError(uploadedFiles);

      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Start transaction
    transaction = await startTransaction();

    // Prepare record data
    let setRecordData = {
      url: url,
      type: type,
      status: status == "true" ? 1 : 0
    };

    if (id) {
      // Check if the record exists before updating
      const existingRecord = await getTableRecord(`SELECT id, img AS path FROM slider_ad WHERE id = ? LIMIT 1;`, [id], true);
      if (!existingRecord) {
        deleteUploadedFilesWhenError(uploadedFiles);
        await rollbackTransaction(transaction);
        return res.status(400).json(createErrorResponse('Record Not Found.', null, 'RECORD_NOT_FOUND'));
      }

      if (imageFileName) {
        // Delete the image file if it exists
        const oldImagePath = existingRecord.path ? path.join(global.uploadsBaseDir, existingRecord.path) : null;
        if (oldImagePath) {
          try {
            await fs.promises.access(oldImagePath); // Check if the logo exists
            await fs.promises.unlink(oldImagePath); // Delete the logo
          } catch (err) {
            console.error(`Error deleting image: ${existingRecord.path}:`, err);
          }
        }
        // update with new
        setRecordData.img = imageFileName && imageFilePath || "";
      }

      // Update the record
      const affectedRows = await updateRecord('slider_ad', setRecordData, { id }, transaction);
      console.log(`Updated record affectedRows:${affectedRows}`);
    } else {
      if (!imageFileName) {
        return res.status(400).json(createValidationErrorResponse("Image is required.", []));
      }
      // Insert new slider ads
      setRecordData.img = imageFileName && imageFilePath || "";
      const recordInsertedId = await insertRecord('slider_ad', setRecordData, transaction);
      console.log(`Saved record Id:${recordInsertedId}`);
      setRecordData.id = recordInsertedId;
    }

    // Commit transaction
    await commitTransaction(transaction);
    res.json(createSuccessResponse('Record saved successfully.', setRecordData.id || id, 'RECORD_SAVED'));

  } catch (error) {
    deleteUploadedFilesWhenError(uploadedFiles);
    if (transaction) await rollbackTransaction(transaction);
    next(error);
  }
};

const postAdsSeo = async (req, res, next) => {
  try {

    const settings = await getSettingsData();

    // Prepare metadata for headers
    const logo_img = settings.header_logo_path && fileExists(settings.header_logo_path) ? `${req.appBaseUrl}/uploads/${settings.header_logo_path}` : `${req.appBaseUrl}/uploads/backend/images/settings/header_logo_15477661460.png`;

    const header_data = {
      author: 'localxlist.org',
      title: `Post Ads | Localxlist`,
      description: `Post Ads | Localxlist`,
      keywords: "Post Ads | Localxlist",
      favicon: settings.favicon && fileExists(settings.favicon) ? `${req.appBaseUrl}/uploads/${settings.favicon}` : '',
      image: logo_img,

      ogType: "website",
      ogTitle: `Post Ads | Localxlist`,
      ogSiteName: "localxlist.org",
      ogUrl: "https://localxlist.org/",
      ogDescription: `Post Ads | Localxlist`,
      ogImage: logo_img,
      ogImageHeight: "377",

      twitterCard: "summary_large_image",
      twitterSite: "localxlist",
      twitterCreator: "localxlist",
      twitterTitle: `Post Ads | Localxlist`,
      twitterDescription: `Post Ads | Localxlist`,
      twitterImage: logo_img,
      generator: "localxlist.org",
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

const postAds = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { page = 1, keyword = '' } = query;

    if (!user?.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    const perPageLimit = LIMIT.ADMIN_POST_ADS || 10;
    const offset = (page - 1) * perPageLimit;

    let whereClauses = [];
    let queryParams = [];

    // Keyword search
    if (keyword.trim()) {
      whereClauses.push("(target_url LIKE ?)");
      const searchKeyword = `%${keyword}%`;
      queryParams.push(searchKeyword);
    }


    // Construct WHERE clause dynamically
    const whereCondition = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

    // Fetch total count for pagination
    const totalRecordCount = await executeQuery(`SELECT COUNT(id) AS total_count FROM post_ads ${whereCondition};`, queryParams);
    const totalRecords = totalRecordCount[0]?.total_count || 0;
    const totalPages = Math.ceil(totalRecords / perPageLimit);

    // Fetch list
    const q = `
      SELECT 
      id, target_url,	path,	status	 FROM post_ads
      ${whereCondition}
      ORDER BY id DESC
      LIMIT ? OFFSET ?;
    `;
    queryParams.push(perPageLimit, offset);
    const getList = await getTableRecord(q, queryParams);

    getList.forEach((item, index) => {
      item.srNo = offset + (index + 1);
      item.imgFullPath = item?.path && fileExists(item?.path) ? `${req.appBaseUrl}/uploads/${item.path}` : `${req.appBaseUrl}/uploads/${COMMON_CONFIG.admin.DEFAULT_NO_IMG}`;
      item.status = item.status == 1 ? 'Enabled' : 'Disabled';
    });

    res.json(createSuccessResponse('Data retrieved successfully.', {
      list: getList,
      pagination: { currentPage: page, totalPages, perPageLimit, totalRecords }
    }));

  } catch (error) {
    next(error);
  }
};

const postAdsDetail = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { id } = query;

    // Validate if the user object is available
    if (!user || !user.id || !user.username) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Check if required parameters are provided
    if (!id) {
      return res.status(400).json(createErrorResponse("Missing required parameters."));
    }
    else if (id && isNaN(id)) {
      return res.status(400).json(createErrorResponse("Invalid parameter value."));
    }

    const whereCondition = `WHERE 1=1`;
    const q = `
      SELECT 
        id, 
        target_url,	path,	status FROM post_ads
      ${whereCondition} AND id = ?
      ORDER BY id DESC;
    `;

    const recordDetail = await getTableRecord(q, [id], true);
    if (!recordDetail) {
      return res.status(400).json(createErrorResponse(message = "Record Not Found.", data = null, code = "RECORD_NOT_FOUND"));
    }

    recordDetail.imgFullPath = recordDetail?.path && fileExists(recordDetail?.path) ? `${req.appBaseUrl}/uploads/${recordDetail.path}` : `${req.appBaseUrl}/uploads/${COMMON_CONFIG.admin.DEFAULT_NO_IMG}`;


    res.json(createSuccessResponse('Data retrieved successfully.', recordDetail));

  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const postAdsSave = async (req, res, next) => {
  let transaction;
  let uploadedFiles = [];

  const deleteUploadedFilesWhenError = (filePaths) => {
    if (filePaths && filePaths.length > 0) {
      filePaths.forEach((filePath) => {
        console.log("Deleting:", filePath);

        fs.unlink(filePath, (err) => {
          if (err) {
            console.error(`Failed to delete file: ${filePath}`, err);
          } else {
            console.log(`File deleted: ${filePath}`);
          }
        });
      });
    }
  };

  try {
    const { user, body, file } = req;
    const { id = '', target_url, status } = body;

    // Access uploaded file
    const imageFileName = file && file?.filename || "";
    const imageFilePath = `${UPLOADED_PATH.ADMIN_POST_AD_IMAGE}/${imageFileName}`;

    // Collect file paths for deletion if needed
    uploadedFiles = [file?.path || ""].filter(Boolean);

    // Validate user session
    if (!user || !user?.id) {
      deleteUploadedFilesWhenError(uploadedFiles);

      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Start transaction
    transaction = await startTransaction();

    // Prepare record data
    let setRecordData = {
      target_url, status: status == "true" ? 1 : 0
    };

    if (id) {
      // Check if the record exists before updating
      const existingRecord = await getTableRecord(`SELECT id, path FROM post_ads WHERE id = ? LIMIT 1;`, [id], true);
      if (!existingRecord) {
        deleteUploadedFilesWhenError(uploadedFiles);
        await rollbackTransaction(transaction);
        return res.status(400).json(createErrorResponse('Record Not Found.', null, 'RECORD_NOT_FOUND'));
      }

      if (imageFileName) {
        // Delete the image file if it exists
        const oldImagePath = existingRecord.path ? path.join(global.uploadsBaseDir, existingRecord.path) : null;
        if (oldImagePath) {
          try {
            await fs.promises.access(oldImagePath); // Check if the logo exists
            await fs.promises.unlink(oldImagePath); // Delete the logo
          } catch (err) {
            console.error(`Error deleting image: ${existingRecord.path}:`, err);
          }
        }
        // update with new
        setRecordData.path = imageFileName && imageFilePath || "";
      }

      // Update the record
      const affectedRows = await updateRecord('post_ads', setRecordData, { id }, transaction);
      console.log(`Updated record affectedRows:${affectedRows}`);
    } else {
      if (!imageFileName) {
        return res.status(400).json(createValidationErrorResponse("Image is required.", []));
      }
      setRecordData.path = imageFileName && imageFilePath || "";

      // Insert new record
      const recordInsertedId = await insertRecord('post_ads', setRecordData, transaction);
      console.log(`Saved record Id:${recordInsertedId}`);
      setRecordData.id = recordInsertedId;
    }

    // Commit transaction
    await commitTransaction(transaction);
    res.json(createSuccessResponse('Record saved successfully.', setRecordData.id || id, 'RECORD_SAVED'));

  } catch (error) {
    deleteUploadedFilesWhenError(uploadedFiles);
    if (transaction) await rollbackTransaction(transaction);
    next(error);
  }
};

const newPostAdsSeo = async (req, res, next) => {
  try {

    const settings = await getSettingsData();

    // Prepare metadata for headers
    const logo_img = settings.header_logo_path && fileExists(settings.header_logo_path) ? `${req.appBaseUrl}/uploads/${settings.header_logo_path}` : `${req.appBaseUrl}/uploads/backend/images/settings/header_logo_15477661460.png`;

    const header_data = {
      author: 'localxlist.org',
      title: `New Post Ads | Localxlist`,
      description: `New Post Ads | Localxlist`,
      keywords: "New Post Ads | Localxlist",
      favicon: settings.favicon && fileExists(settings.favicon) ? `${req.appBaseUrl}/uploads/${settings.favicon}` : '',
      image: logo_img,

      ogType: "website",
      ogTitle: `New Post Ads | Localxlist`,
      ogSiteName: "localxlist.org",
      ogUrl: "https://localxlist.org/",
      ogDescription: `New Post Ads | Localxlist`,
      ogImage: logo_img,
      ogImageHeight: "377",

      twitterCard: "summary_large_image",
      twitterSite: "localxlist",
      twitterCreator: "localxlist",
      twitterTitle: `New Post Ads | Localxlist`,
      twitterDescription: `New Post Ads | Localxlist`,
      twitterImage: logo_img,
      generator: "localxlist.org",
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

const newPostAds = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { page = 1, keyword = '' } = query;

    if (!user?.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    const perPageLimit = LIMIT.ADMIN_NEW_POST_ADS || 10;
    const offset = (page - 1) * perPageLimit;

    let whereClauses = [];
    let queryParams = [];

    // Keyword search
    if (keyword.trim()) {
      whereClauses.push("(title LIKE ? OR content LIKE ?)");
      const searchKeyword = `%${keyword}%`;
      queryParams.push(searchKeyword, searchKeyword);
    }


    // Construct WHERE clause dynamically
    const whereCondition = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

    // Fetch total count for pagination
    const totalRecordCount = await executeQuery(`SELECT COUNT(id) AS total_count FROM new_post_ads ${whereCondition};`, queryParams);
    const totalRecords = totalRecordCount[0]?.total_count || 0;
    const totalPages = Math.ceil(totalRecords / perPageLimit);

    // Fetch list
    const q = `
      SELECT 
      id, 
      title, 
      content AS url, 
      status, 
      target_blank, 
      position, 
      created_at, 
      (SELECT click_count FROM post_ad_total_view WHERE post_ad_id = new_post_ads.id) AS total_clicked_count, 	 
      (SELECT click_count FROM new_post_ad_count WHERE post_ad_id = new_post_ads.id AND click_date = CURRENT_DATE()) AS today_clicked_count 	 
      FROM new_post_ads
      ${whereCondition}
      ORDER BY id DESC
      LIMIT ? OFFSET ?;
`;

    queryParams.push(perPageLimit, offset);
    const getList = await getTableRecord(q, queryParams);

    getList.forEach((item, index) => {
      item.srNo = offset + (index + 1);
      item.status = item.status == 1 ? 'Enabled' : 'Disabled';
      item.target_blank = item.target_blank == 1 ? 'Enabled' : 'Disabled';
      item.total_clicked_count = item?.total_clicked_count || 0;
      item.today_clicked_count = item?.today_clicked_count || 0;
    });

    res.json(createSuccessResponse('Data retrieved successfully.', {
      list: getList,
      pagination: { currentPage: page, totalPages, perPageLimit, totalRecords }
    }));

  } catch (error) {
    next(error);
  }
};

const newPostAdsDetail = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { id } = query;

    // Validate if the user object is available
    if (!user || !user.id || !user.username) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Check if required parameters are provided
    if (!id) {
      return res.status(400).json(createErrorResponse("Missing required parameters."));
    }
    else if (id && isNaN(id)) {
      return res.status(400).json(createErrorResponse("Invalid parameter value."));
    }

    const whereCondition = `WHERE 1=1`;
    const q = `
      SELECT 
        id, 
        title, content, status, target_blank, position	 FROM new_post_ads
      ${whereCondition} AND id = ?
      ORDER BY id DESC;
    `;

    const recordDetail = await getTableRecord(q, [id], true);
    if (!recordDetail) {
      return res.status(400).json(createErrorResponse(message = "Record Not Found.", data = null, code = "RECORD_NOT_FOUND"));
    }

    res.json(createSuccessResponse('Data retrieved successfully.', recordDetail));

  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const newPostAdsSave = async (req, res, next) => {
  let transaction;

  try {
    const { user, body } = req;
    const { id = '', title, content, status, target_blank, position } = body;

    // Validate user session
    if (!user || !user?.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Start transaction
    transaction = await startTransaction();

    // Prepare record data
    let setRecordData = {
      title,
      content,
      status: status === 'true' ? 1 : 0,  // Convert to boolean before applying ternary
      target_blank: target_blank === 'true' ? 1 : 0,
      position
    };

    if (id) {
      // Check if the record exists before updating
      const existingRecord = await getTableRecord(`SELECT id FROM new_post_ads WHERE id = ? LIMIT 1;`, [id], true);
      if (!existingRecord) {
        await rollbackTransaction(transaction);
        return res.status(400).json(createErrorResponse('Record Not Found.', null, 'RECORD_NOT_FOUND'));
      }

      // Update the record
      const affectedRows = await updateRecord('new_post_ads', setRecordData, { id }, transaction);
      console.log(`Updated record affectedRows:${affectedRows}`);
    } else {
      // Insert new record
      const recordInsertedId = await insertRecord('new_post_ads', setRecordData, transaction);
      console.log(`Saved record Id:${recordInsertedId}`);
      setRecordData.id = recordInsertedId;
    }

    // Commit transaction
    await commitTransaction(transaction);
    res.json(createSuccessResponse('Record saved successfully.', setRecordData.id || id, 'RECORD_SAVED'));

  } catch (error) {
    deleteUploadedFilesWhenError(uploadedFiles);
    if (transaction) await rollbackTransaction(transaction);
    next(error);
  }
};

const googleAdsSeo = async (req, res, next) => {
  try {

    const settings = await getSettingsData();

    // Prepare metadata for headers
    const logo_img = settings.header_logo_path && fileExists(settings.header_logo_path) ? `${req.appBaseUrl}/uploads/${settings.header_logo_path}` : `${req.appBaseUrl}/uploads/backend/images/settings/header_logo_15477661460.png`;

    const header_data = {
      author: 'localxlist.org',
      title: `Google Ads | Localxlist`,
      description: `Google Ads | Localxlist`,
      keywords: "Google Ads | Localxlist",
      favicon: settings.favicon && fileExists(settings.favicon) ? `${req.appBaseUrl}/uploads/${settings.favicon}` : '',
      image: logo_img,

      ogType: "website",
      ogTitle: `Google Ads | Localxlist`,
      ogSiteName: "localxlist.org",
      ogUrl: "https://localxlist.org/",
      ogDescription: `Google Ads | Localxlist`,
      ogImage: logo_img,
      ogImageHeight: "377",

      twitterCard: "summary_large_image",
      twitterSite: "localxlist",
      twitterCreator: "localxlist",
      twitterTitle: `Google Ads | Localxlist`,
      twitterDescription: `Google Ads | Localxlist`,
      twitterImage: logo_img,
      generator: "localxlist.org",
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

const googleAds = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { page = 1, keyword = '' } = query;

    if (!user?.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    const perPageLimit = LIMIT.ADMIN_GOOGLE_ADS || 10;
    const offset = (page - 1) * perPageLimit;

    let whereClauses = [];
    let queryParams = [];

    // Keyword search
    if (keyword.trim()) {
      whereClauses.push("(ad_type LIKE ? OR content LIKE ?)");
      const searchKeyword = `%${keyword.trim()}%`;
      queryParams.push(searchKeyword, searchKeyword);
    }

    // Construct WHERE clause dynamically
    const whereCondition = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

    // Fetch total count for pagination
    const totalRecordCount = await executeQuery(`SELECT COUNT(id) AS total_count FROM google_ads ${whereCondition};`, queryParams);
    const totalRecords = totalRecordCount[0]?.total_count || 0;
    const totalPages = Math.ceil(totalRecords / perPageLimit);

    // Fetch list
    const q = `
      SELECT 
      id, 
      ad_type, 
      content, 
      status, 
      created_at
      FROM google_ads
      ${whereCondition}
      ORDER BY id DESC
      LIMIT ? OFFSET ?;
`;

    queryParams.push(perPageLimit, offset);
    const getList = await getTableRecord(q, queryParams);

    const adType = [
      {
        label: 'PopCode',
        value: 'popcode',
      },
      {
        label: 'Iframe',
        value: 'iframe',
      },
      {
        label: 'HTML',
        value: 'html',
      },
      {
        label: 'Banner',
        value: 'banner',
      },
    ];

    getList.forEach((item, index) => {
      item.srNo = offset + (index + 1);
      item.status = item.status == 1 ? 'Enabled' : 'Disabled';
      item.ad_type = adType.find(adItem => adItem.value === item.ad_type)?.label || item.ad_type;

    });

    res.json(createSuccessResponse('Data retrieved successfully.', {
      list: getList,
      pagination: { currentPage: page, totalPages, perPageLimit, totalRecords }
    }));

  } catch (error) {
    next(error);
  }
};

const googleAdsDetail = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { id } = query;

    // Validate if the user object is available
    if (!user || !user.id || !user.username) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Check if required parameters are provided
    if (!id) {
      return res.status(400).json(createErrorResponse("Missing required parameters."));
    }
    else if (id && isNaN(id)) {
      return res.status(400).json(createErrorResponse("Invalid parameter value."));
    }

    const whereCondition = `WHERE 1=1`;
    const q = `
      SELECT 
      id, 
      ad_type, 
      content, 
      status, 
      created_at	 
      FROM google_ads
      ${whereCondition} AND id = ?
      ORDER BY id DESC;
    `;

    const recordDetail = await getTableRecord(q, [id], true);
    if (!recordDetail) {
      return res.status(400).json(createErrorResponse(message = "Record Not Found.", data = null, code = "RECORD_NOT_FOUND"));
    }

    res.json(createSuccessResponse('Data retrieved successfully.', recordDetail));

  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const googleAdsSave = async (req, res, next) => {
  let transaction;

  try {
    const { user, body } = req;
    const { id = '', ad_type, content, status } = body;

    // Validate user session
    if (!user || !user?.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Start transaction
    transaction = await startTransaction();

    // Prepare record data
    let setRecordData = {
      ad_type,
      content,
      status: (status === true || status === 'true') ? 1 : 0
    };

    if (id) {
      // Check if the record exists before updating
      const existingRecord = await getTableRecord(`SELECT id FROM google_ads WHERE id = ? LIMIT 1;`, [id], true);
      if (!existingRecord) {
        await rollbackTransaction(transaction);
        return res.status(400).json(createErrorResponse('Record Not Found.', null, 'RECORD_NOT_FOUND'));
      }

      // Update the record
      const affectedRows = await updateRecord('google_ads', setRecordData, { id }, transaction);
      console.log(`Updated record affectedRows:${affectedRows}`);
    } else {
      // Insert new record
      const recordInsertedId = await insertRecord('google_ads', setRecordData, transaction);
      console.log(`Saved record Id:${recordInsertedId}`);
      setRecordData.id = recordInsertedId;
    }

    // Commit transaction
    await commitTransaction(transaction);
    res.json(createSuccessResponse('Record saved successfully.', setRecordData.id || id, 'RECORD_SAVED'));

  } catch (error) {
    if (transaction) await rollbackTransaction(transaction);
    next(error);
  }
};

const categoryOrPostAdsSeo = async (req, res, next) => {
  try {

    const settings = await getSettingsData();

    // Prepare metadata for headers
    const logo_img = settings.header_logo_path && fileExists(settings.header_logo_path) ? `${req.appBaseUrl}/uploads/${settings.header_logo_path}` : `${req.appBaseUrl}/uploads/backend/images/settings/header_logo_15477661460.png`;

    const header_data = {
      author: 'localxlist.org',
      title: `Category Post Ads | Localxlist`,
      description: `Category Post Ads | Localxlist`,
      keywords: "Category Post Ads | Localxlist",
      favicon: settings.favicon && fileExists(settings.favicon) ? `${req.appBaseUrl}/uploads/${settings.favicon}` : '',
      image: logo_img,

      ogType: "website",
      ogTitle: `Category Post Ads | Localxlist`,
      ogSiteName: "localxlist.org",
      ogUrl: "https://localxlist.org/",
      ogDescription: `Category Post Ads | Localxlist`,
      ogImage: logo_img,
      ogImageHeight: "377",

      twitterCard: "summary_large_image",
      twitterSite: "localxlist",
      twitterCreator: "localxlist",
      twitterTitle: `Category Post Ads | Localxlist`,
      twitterDescription: `Category Post Ads | Localxlist`,
      twitterImage: logo_img,
      generator: "localxlist.org",
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

const categoryOrPostAds = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { page = 1, keyword = '', adsType = '' } = query;

    if (!user?.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    const perPageLimit = LIMIT.ADMIN_CATEGORY_POST_ADS || 10;
    const offset = (page - 1) * perPageLimit;

    let whereClauses = [];
    let queryParams = [];

    // Keyword search
    if (keyword.trim()) {
      whereClauses.push("(target_url LIKE ? OR ads_type LIKE ?)");
      const searchKeyword = `%${keyword}%`;
      queryParams.push(searchKeyword, searchKeyword);
    }

    if (adsType) {
      whereClauses.push("ads_type = ?");
      queryParams.push(adsType);
    }


    // Construct WHERE clause dynamically
    const whereCondition = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

    // Fetch total count for pagination
    const totalRecordCount = await executeQuery(`SELECT COUNT(id) AS total_count FROM cat_post_ads ${whereCondition};`, queryParams);
    const totalRecords = totalRecordCount[0]?.total_count || 0;
    const totalPages = Math.ceil(totalRecords / perPageLimit);

    // Fetch list
    const q = `
      SELECT 
      id, title, target_url, active_yn, ads_type, target_blank, path FROM cat_post_ads
      ${whereCondition}
      ORDER BY id DESC
      LIMIT ? OFFSET ?;
    `;
    queryParams.push(perPageLimit, offset);
    const getList = await getTableRecord(q, queryParams);

    getList.forEach((item, index) => {
      item.srNo = offset + (index + 1);
      item.imgFullPath = item?.path && fileExists(item?.path) ? `${req.appBaseUrl}/uploads/${item.path}` : `${req.appBaseUrl}/uploads/${COMMON_CONFIG.admin.DEFAULT_NO_IMG}`;

      item.status = item.active_yn == 'Y' ? 'Enabled' : 'Disabled';
      item.target_blank = item.target_blank == 1 ? 'Enabled' : 'Disabled';
      item.ads_type = item.ads_type == 'category' ? 'Category' : 'Post';

    });

    res.json(createSuccessResponse('Data retrieved successfully.', {
      list: getList,
      pagination: { currentPage: page, totalPages, perPageLimit, totalRecords }
    }));

  } catch (error) {
    next(error);
  }
};

const categoryOrPostAdsDetail = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { id } = query;

    // Validate if the user object is available
    if (!user || !user.id || !user.username) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Check if required parameters are provided
    if (!id) {
      return res.status(400).json(createErrorResponse("Missing required parameters."));
    }
    else if (id && isNaN(id)) {
      return res.status(400).json(createErrorResponse("Invalid parameter value."));
    }

    const whereCondition = `WHERE 1=1`;
    const q = `
      SELECT 
        id, title, target_url, active_yn, ads_type, target_blank, path	 FROM cat_post_ads
      ${whereCondition} AND id = ?
      ORDER BY id DESC;
    `;

    const recordDetail = await getTableRecord(q, [id], true);
    if (!recordDetail) {
      return res.status(400).json(createErrorResponse(message = "Record Not Found.", data = null, code = "RECORD_NOT_FOUND"));
    }

    recordDetail.imgFullPath = recordDetail?.path && fileExists(recordDetail?.path) ? `${req.appBaseUrl}/uploads/${recordDetail.path}` : `${req.appBaseUrl}/uploads/${COMMON_CONFIG.admin.DEFAULT_NO_IMG}`;

    res.json(createSuccessResponse('Data retrieved successfully.', recordDetail));

  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const categoryOrPostAdsSave = async (req, res, next) => {
  let transaction;
  let uploadedFiles = [];

  const deleteUploadedFilesWhenError = (filePaths) => {
    if (filePaths && filePaths.length > 0) {
      filePaths.forEach((filePath) => {
        console.log("Deleting:", filePath);

        fs.unlink(filePath, (err) => {
          if (err) {
            console.error(`Failed to delete file: ${filePath}`, err);
          } else {
            console.log(`File deleted: ${filePath}`);
          }
        });
      });
    }
  };

  try {
    const { user, body, file } = req;
    const { id = '', title = '', target_url = '', status = '', target_blank = '', ads_type = '' } = body;

    // Access uploaded file
    const imageFileName = file && file?.filename || "";
    const imageFilePath = `${UPLOADED_PATH.ADMIN_CATEGORY_POST_AD_IMAGE}/${imageFileName}`;

    // Collect file paths for deletion if needed
    uploadedFiles = [file?.path || ""].filter(Boolean);

    // Validate user session
    if (!user || !user?.id) {
      deleteUploadedFilesWhenError(uploadedFiles);
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Start transaction
    transaction = await startTransaction();

    // Prepare record data
    let setRecordData = {
      title,
      target_url,
      active_yn: status == "true" ? "Y" : "N",
      ads_type,
      target_blank,
      created_at: new Date()
    };

    if (id) {
      // Check if the record exists before updating
      const existingRecord = await getTableRecord(`SELECT id, path FROM cat_post_ads WHERE id = ? LIMIT 1;`, [id], true);
      if (!existingRecord) {
        deleteUploadedFilesWhenError(uploadedFiles);
        await rollbackTransaction(transaction);
        return res.status(400).json(createErrorResponse('Record Not Found.', null, 'RECORD_NOT_FOUND'));
      }

      if (imageFileName) {
        // Delete the image file if it exists
        const oldImagePath = existingRecord.path ? path.join(global.uploadsBaseDir, existingRecord.path) : null;
        if (oldImagePath) {
          try {
            await fs.promises.access(oldImagePath); // Check if the logo exists
            await fs.promises.unlink(oldImagePath); // Delete the logo
          } catch (err) {
            console.error(`Error deleting image: ${existingRecord.path}:`, err);
          }
        }
        // update with new
        setRecordData.path = imageFileName && imageFilePath || "";
      }

      // Update the record
      const affectedRows = await updateRecord('cat_post_ads', setRecordData, { id }, transaction);
      console.log(`Updated record affectedRows:${affectedRows}`);
    } else {
      if (!imageFileName) {
        return res.status(400).json(createValidationErrorResponse("Image is required.", []));
      }
      setRecordData.path = imageFileName && imageFilePath || "";
      // Insert new record
      const recordInsertedId = await insertRecord('cat_post_ads', setRecordData, transaction);
      console.log(`Saved record Id:${recordInsertedId}`);
      setRecordData.id = recordInsertedId;
    }

    // Commit transaction
    await commitTransaction(transaction);
    res.json(createSuccessResponse('Record saved successfully.', setRecordData.id || id, 'RECORD_SAVED'));

  } catch (error) {
    deleteUploadedFilesWhenError(uploadedFiles);
    if (transaction) await rollbackTransaction(transaction);
    next(error);
  }
};

const termsSeo = async (req, res, next) => {
  try {

    const settings = await getSettingsData();

    // Prepare metadata for headers
    const logo_img = settings.header_logo_path && fileExists(settings.header_logo_path) ? `${req.appBaseUrl}/uploads/${settings.header_logo_path}` : `${req.appBaseUrl}/uploads/backend/images/settings/header_logo_15477661460.png`;

    const header_data = {
      author: 'localxlist.org',
      title: `Terms | Localxlist`,
      description: `Terms | Localxlist`,
      keywords: "Terms | Localxlist",
      favicon: settings.favicon && fileExists(settings.favicon) ? `${req.appBaseUrl}/uploads/${settings.favicon}` : '',
      image: logo_img,

      ogType: "website",
      ogTitle: `Terms | Localxlist`,
      ogSiteName: "localxlist.org",
      ogUrl: "https://localxlist.org/",
      ogDescription: `Terms | Localxlist`,
      ogImage: logo_img,
      ogImageHeight: "377",

      twitterCard: "summary_large_image",
      twitterSite: "localxlist",
      twitterCreator: "localxlist",
      twitterTitle: `Terms | Localxlist`,
      twitterDescription: `Terms | Localxlist`,
      twitterImage: logo_img,
      generator: "localxlist.org",
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
    const { user, query } = req;
    const { page = 1, keyword = '' } = query;

    if (!user?.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    const perPageLimit = LIMIT.ADMIN_TERMS || 10;
    const offset = (page - 1) * perPageLimit;

    let whereClauses = [];
    let queryParams = [];

    // Keyword search
    if (keyword.trim()) {
      whereClauses.push("(terms LIKE ?)");
      const searchKeyword = `%${keyword}%`;
      queryParams.push(searchKeyword);
    }

    // Construct WHERE clause dynamically
    const whereCondition = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

    // Fetch total count for pagination
    const totalRecordCount = await executeQuery(`SELECT COUNT(id) AS total_count FROM terms ${whereCondition};`, queryParams);
    const totalRecords = totalRecordCount[0]?.total_count || 0;
    const totalPages = Math.ceil(totalRecords / perPageLimit);

    // Fetch user list
    const q = `
      SELECT 
      id, terms FROM terms
      ${whereCondition}
      ORDER BY id DESC
      LIMIT ? OFFSET ?;
    `;
    queryParams.push(perPageLimit, offset);
    const getList = await getTableRecord(q, queryParams);

    getList.forEach((item, index) => {
      item.srNo = offset + (index + 1);
    });

    res.json(createSuccessResponse('Data retrieved successfully.', {
      list: getList,
      pagination: { currentPage: page, totalPages, perPageLimit, totalRecords }
    }));

  } catch (error) {
    next(error);
  }
};

const termsDetail = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { id } = query;

    // Validate if the user object is available
    if (!user || !user.id || !user.username) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Check if required parameters are provided
    if (!id) {
      return res.status(400).json(createErrorResponse("Missing required parameters."));
    }
    else if (id && isNaN(id)) {
      return res.status(400).json(createErrorResponse("Invalid parameter value."));
    }

    const whereCondition = `WHERE 1=1`;
    const q = `
      SELECT 
        id, 
        terms FROM terms
      ${whereCondition} AND id = ?
      ORDER BY id DESC;
    `;

    const recordDetail = await getTableRecord(q, [id], true);
    if (!recordDetail) {
      return res.status(400).json(createErrorResponse(message = "Record Not Found.", data = null, code = "RECORD_NOT_FOUND"));
    }

    res.json(createSuccessResponse('Data retrieved successfully.', recordDetail));

  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const termsSave = async (req, res, next) => {
  let transaction;

  try {
    const { user, body } = req;
    const { id = '', terms } = body;

    // Validate user session
    if (!user || !user?.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Start transaction
    transaction = await startTransaction();

    // Check if the record already exists (both for insert and update)
    const existingRecord = await getTableRecord(
      `SELECT id FROM terms WHERE terms = ? LIMIT 1;`,
      [terms],
      true
    );

    if (existingRecord && (!id || existingRecord.id !== id)) {
      await rollbackTransaction(transaction);
      return res.status(400).json(createErrorResponse('Duplicate record found.', null, 'DUPLICATE_RECORD'));
    }

    // Prepare record data
    let setRecordData = {
      date: new Date(),
      terms: terms,
    };

    if (id) {
      // Check if the record exists before updating
      const singleDetail = await getTableRecord(`SELECT id FROM terms WHERE id = ? LIMIT 1;`, [id], true);
      if (!singleDetail) {
        await rollbackTransaction(transaction);
        return res.status(400).json(createErrorResponse('Record Not Found.', null, 'RECORD_NOT_FOUND'));
      }

      // Update the record
      const affectedRows = await updateRecord('terms', setRecordData, { id }, transaction);
      console.log(`Updated record affectedRows:${affectedRows}`);
    } else {
      // Insert new record
      const recordInsertedId = await insertRecord('terms', setRecordData, transaction);
      console.log(`Saved record Id:${recordInsertedId}`);
      setRecordData.id = recordInsertedId;
    }

    // Commit transaction
    await commitTransaction(transaction);
    res.json(createSuccessResponse('Record saved successfully.', setRecordData.id || id, 'RECORD_SAVED'));

  } catch (error) {
    if (transaction) await rollbackTransaction(transaction);
    next(error);
  }
};

const aboutSeo = async (req, res, next) => {
  try {

    const settings = await getSettingsData();

    // Prepare metadata for headers
    const logo_img = settings.header_logo_path && fileExists(settings.header_logo_path) ? `${req.appBaseUrl}/uploads/${settings.header_logo_path}` : `${req.appBaseUrl}/uploads/backend/images/settings/header_logo_15477661460.png`;

    const header_data = {
      author: 'localxlist.org',
      title: `About | Localxlist`,
      description: `About | Localxlist`,
      keywords: "About | Localxlist",
      favicon: settings.favicon && fileExists(settings.favicon) ? `${req.appBaseUrl}/uploads/${settings.favicon}` : '',
      image: logo_img,

      ogType: "website",
      ogTitle: `About | Localxlist`,
      ogSiteName: "localxlist.org",
      ogUrl: "https://localxlist.org/",
      ogDescription: `About | Localxlist`,
      ogImage: logo_img,
      ogImageHeight: "377",

      twitterCard: "summary_large_image",
      twitterSite: "localxlist",
      twitterCreator: "localxlist",
      twitterTitle: `About | Localxlist`,
      twitterDescription: `About | Localxlist`,
      twitterImage: logo_img,
      generator: "localxlist.org",
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

const aboutList = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { page = 1, keyword = '' } = query;

    if (!user?.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    const perPageLimit = LIMIT.ADMIN_ABOUTS || 10;
    const offset = (page - 1) * perPageLimit;

    let whereClauses = [];
    let queryParams = [];

    // Keyword search
    if (keyword.trim()) {
      whereClauses.push("(title LIKE ? OR description LIKE ?)");
      const searchKeyword = `%${keyword.trim()}%`;
      queryParams.push(searchKeyword, searchKeyword);
    }

    // Construct WHERE clause dynamically
    const whereCondition = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

    // Fetch total count for pagination
    const totalRecordCount = await executeQuery(`SELECT COUNT(id) AS total_count FROM about ${whereCondition};`, queryParams);
    const totalRecords = totalRecordCount[0]?.total_count || 0;
    const totalPages = Math.ceil(totalRecords / perPageLimit);

    // Fetch user list
    const q = `
      SELECT 
      * FROM about
      ${whereCondition}
      ORDER BY id DESC
      LIMIT ? OFFSET ?;
    `;
    queryParams.push(perPageLimit, offset);
    const getList = await getTableRecord(q, queryParams);

    getList.forEach((item, index) => {
      item.srNo = offset + (index + 1);
    });

    res.json(createSuccessResponse('Data retrieved successfully.', {
      list: getList,
      pagination: { currentPage: page, totalPages, perPageLimit, totalRecords }
    }));

  } catch (error) {
    next(error);
  }
};

const aboutDetail = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { id } = query;

    // Validate if the user object is available
    if (!user || !user.id || !user.username) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Check if required parameters are provided
    if (!id) {
      return res.status(400).json(createErrorResponse("Missing required parameters."));
    }
    else if (id && isNaN(id)) {
      return res.status(400).json(createErrorResponse("Invalid parameter value."));
    }

    const whereCondition = `WHERE 1=1`;
    const q = `
      SELECT 
        id, 
        title, description FROM about
      ${whereCondition} AND id = ?
      ORDER BY id DESC;
    `;

    const recordDetail = await getTableRecord(q, [id], true);
    if (!recordDetail) {
      return res.status(400).json(createErrorResponse(message = "Record Not Found.", data = null, code = "RECORD_NOT_FOUND"));
    }

    res.json(createSuccessResponse('Data retrieved successfully.', recordDetail));

  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const aboutSave = async (req, res, next) => {
  let transaction;

  try {
    const { user, body } = req;
    const { id = '', title, description } = body;

    // Validate user session
    if (!user || !user?.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    console.log({
      title, description
    });


    // Start transaction
    transaction = await startTransaction();

    // Check if the record already exists (both for insert and update)
    const existingRecord = await getTableRecord(
      `SELECT id FROM about WHERE title = ? LIMIT 1;`,
      [title],
      true
    );

    if (existingRecord && (!id || existingRecord.id !== id)) {
      await rollbackTransaction(transaction);
      return res.status(400).json(createErrorResponse('Duplicate record found.', null, 'DUPLICATE_RECORD'));
    }

    // Prepare record data
    let setRecordData = {
      title, description
    };

    if (id) {
      // Check if the record exists before updating
      const singleDetail = await getTableRecord(`SELECT id FROM about WHERE id = ? LIMIT 1;`, [id], true);
      if (!singleDetail) {
        await rollbackTransaction(transaction);
        return res.status(400).json(createErrorResponse('Record Not Found.', null, 'RECORD_NOT_FOUND'));
      }

      // Update the record
      const affectedRows = await updateRecord('about', setRecordData, { id }, transaction);
      console.log(`Updated record affectedRows:${affectedRows}`);
    } else {
      // Insert new record
      const recordInsertedId = await insertRecord('about', setRecordData, transaction);
      console.log(`Saved record Id:${recordInsertedId}`);
      setRecordData.id = recordInsertedId;
    }

    // Commit transaction
    await commitTransaction(transaction);
    res.json(createSuccessResponse('Record saved successfully.', setRecordData.id || id, 'RECORD_SAVED'));

  } catch (error) {
    if (transaction) await rollbackTransaction(transaction);
    next(error);
  }
};

const homePageNoticeSeo = async (req, res, next) => {
  try {

    const settings = await getSettingsData();

    // Prepare metadata for headers
    const logo_img = settings.header_logo_path && fileExists(settings.header_logo_path) ? `${req.appBaseUrl}/uploads/${settings.header_logo_path}` : `${req.appBaseUrl}/uploads/backend/images/settings/header_logo_15477661460.png`;

    const header_data = {
      author: 'localxlist.org',
      title: `Home Page Notice | Localxlist`,
      description: `Home Page Notice | Localxlist`,
      keywords: "Home Page Notice | Localxlist",
      favicon: settings.favicon && fileExists(settings.favicon) ? `${req.appBaseUrl}/uploads/${settings.favicon}` : '',
      image: logo_img,

      ogType: "website",
      ogTitle: `Home Page Notice | Localxlist`,
      ogSiteName: "localxlist.org",
      ogUrl: "https://localxlist.org/",
      ogDescription: `Home Page Notice | Localxlist`,
      ogImage: logo_img,
      ogImageHeight: "377",

      twitterCard: "summary_large_image",
      twitterSite: "localxlist",
      twitterCreator: "localxlist",
      twitterTitle: `Home Page Notice | Localxlist`,
      twitterDescription: `Home Page Notice | Localxlist`,
      twitterImage: logo_img,
      generator: "localxlist.org",
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

const homePageNotices = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { page = 1, keyword = '' } = query;

    if (!user?.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    const perPageLimit = LIMIT.ADMIN_HOME_NOTICES || 10;
    const offset = (page - 1) * perPageLimit;

    let whereClauses = [];
    let queryParams = [];

    // Keyword search
    if (keyword.trim()) {
      whereClauses.push("(description LIKE ?)");
      const searchKeyword = `%${keyword.trim()}%`;
      queryParams.push(searchKeyword);
    }

    // Construct WHERE clause dynamically
    const whereCondition = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

    // Fetch total count for pagination
    const totalRecordCount = await executeQuery(`SELECT COUNT(id) AS total_count FROM home_page_notice ${whereCondition};`, queryParams);
    const totalRecords = totalRecordCount[0]?.total_count || 0;
    const totalPages = Math.ceil(totalRecords / perPageLimit);

    // Fetch user list
    const q = `
      SELECT 
      * FROM home_page_notice
      ${whereCondition}
      ORDER BY id DESC
      LIMIT ? OFFSET ?;
    `;
    queryParams.push(perPageLimit, offset);
    const getList = await getTableRecord(q, queryParams);

    getList.forEach((item, index) => {
      item.srNo = offset + (index + 1);
      item.title = `Home Page Notice - ${offset + (index + 1)}`;
    });

    res.json(createSuccessResponse('Data retrieved successfully.', {
      list: getList,
      pagination: { currentPage: page, totalPages, perPageLimit, totalRecords }
    }));

  } catch (error) {
    next(error);
  }
};

const homePageNoticeDetail = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { id } = query;

    // Validate if the user object is available
    if (!user || !user.id || !user.username) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Check if required parameters are provided
    if (!id) {
      return res.status(400).json(createErrorResponse("Missing required parameters."));
    }
    else if (id && isNaN(id)) {
      return res.status(400).json(createErrorResponse("Invalid parameter value."));
    }

    const whereCondition = `WHERE 1=1`;
    const q = `
      SELECT 
        id, 
         description FROM home_page_notice
      ${whereCondition} AND id = ?
      ORDER BY id DESC;
    `;
    const recordDetail = await getTableRecord(q, [id], true);
    if (!recordDetail) {
      return res.status(400).json(createErrorResponse(message = "Record Not Found.", data = null, code = "RECORD_NOT_FOUND"));
    }

    res.json(createSuccessResponse('Data retrieved successfully.', recordDetail));

  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const homePageNoticeSave = async (req, res, next) => {
  let transaction;

  try {
    const { user, body } = req;
    const { id = '', description } = body;

    // Validate user session
    if (!user || !user?.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Start transaction
    transaction = await startTransaction();

    // Prepare record data
    let setRecordData = {
      description
    };

    if (id) {
      // Check if the record exists before updating
      const singleDetail = await getTableRecord(`SELECT id FROM home_page_notice WHERE id = ? LIMIT 1;`, [id], true);
      if (!singleDetail) {
        await rollbackTransaction(transaction);
        return res.status(400).json(createErrorResponse('Record Not Found.', null, 'RECORD_NOT_FOUND'));
      }

      // Update the record
      const affectedRows = await updateRecord('home_page_notice', setRecordData, { id }, transaction);
      console.log(`Updated record affectedRows:${affectedRows}`);
    } else {
      // Insert new record
      const recordInsertedId = await insertRecord('home_page_notice', setRecordData, transaction);
      console.log(`Saved record Id:${recordInsertedId}`);
      setRecordData.id = recordInsertedId;
    }

    // Commit transaction
    await commitTransaction(transaction);
    res.json(createSuccessResponse('Record saved successfully.', setRecordData.id || id, 'RECORD_SAVED'));

  } catch (error) {
    if (transaction) await rollbackTransaction(transaction);
    next(error);
  }
};

const alertMessageSeo = async (req, res, next) => {
  try {

    const settings = await getSettingsData();

    // Prepare metadata for headers
    const logo_img = settings.header_logo_path && fileExists(settings.header_logo_path) ? `${req.appBaseUrl}/uploads/${settings.header_logo_path}` : `${req.appBaseUrl}/uploads/backend/images/settings/header_logo_15477661460.png`;

    const header_data = {
      author: 'localxlist.org',
      title: `Alert Message | Localxlist`,
      description: `Alert Message | Localxlist`,
      keywords: "Alert Message | Localxlist",
      favicon: settings.favicon && fileExists(settings.favicon) ? `${req.appBaseUrl}/uploads/${settings.favicon}` : '',
      image: logo_img,

      ogType: "website",
      ogTitle: `Alert Message | Localxlist`,
      ogSiteName: "localxlist.org",
      ogUrl: "https://localxlist.org/",
      ogDescription: `Alert Message | Localxlist`,
      ogImage: logo_img,
      ogImageHeight: "377",

      twitterCard: "summary_large_image",
      twitterSite: "localxlist",
      twitterCreator: "localxlist",
      twitterTitle: `Alert Message | Localxlist`,
      twitterDescription: `Alert Message | Localxlist`,
      twitterImage: logo_img,
      generator: "localxlist.org",
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

const alertMessages = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { page = 1, keyword = '' } = query;

    if (!user?.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    const perPageLimit = LIMIT.ADMIN_ALERT_MSG || 10;
    const offset = (page - 1) * perPageLimit;

    let whereClauses = [];
    let queryParams = [];

    // Keyword search
    if (keyword.trim()) {
      whereClauses.push("(msg LIKE ?)");
      const searchKeyword = `%${keyword}%`;
      queryParams.push(searchKeyword);
    }

    // Construct WHERE clause dynamically
    const whereCondition = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

    // Fetch total count for pagination
    const totalRecordCount = await executeQuery(`SELECT COUNT(id) AS total_count FROM alert_msg ${whereCondition};`, queryParams);
    const totalRecords = totalRecordCount[0]?.total_count || 0;
    const totalPages = Math.ceil(totalRecords / perPageLimit);

    // Fetch user list
    const q = `
      SELECT 
      id, msg, v_status, p_type FROM alert_msg
      ${whereCondition}
      ORDER BY id DESC
      LIMIT ? OFFSET ?;
    `;
    queryParams.push(perPageLimit, offset);
    const getList = await getTableRecord(q, queryParams);

    getList.forEach((item, index) => {
      item.srNo = offset + (index + 1);
      item.v_status = item.v_status == 1 ? "Enable" : "Disable";
    });

    res.json(createSuccessResponse('Data retrieved successfully.', {
      list: getList,
      pagination: { currentPage: page, totalPages, perPageLimit, totalRecords }
    }));

  } catch (error) {
    next(error);
  }
};

const alertMessageDetail = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { id } = query;

    // Validate if the user object is available
    if (!user || !user.id || !user.username) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Check if required parameters are provided
    if (!id) {
      return res.status(400).json(createErrorResponse("Missing required parameters."));
    }
    else if (id && isNaN(id)) {
      return res.status(400).json(createErrorResponse("Invalid parameter value."));
    }

    const whereCondition = `WHERE 1=1`;
    const q = `
      SELECT 
        id, 
        msg, v_status, p_type FROM alert_msg
      ${whereCondition} AND id = ?
      ORDER BY id DESC;
    `;

    const recordDetail = await getTableRecord(q, [id], true);
    if (!recordDetail) {
      return res.status(400).json(createErrorResponse(message = "Record Not Found.", data = null, code = "RECORD_NOT_FOUND"));
    }

    res.json(createSuccessResponse('Data retrieved successfully.', recordDetail));

  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const alertMessageSave = async (req, res, next) => {
  let transaction;

  try {
    const { user, body } = req;
    const { id = '', message, visible_status, p_type } = body;

    // Validate user session
    if (!user || !user?.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Start transaction
    transaction = await startTransaction();

    // Check if the record already exists (both for insert and update)
    const existingRecord = await getTableRecord(
      `SELECT id FROM alert_msg WHERE msg = ? AND p_type = ? LIMIT 1;`,
      [message, p_type],
      true
    );

    if (existingRecord && (!id || existingRecord.id !== id)) {
      await rollbackTransaction(transaction);
      return res.status(400).json(createErrorResponse('Duplicate record found.', null, 'DUPLICATE_RECORD'));
    }

    // Prepare record data
    let setRecordData = {
      msg: message,
      v_status: visible_status == "true" ? 1 : 0,
      p_type: p_type
    };

    if (id) {
      // Check if the record exists before updating
      const singleDetail = await getTableRecord(`SELECT id FROM alert_msg WHERE id = ? LIMIT 1;`, [id], true);
      if (!singleDetail) {
        await rollbackTransaction(transaction);
        return res.status(400).json(createErrorResponse('Record Not Found.', null, 'RECORD_NOT_FOUND'));
      }

      // Update the record
      const affectedRows = await updateRecord('alert_msg', setRecordData, { id }, transaction);
      console.log(`Updated record affectedRows:${affectedRows}`);
    } else {
      // Insert new record
      const recordInsertedId = await insertRecord('alert_msg', setRecordData, transaction);
      console.log(`Saved record Id:${recordInsertedId}`);
      setRecordData.id = recordInsertedId;
    }

    // Commit transaction
    await commitTransaction(transaction);
    res.json(createSuccessResponse('Record saved successfully.', setRecordData.id || id, 'RECORD_SAVED'));

  } catch (error) {
    if (transaction) await rollbackTransaction(transaction);
    next(error);
  }
};

const dashboardContentSeo = async (req, res, next) => {
  try {

    const settings = await getSettingsData();

    // Prepare metadata for headers
    const logo_img = settings.header_logo_path && fileExists(settings.header_logo_path) ? `${req.appBaseUrl}/uploads/${settings.header_logo_path}` : `${req.appBaseUrl}/uploads/backend/images/settings/header_logo_15477661460.png`;

    const header_data = {
      author: 'localxlist.org',
      title: `Dashboard Content | Localxlist`,
      description: `Dashboard Content | Localxlist`,
      keywords: "Dashboard Content | Localxlist",
      favicon: settings.favicon && fileExists(settings.favicon) ? `${req.appBaseUrl}/uploads/${settings.favicon}` : '',
      image: logo_img,

      ogType: "website",
      ogTitle: `Dashboard Content | Localxlist`,
      ogSiteName: "localxlist.org",
      ogUrl: "https://localxlist.org/",
      ogDescription: `Dashboard Content | Localxlist`,
      ogImage: logo_img,
      ogImageHeight: "377",

      twitterCard: "summary_large_image",
      twitterSite: "localxlist",
      twitterCreator: "localxlist",
      twitterTitle: `Dashboard Content | Localxlist`,
      twitterDescription: `Dashboard Content | Localxlist`,
      twitterImage: logo_img,
      generator: "localxlist.org",
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

const dashboardContentDetail = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { id } = query;

    // Validate if the user object is available
    if (!user || !user.id || !user.username) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Check if required parameters are provided
    if (!id) {
      return res.status(400).json(createErrorResponse("Missing required parameters."));
    }
    else if (id && isNaN(id)) {
      return res.status(400).json(createErrorResponse("Invalid parameter value."));
    }

    const whereCondition = `WHERE 1=1`;
    const q = `
      SELECT 
        id, 
        content, show_hide FROM dashboard_content
      ${whereCondition} AND id = ?
      ORDER BY id DESC;
    `;

    const recordDetail = await getTableRecord(q, [id], true);
    if (!recordDetail) {
      return res.status(400).json(createErrorResponse(message = "Record Not Found.", data = null, code = "RECORD_NOT_FOUND"));
    }

    res.json(createSuccessResponse('Data retrieved successfully.', recordDetail));

  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const dashboardContentSave = async (req, res, next) => {
  let transaction;

  try {
    const { user, body } = req;
    const { id = '', content, show_hide } = body;

    // Validate user session
    if (!user || !user?.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Start transaction
    transaction = await startTransaction();


    // Prepare record data
    let setRecordData = {
      content,
      show_hide: show_hide === true ? 1 : 0
    };

    if (id) {
      // Check if the record exists before updating
      const singleDetail = await getTableRecord(`SELECT id FROM dashboard_content WHERE id = ? LIMIT 1;`, [id], true);
      if (!singleDetail) {
        await rollbackTransaction(transaction);
        return res.status(400).json(createErrorResponse('Record Not Found.', null, 'RECORD_NOT_FOUND'));
      }

      // Update the record
      const affectedRows = await updateRecord('dashboard_content', setRecordData, { id }, transaction);
      console.log(`Updated record affectedRows:${affectedRows}`);
    } else {
      // Insert new record
      const recordInsertedId = await insertRecord('dashboard_content', setRecordData, transaction);
      console.log(`Saved record Id:${recordInsertedId}`);
      setRecordData.id = recordInsertedId;
    }

    // Commit transaction
    await commitTransaction(transaction);
    res.json(createSuccessResponse('Record saved successfully.', setRecordData.id || id, 'RECORD_SAVED'));

  } catch (error) {
    if (transaction) await rollbackTransaction(transaction);
    next(error);
  }
};

const postReportSeo = async (req, res, next) => {
  try {

    const settings = await getSettingsData();

    // Prepare metadata for headers
    const logo_img = settings.header_logo_path && fileExists(settings.header_logo_path) ? `${req.appBaseUrl}/uploads/${settings.header_logo_path}` : `${req.appBaseUrl}/uploads/backend/images/settings/header_logo_15477661460.png`;

    const header_data = {
      author: 'localxlist.org',
      title: `Post Reports | Localxlist`,
      description: `Post Reports | Localxlist`,
      keywords: "Post Reports | Localxlist",
      favicon: settings.favicon && fileExists(settings.favicon) ? `${req.appBaseUrl}/uploads/${settings.favicon}` : '',
      image: logo_img,

      ogType: "website",
      ogTitle: `Post Reports | Localxlist`,
      ogSiteName: "localxlist.org",
      ogUrl: "https://localxlist.org/",
      ogDescription: `Post Reports | Localxlist`,
      ogImage: logo_img,
      ogImageHeight: "377",

      twitterCard: "summary_large_image",
      twitterSite: "localxlist",
      twitterCreator: "localxlist",
      twitterTitle: `Post Reports | Localxlist`,
      twitterDescription: `Post Reports | Localxlist`,
      twitterImage: logo_img,
      generator: "localxlist.org",
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

const postReports = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { page = 1, keyword = '', postId = '' } = query;

    if (!user?.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    const perPageLimit = LIMIT.ADMIN_POST_REPORT || 10;
    const offset = (page - 1) * perPageLimit;

    let whereClauses = [];
    let queryParams = [];

    // Keyword search
    if (keyword.trim()) {
      whereClauses.push("(post_report.description LIKE ?)");
      const searchKeyword = `%${keyword}%`;
      queryParams.push(searchKeyword);
    }

    if (postId) {
      whereClauses.push("(post_report.post_id LIKE ?)");
      queryParams.push(postId);
    }

    // Construct WHERE clause dynamically
    const whereCondition = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

    // Fetch total count for pagination
    const totalRecordCount = await executeQuery(`SELECT COUNT(id) AS total_count FROM post_report ${whereCondition};`, queryParams);
    const totalRecords = totalRecordCount[0]?.total_count || 0;
    const totalPages = Math.ceil(totalRecords / perPageLimit);

    // Fetch user list
    const q = `
      SELECT 
      post_report.id, 
      post_report.date, 
      post_report.post_id, 
      post_report.email, 
      post_report.description,
      
      post.title,

      member.username as memberUserName, 
      member.email as memberEmail,
      
      country.country,
      city.city,
      subcity.subcity AS subCity,

      category.category,
      subcategory.subcategory AS subCategory

      FROM post_report 
      LEFT JOIN post ON post.id = post_report.post_id
      LEFT JOIN member ON member.id = post.member_id

      LEFT JOIN country ON country.id = post.country_id
      LEFT JOIN city ON city.id = post.city_id
      LEFT JOIN subcity ON subcity.id = post.subcity_id
      LEFT JOIN category ON category.id = post.category_id
      LEFT JOIN subcategory ON subcategory.id = post.subcategory_id

      ${whereCondition}
      ORDER BY post_report.id DESC
      LIMIT ? OFFSET ?;
    `;
    queryParams.push(perPageLimit, offset);
    const getList = await getTableRecord(q, queryParams);

    getList.forEach((item, index) => {
      item.srNo = offset + (index + 1);
      item.formattedDate = formattedDate(item.date, 'yyyy-MMM-dd hh:mm:ss a');
      item.reported_by = item.email || 'N/A';
      item.reported_to = `${item.memberUserName || 'N/A'}  (${item.memberEmail || 'N/A'})`;
    });

    res.json(createSuccessResponse('Data retrieved successfully.', {
      list: getList,
      pagination: { currentPage: page, totalPages, perPageLimit, totalRecords }
    }));

  } catch (error) {
    next(error);
  }
};

const postReportDetail = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { id } = query;

    // Validate if the user object is available
    if (!user || !user.id || !user.username) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Check if required parameters are provided
    if (!id) {
      return res.status(400).json(createErrorResponse("Missing required parameters."));
    }
    else if (id && isNaN(id)) {
      return res.status(400).json(createErrorResponse("Invalid parameter value."));
    }

    const whereCondition = `WHERE 1=1`;
    const q = `
      SELECT 
        id, 
        date, post_id, email, description FROM post_report
      ${whereCondition} AND id = ?
      ORDER BY id DESC;
    `;

    const recordDetail = await getTableRecord(q, [id], true);
    if (!recordDetail) {
      return res.status(400).json(createErrorResponse(message = "Record Not Found.", data = null, code = "RECORD_NOT_FOUND"));
    }

    recordDetail.formattedDate = formattedDate(recordDetail.date, 'yyyy-MMM-dd hh:mm:ss a');

    res.json(createSuccessResponse('Data retrieved successfully.', recordDetail));

  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const featuredPackagesSeo = async (req, res, next) => {
  try {

    const settings = await getSettingsData();

    // Prepare metadata for headers
    const logo_img = settings.header_logo_path && fileExists(settings.header_logo_path) ? `${req.appBaseUrl}/uploads/${settings.header_logo_path}` : `${req.appBaseUrl}/uploads/backend/images/settings/header_logo_15477661460.png`;

    const header_data = {
      author: 'localxlist.org',
      title: `Featured Package | Localxlist`,
      description: `Featured Package | Localxlist`,
      keywords: "Featured Package | Localxlist",
      favicon: settings.favicon && fileExists(settings.favicon) ? `${req.appBaseUrl}/uploads/${settings.favicon}` : '',
      image: logo_img,

      ogType: "website",
      ogTitle: `Featured Package | Localxlist`,
      ogSiteName: "localxlist.org",
      ogUrl: "https://localxlist.org/",
      ogDescription: `Featured Package | Localxlist`,
      ogImage: logo_img,
      ogImageHeight: "377",

      twitterCard: "summary_large_image",
      twitterSite: "localxlist",
      twitterCreator: "localxlist",
      twitterTitle: `Featured Package | Localxlist`,
      twitterDescription: `Featured Package | Localxlist`,
      twitterImage: logo_img,
      generator: "localxlist.org",
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

const featuredPackages = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { page = 1, keyword = '' } = query;

    if (!user?.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    const settings = await getSettingsData();
    const currency = settings?.currency || '';

    const perPageLimit = LIMIT.ADMIN_FEATURED_PACKAGE || 10;
    const offset = (page - 1) * perPageLimit;

    let whereClauses = [];
    let queryParams = [];

    // Keyword search
    if (keyword.trim()) {
      whereClauses.push("(days LIKE ? OR amount LIKE ?)");
      const searchKeyword = `%${keyword}%`;
      queryParams.push(searchKeyword, searchKeyword);
    }

    // Construct WHERE clause dynamically
    const whereCondition = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

    // Fetch total count for pagination
    const totalRecordCount = await executeQuery(`SELECT COUNT(id) AS total_count FROM featured_ad ${whereCondition};`, queryParams);
    const totalRecords = totalRecordCount[0]?.total_count || 0;
    const totalPages = Math.ceil(totalRecords / perPageLimit);

    // Fetch list
    let q;
    if (page == 0) {
      q = `
      SELECT 
      * FROM featured_ad
      ${whereCondition}
      ORDER BY id DESC;
    `;
    } else {
      q = `
      SELECT 
      * FROM featured_ad
      ${whereCondition}
      ORDER BY id DESC
      LIMIT ? OFFSET ?;
    `;
      queryParams.push(perPageLimit, offset);
    }

    const getList = await getTableRecord(q, queryParams);

    getList.forEach((item, index) => {
      item.srNo = offset + (index + 1);
      item.currency = currency || "";
    });

    res.json(createSuccessResponse('Data retrieved successfully.', {
      list: getList,
      pagination: { currentPage: page, totalPages, perPageLimit, totalRecords }
    }));

  } catch (error) {
    next(error);
  }
};

const featuredPackageDetail = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { id } = query;

    // Validate if the user object is available
    if (!user || !user.id || !user.username) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Check if required parameters are provided
    if (!id) {
      return res.status(400).json(createErrorResponse("Missing required parameters."));
    }
    else if (id && isNaN(id)) {
      return res.status(400).json(createErrorResponse("Invalid parameter value."));
    }

    const whereCondition = `WHERE 1=1`;
    const q = `
      SELECT 
        * FROM featured_ad
      ${whereCondition} AND id = ?
      ORDER BY id DESC;
    `;

    const recordDetail = await getTableRecord(q, [id], true);
    if (!recordDetail) {
      return res.status(400).json(createErrorResponse(message = "Record Not Found.", data = null, code = "RECORD_NOT_FOUND"));
    }

    res.json(createSuccessResponse('Data retrieved successfully.', recordDetail));

  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const featuredPackageSave = async (req, res, next) => {
  let transaction;

  try {
    const { user, body } = req;
    const { id = '', days, amount } = body;

    // Validate user session
    if (!user || !user?.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Start transaction
    transaction = await startTransaction();

    // Check if the record already exists (both for insert and update)
    const existingRecord = await getTableRecord(
      `SELECT id FROM featured_ad WHERE days = ? AND amount = ? LIMIT 1;`,
      [days, amount],
      true
    );

    if (existingRecord && (!id || existingRecord.id !== id)) {
      await rollbackTransaction(transaction);
      return res.status(400).json(createErrorResponse('Duplicate record found.', null, 'DUPLICATE_RECORD'));
    }

    // Prepare record data
    let setRecordData = {
      days, amount
    };

    if (id) {
      // Check if the record exists before updating
      const singleDetail = await getTableRecord(`SELECT id FROM featured_ad WHERE id = ? LIMIT 1;`, [id], true);
      if (!singleDetail) {
        await rollbackTransaction(transaction);
        return res.status(400).json(createErrorResponse('Record Not Found.', null, 'RECORD_NOT_FOUND'));
      }

      // Update the record
      const affectedRows = await updateRecord('featured_ad', setRecordData, { id }, transaction);
      console.log(`Updated record affectedRows:${affectedRows}`);
    } else {
      // Insert new record
      const recordInsertedId = await insertRecord('featured_ad', setRecordData, transaction);
      console.log(`Saved record Id:${recordInsertedId}`);
      setRecordData.id = recordInsertedId;
    }

    // Commit transaction
    await commitTransaction(transaction);
    res.json(createSuccessResponse('Record saved successfully.', setRecordData.id || id, 'RECORD_SAVED'));

  } catch (error) {
    if (transaction) await rollbackTransaction(transaction);
    next(error);
  }
};

const extendedPackagesSeo = async (req, res, next) => {
  try {

    const settings = await getSettingsData();

    // Prepare metadata for headers
    const logo_img = settings.header_logo_path && fileExists(settings.header_logo_path) ? `${req.appBaseUrl}/uploads/${settings.header_logo_path}` : `${req.appBaseUrl}/uploads/backend/images/settings/header_logo_15477661460.png`;

    const header_data = {
      author: 'localxlist.org',
      title: `Extended Package | Localxlist`,
      description: `Extended Package | Localxlist`,
      keywords: "Extended Package | Localxlist",
      favicon: settings.favicon && fileExists(settings.favicon) ? `${req.appBaseUrl}/uploads/${settings.favicon}` : '',
      image: logo_img,

      ogType: "website",
      ogTitle: `Extended Package | Localxlist`,
      ogSiteName: "localxlist.org",
      ogUrl: "https://localxlist.org/",
      ogDescription: `Extended Package | Localxlist`,
      ogImage: logo_img,
      ogImageHeight: "377",

      twitterCard: "summary_large_image",
      twitterSite: "localxlist",
      twitterCreator: "localxlist",
      twitterTitle: `Extended Package | Localxlist`,
      twitterDescription: `Extended Package | Localxlist`,
      twitterImage: logo_img,
      generator: "localxlist.org",
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

const extendedPackages = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { page = 1, keyword = '' } = query;

    if (!user?.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    const settings = await getSettingsData();
    const currency = settings?.currency || '';

    const perPageLimit = LIMIT.ADMIN_EXTENDED_PACKAGE || 10;
    const offset = (page - 1) * perPageLimit;

    let whereClauses = [];
    let queryParams = [];

    // Keyword search
    if (keyword.trim()) {
      whereClauses.push("(days LIKE ? OR amount LIKE ?)");
      const searchKeyword = `%${keyword}%`;
      queryParams.push(searchKeyword, searchKeyword);
    }

    // Construct WHERE clause dynamically
    const whereCondition = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

    // Fetch total count for pagination
    const totalRecordCount = await executeQuery(`SELECT COUNT(id) AS total_count FROM extended_ad ${whereCondition};`, queryParams);
    const totalRecords = totalRecordCount[0]?.total_count || 0;
    const totalPages = Math.ceil(totalRecords / perPageLimit);

    // Fetch list
    let q;
    if (page == 0) {
      q = `
      SELECT 
      * FROM extended_ad
      ${whereCondition}
      ORDER BY id DESC;
    `;
    } else {
      q = `
      SELECT 
      * FROM extended_ad
      ${whereCondition}
      ORDER BY id DESC
      LIMIT ? OFFSET ?;
    `;
      queryParams.push(perPageLimit, offset);
    }
    const getList = await getTableRecord(q, queryParams);

    getList.forEach((item, index) => {
      item.srNo = offset + (index + 1);
      item.currency = currency || '';
    });

    res.json(createSuccessResponse('Data retrieved successfully.', {
      list: getList,
      pagination: { currentPage: page, totalPages, perPageLimit, totalRecords }
    }));

  } catch (error) {
    next(error);
  }
};

const extendedPackageDetail = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { id } = query;

    // Validate if the user object is available
    if (!user || !user.id || !user.username) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Check if required parameters are provided
    if (!id) {
      return res.status(400).json(createErrorResponse("Missing required parameters."));
    }
    else if (id && isNaN(id)) {
      return res.status(400).json(createErrorResponse("Invalid parameter value."));
    }

    const whereCondition = `WHERE 1=1`;
    const q = `
      SELECT 
        * FROM extended_ad
      ${whereCondition} AND id = ?
      ORDER BY id DESC;
    `;

    const recordDetail = await getTableRecord(q, [id], true);
    if (!recordDetail) {
      return res.status(400).json(createErrorResponse(message = "Record Not Found.", data = null, code = "RECORD_NOT_FOUND"));
    }

    res.json(createSuccessResponse('Data retrieved successfully.', recordDetail));

  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const extendedPackageSave = async (req, res, next) => {
  let transaction;

  try {
    const { user, body } = req;
    const { id = '', days, amount } = body;

    // Validate user session
    if (!user || !user?.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Start transaction
    transaction = await startTransaction();

    // Check if the record already exists (both for insert and update)
    const existingRecord = await getTableRecord(
      `SELECT id FROM extended_ad WHERE days = ? AND amount = ? LIMIT 1;`,
      [days, amount],
      true
    );

    if (existingRecord && (!id || existingRecord.id !== id)) {
      await rollbackTransaction(transaction);
      return res.status(400).json(createErrorResponse('Duplicate record found.', null, 'DUPLICATE_RECORD'));
    }

    // Prepare record data
    let setRecordData = {
      days, amount
    };

    if (id) {
      // Check if the record exists before updating
      const singleDetail = await getTableRecord(`SELECT id FROM extended_ad WHERE id = ? LIMIT 1;`, [id], true);
      if (!singleDetail) {
        await rollbackTransaction(transaction);
        return res.status(400).json(createErrorResponse('Record Not Found.', null, 'RECORD_NOT_FOUND'));
      }

      // Update the record
      const affectedRows = await updateRecord('extended_ad', setRecordData, { id }, transaction);
      console.log(`Updated record affectedRows:${affectedRows}`);
    } else {
      // Insert new record
      const recordInsertedId = await insertRecord('extended_ad', setRecordData, transaction);
      console.log(`Saved record Id:${recordInsertedId}`);
      setRecordData.id = recordInsertedId;
    }

    // Commit transaction
    await commitTransaction(transaction);
    res.json(createSuccessResponse('Record saved successfully.', setRecordData.id || id, 'RECORD_SAVED'));

  } catch (error) {
    if (transaction) await rollbackTransaction(transaction);
    next(error);
  }
};

const navLinkSeo = async (req, res, next) => {
  try {

    const settings = await getSettingsData();

    // Prepare metadata for headers
    const logo_img = settings.header_logo_path && fileExists(settings.header_logo_path) ? `${req.appBaseUrl}/uploads/${settings.header_logo_path}` : `${req.appBaseUrl}/uploads/backend/images/settings/header_logo_15477661460.png`;

    const header_data = {
      author: 'localxlist.org',
      title: `Nav Links | Localxlist`,
      description: `Nav Links | Localxlist`,
      keywords: "Nav Links | Localxlist",
      favicon: settings.favicon && fileExists(settings.favicon) ? `${req.appBaseUrl}/uploads/${settings.favicon}` : '',
      image: logo_img,

      ogType: "website",
      ogTitle: `Nav Links | Localxlist`,
      ogSiteName: "localxlist.org",
      ogUrl: "https://localxlist.org/",
      ogDescription: `Nav Links | Localxlist`,
      ogImage: logo_img,
      ogImageHeight: "377",

      twitterCard: "summary_large_image",
      twitterSite: "localxlist",
      twitterCreator: "localxlist",
      twitterTitle: `Nav Links | Localxlist`,
      twitterDescription: `Nav Links | Localxlist`,
      twitterImage: logo_img,
      generator: "localxlist.org",
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

const navLinks = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { page = 1, keyword = '' } = query;

    if (!user?.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    const perPageLimit = LIMIT.ADMIN_NAV_LINKS || 10;
    const offset = (page - 1) * perPageLimit;

    let whereClauses = [];
    let queryParams = [];

    // Keyword search
    if (keyword.trim()) {
      whereClauses.push("(text LIKE ? OR url LIKE ?)");
      const searchKeyword = `%${keyword}%`;
      queryParams.push(searchKeyword, searchKeyword);
    }

    // Construct WHERE clause dynamically
    const whereCondition = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

    // Fetch total count for pagination
    const totalRecordCount = await executeQuery(`SELECT COUNT(id) AS total_count FROM link_list ${whereCondition};`, queryParams);
    const totalRecords = totalRecordCount[0]?.total_count || 0;
    const totalPages = Math.ceil(totalRecords / perPageLimit);

    // Fetch user list
    const q = `
      SELECT 
      * FROM link_list
      ${whereCondition}
      ORDER BY id DESC
      LIMIT ? OFFSET ?;
    `;
    queryParams.push(perPageLimit, offset);
    const getList = await getTableRecord(q, queryParams);

    getList.forEach((item, index) => {
      item.srNo = offset + (index + 1);
    });

    res.json(createSuccessResponse('Data retrieved successfully.', {
      list: getList,
      pagination: { currentPage: page, totalPages, perPageLimit, totalRecords }
    }));

  } catch (error) {
    next(error);
  }
};

const navLinkDetail = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { id } = query;

    // Validate if the user object is available
    if (!user || !user.id || !user.username) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Check if required parameters are provided
    if (!id) {
      return res.status(400).json(createErrorResponse("Missing required parameters."));
    }
    else if (id && isNaN(id)) {
      return res.status(400).json(createErrorResponse("Invalid parameter value."));
    }

    const whereCondition = `WHERE 1=1`;
    const q = `
      SELECT 
        * FROM link_list
      ${whereCondition} AND id = ?
      ORDER BY id DESC;
    `;

    const recordDetail = await getTableRecord(q, [id], true);
    if (!recordDetail) {
      return res.status(400).json(createErrorResponse(message = "Record Not Found.", data = null, code = "RECORD_NOT_FOUND"));
    }

    res.json(createSuccessResponse('Data retrieved successfully.', recordDetail));

  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const navLinkSave = async (req, res, next) => {
  let transaction;

  try {
    const { user, body } = req;
    const { id = '', text, url } = body;

    // Validate user session
    if (!user || !user?.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Start transaction
    transaction = await startTransaction();

    // Check if the record already exists (both for insert and update)
    const existingRecord = await getTableRecord(
      `SELECT id FROM link_list WHERE text = ? AND url = ? LIMIT 1;`,
      [text, url],
      true
    );

    if (existingRecord && (!id || existingRecord.id !== id)) {
      await rollbackTransaction(transaction);
      return res.status(400).json(createErrorResponse('Duplicate record found.', null, 'DUPLICATE_RECORD'));
    }

    // Prepare record data
    let setRecordData = {
      text, url
    };

    if (id) {
      // Check if the record exists before updating
      const singleDetail = await getTableRecord(`SELECT id FROM link_list WHERE id = ? LIMIT 1;`, [id], true);
      if (!singleDetail) {
        await rollbackTransaction(transaction);
        return res.status(400).json(createErrorResponse('Record Not Found.', null, 'RECORD_NOT_FOUND'));
      }

      // Update the record
      const affectedRows = await updateRecord('link_list', setRecordData, { id }, transaction);
      console.log(`Updated record affectedRows:${affectedRows}`);
    } else {
      // Insert new record
      const recordInsertedId = await insertRecord('link_list', setRecordData, transaction);
      console.log(`Saved record Id:${recordInsertedId}`);
      setRecordData.id = recordInsertedId;
    }

    // Commit transaction
    await commitTransaction(transaction);
    res.json(createSuccessResponse('Record saved successfully.', setRecordData.id || id, 'RECORD_SAVED'));

  } catch (error) {
    if (transaction) await rollbackTransaction(transaction);
    next(error);
  }
};

const footerLinkSeo = async (req, res, next) => {
  try {

    const settings = await getSettingsData();

    // Prepare metadata for headers
    const logo_img = settings.header_logo_path && fileExists(settings.header_logo_path) ? `${req.appBaseUrl}/uploads/${settings.header_logo_path}` : `${req.appBaseUrl}/uploads/backend/images/settings/header_logo_15477661460.png`;

    const header_data = {
      author: 'localxlist.org',
      title: `Footer Links | Localxlist`,
      description: `Footer Links | Localxlist`,
      keywords: "Footer Links | Localxlist",
      favicon: settings.favicon && fileExists(settings.favicon) ? `${req.appBaseUrl}/uploads/${settings.favicon}` : '',
      image: logo_img,

      ogType: "website",
      ogTitle: `Footer Links | Localxlist`,
      ogSiteName: "localxlist.org",
      ogUrl: "https://localxlist.org/",
      ogDescription: `Footer Links | Localxlist`,
      ogImage: logo_img,
      ogImageHeight: "377",

      twitterCard: "summary_large_image",
      twitterSite: "localxlist",
      twitterCreator: "localxlist",
      twitterTitle: `Footer Links | Localxlist`,
      twitterDescription: `Footer Links | Localxlist`,
      twitterImage: logo_img,
      generator: "localxlist.org",
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

const footerLinks = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { page = 1, keyword = '' } = query;

    if (!user?.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    const perPageLimit = LIMIT.ADMIN_FOOTER_LINKS || 10;
    const offset = (page - 1) * perPageLimit;

    let whereClauses = [];
    let queryParams = [];

    // Keyword search
    if (keyword.trim()) {
      whereClauses.push("(text LIKE ? OR url LIKE ?)");
      const searchKeyword = `%${keyword}%`;
      queryParams.push(searchKeyword, searchKeyword);
    }

    // Construct WHERE clause dynamically
    const whereCondition = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

    // Fetch total count for pagination
    const totalRecordCount = await executeQuery(`SELECT COUNT(id) AS total_count FROM footer_links ${whereCondition};`, queryParams);
    const totalRecords = totalRecordCount[0]?.total_count || 0;
    const totalPages = Math.ceil(totalRecords / perPageLimit);

    // Fetch user list
    const q = `
      SELECT 
      * FROM footer_links
      ${whereCondition}
      ORDER BY id DESC
      LIMIT ? OFFSET ?;
    `;
    queryParams.push(perPageLimit, offset);
    const getList = await getTableRecord(q, queryParams);

    getList.forEach((item, index) => {
      item.srNo = offset + (index + 1);
      item.status = item.status == 1 ? 'Enabled' : 'Disabled';
      item.new_window_open = item.new_window_open == 1 ? 'Enabled' : 'Disabled';
    });

    res.json(createSuccessResponse('Data retrieved successfully.', {
      list: getList,
      pagination: { currentPage: page, totalPages, perPageLimit, totalRecords }
    }));

  } catch (error) {
    next(error);
  }
};

const footerLinkDetail = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { id } = query;

    // Validate if the user object is available
    if (!user || !user.id || !user.username) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Check if required parameters are provided
    if (!id) {
      return res.status(400).json(createErrorResponse("Missing required parameters."));
    }
    else if (id && isNaN(id)) {
      return res.status(400).json(createErrorResponse("Invalid parameter value."));
    }

    const whereCondition = `WHERE 1=1`;
    const q = `
      SELECT 
        * FROM footer_links
      ${whereCondition} AND id = ?
      ORDER BY id DESC;
    `;

    const recordDetail = await getTableRecord(q, [id], true);
    if (!recordDetail) {
      return res.status(400).json(createErrorResponse(message = "Record Not Found.", data = null, code = "RECORD_NOT_FOUND"));
    }

    res.json(createSuccessResponse('Data retrieved successfully.', recordDetail));

  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const footerLinkSave = async (req, res, next) => {
  let transaction;

  try {
    const { user, body } = req;
    const { id = '', text, url, status, new_window_open } = body;

    // Validate user session
    if (!user || !user?.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Start transaction
    transaction = await startTransaction();

    // Check if the record already exists (both for insert and update)
    const existingRecord = await getTableRecord(
      `SELECT id FROM footer_links WHERE text = ? AND url = ? LIMIT 1;`,
      [text, url],
      true
    );

    if (existingRecord && (!id || existingRecord.id !== id)) {
      await rollbackTransaction(transaction);
      return res.status(400).json(createErrorResponse('Duplicate record found.', null, 'DUPLICATE_RECORD'));
    }

    // Prepare record data
    let setRecordData = {
      text, url, created_by: user?.id || '',
      status: (status === true || status === 'true') ? 1 : 0,
      new_window_open: (new_window_open === true || new_window_open === 'true') ? 1 : 0
    };

    if (id) {
      // Check if the record exists before updating
      const singleDetail = await getTableRecord(`SELECT id FROM footer_links WHERE id = ? LIMIT 1;`, [id], true);
      if (!singleDetail) {
        await rollbackTransaction(transaction);
        return res.status(400).json(createErrorResponse('Record Not Found.', null, 'RECORD_NOT_FOUND'));
      }

      // Update the record
      const affectedRows = await updateRecord('footer_links', setRecordData, { id }, transaction);
      console.log(`Updated record affectedRows:${affectedRows}`);
    } else {
      // Insert new record
      const recordInsertedId = await insertRecord('footer_links', setRecordData, transaction);
      console.log(`Saved record Id:${recordInsertedId}`);
      setRecordData.id = recordInsertedId;
    }

    // Commit transaction
    await commitTransaction(transaction);
    res.json(createSuccessResponse('Record saved successfully.', setRecordData.id || id, 'RECORD_SAVED'));

  } catch (error) {
    if (transaction) await rollbackTransaction(transaction);
    next(error);
  }
};

const subCityContentSeo = async (req, res, next) => {
  try {

    const settings = await getSettingsData();

    // Prepare metadata for headers
    const logo_img = settings.header_logo_path && fileExists(settings.header_logo_path) ? `${req.appBaseUrl}/uploads/${settings.header_logo_path}` : `${req.appBaseUrl}/uploads/backend/images/settings/header_logo_15477661460.png`;

    const header_data = {
      author: 'localxlist.org',
      title: `SubCity Content | Localxlist`,
      description: `SubCity Content | Localxlist`,
      keywords: "SubCity Content | Localxlist",
      favicon: settings.favicon && fileExists(settings.favicon) ? `${req.appBaseUrl}/uploads/${settings.favicon}` : '',
      image: logo_img,

      ogType: "website",
      ogTitle: `SubCity Content | Localxlist`,
      ogSiteName: "localxlist.org",
      ogUrl: "https://localxlist.org/",
      ogDescription: `SubCity Content | Localxlist`,
      ogImage: logo_img,
      ogImageHeight: "377",

      twitterCard: "summary_large_image",
      twitterSite: "localxlist",
      twitterCreator: "localxlist",
      twitterTitle: `SubCity Content | Localxlist`,
      twitterDescription: `SubCity Content | Localxlist`,
      twitterImage: logo_img,
      generator: "localxlist.org",
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

const subCityContents = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { page = 1, keyword = '', subCityId = '' } = query;

    if (!user?.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    const perPageLimit = LIMIT.ADMIN_SUBCITY_CONTENTS || 10;
    const offset = (page - 1) * perPageLimit;

    let whereClauses = [];
    let queryParams = [];

    // Keyword search
    if (keyword.trim()) {
      whereClauses.push("(subcity_content.content LIKE ? OR subcity.subcity LIKE ?)");
      const searchKeyword = `%${keyword.trim()}%`;
      queryParams.push(searchKeyword, searchKeyword);
    }

    if (subCityId) {
      whereClauses.push("(subcity_content.subcity_id = ?)");
      queryParams.push(subCityId);
    }

    // Construct WHERE clause dynamically
    const whereCondition = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

    // Fetch total count for pagination
    const totalRecordCount = await executeQuery(`SELECT COUNT(subcity_content.id) AS total_count FROM subcity_content LEFT JOIN subcity ON subcity.id = subcity_content.subcity_id ${whereCondition};`, queryParams);
    const totalRecords = totalRecordCount[0]?.total_count || 0;
    const totalPages = Math.ceil(totalRecords / perPageLimit);

    // Fetch user list
    const q = `
      SELECT 
      subcity_content.*, subcity.subcity FROM subcity_content LEFT JOIN subcity ON subcity.id = subcity_content.subcity_id
      ${whereCondition}
      ORDER BY subcity_content.id DESC
      LIMIT ? OFFSET ?;
    `;
    queryParams.push(perPageLimit, offset);
    const getList = await getTableRecord(q, queryParams);

    getList.forEach((item, index) => {
      item.srNo = offset + (index + 1);
      item.formattedDate = formattedDate(item.date, 'yyyy-MMM-dd');
    });

    res.json(createSuccessResponse('Data retrieved successfully.', {
      list: getList,
      pagination: { currentPage: page, totalPages, perPageLimit, totalRecords }
    }));

  } catch (error) {
    next(error);
  }
};

const subCityContentDetail = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { id } = query;

    // Validate if the user object is available
    if (!user || !user.id || !user.username) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Check if required parameters are provided
    if (!id) {
      return res.status(400).json(createErrorResponse("Missing required parameters."));
    }
    else if (id && isNaN(id)) {
      return res.status(400).json(createErrorResponse("Invalid parameter value."));
    }

    const whereCondition = `WHERE 1=1`;
    const q = `
      SELECT 
        subcity_content.id, subcity_content.subcity_id AS subCityId, subcity.country AS countryId,  subcity.city AS cityId, subcity_content.content  FROM subcity_content LEFT JOIN subcity ON subcity.id = subcity_content.subcity_id
      ${whereCondition} AND subcity_content.id = ?
      ORDER BY subcity_content.id DESC;
    `;

    const recordDetail = await getTableRecord(q, [id], true);
    if (!recordDetail) {
      return res.status(400).json(createErrorResponse(message = "Record Not Found.", data = null, code = "RECORD_NOT_FOUND"));
    }

    res.json(createSuccessResponse('Data retrieved successfully.', recordDetail));

  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const subCityContentSave = async (req, res, next) => {
  let transaction;

  try {
    const { user, body } = req;
    const { id = '', subCityId = '', content = '' } = body;

    // Validate user session
    if (!user || !user?.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    const subCityIds = subCityId.split(",").map((s) => s.trim()).filter(Boolean); // Ensure valid subCityIds

    // **Step 1: Check for Duplicates Before Transaction**
    const duplicateCheckMap = new Map();
    for (const subCity of subCityIds) {
      const key = `${subCity}`;
      if (!duplicateCheckMap.has(key)) {
        const existingContent = await getTableRecord(
          `SELECT subcity_content.id, subcity.subcity FROM subcity_content INNER JOIN subcity ON subcity.id = subcity_content.subcity_id WHERE subcity_content.subcity_id = ? LIMIT 1;`,
          [subCity],
          true
        );

        if (existingContent && (!id || existingContent.id !== id)) {
          return res.status(400).json(createErrorResponse(
            `Duplicate record found for SubCity: ${existingContent.subcity}.`,
            null,
            'DUPLICATE_RECORD'
          ));
        }
        duplicateCheckMap.set(key, existingContent);
      }
    }

    // **Step 2: Proceed with Insert/Update Only if No Duplicates Were Found**
    // Start transaction
    transaction = await startTransaction();
    for (const subCity of subCityIds) {

      const key = `${subCity}`;
      const existingRecord = duplicateCheckMap.get(key);

      let setRecordData = {
        subcity_id: subCity,
        content,
        added_by: user?.id,
        date: new Date()
      };

      if (id) {
        // Check if the record exists before updating
        const singleDetail = await getTableRecord(`SELECT id FROM subcity_content WHERE id = ? LIMIT 1;`, [id], true);
        if (!singleDetail) {
          await rollbackTransaction(transaction);
          return res.status(400).json(createErrorResponse('Record Not Found.', null, 'RECORD_NOT_FOUND'));
        }

        if (existingRecord?.id === id) {
          await updateRecord('subcity_content', setRecordData, { id }, transaction);
        } else {
          await insertRecord('subcity_content', setRecordData, transaction);
        }
      } else {
        // Insert new record
        await insertRecord('subcity_content', setRecordData, transaction);
      }
    }

    // **Step 3: Commit Transaction (Only If Everything is Fine)**
    await commitTransaction(transaction);
    res.json(createSuccessResponse('Records saved successfully.', null, 'RECORD_SAVED'));

  } catch (error) {
    if (transaction) await rollbackTransaction(transaction);
    next(error);
  }
};

const subCategoryContentSeo = async (req, res, next) => {
  try {

    const settings = await getSettingsData();

    // Prepare metadata for headers
    const logo_img = settings.header_logo_path && fileExists(settings.header_logo_path) ? `${req.appBaseUrl}/uploads/${settings.header_logo_path}` : `${req.appBaseUrl}/uploads/backend/images/settings/header_logo_15477661460.png`;

    const header_data = {
      author: 'localxlist.org',
      title: `Sub Category Content | Localxlist`,
      description: `Sub Category Content | Localxlist`,
      keywords: "Sub Category Content | Localxlist",
      favicon: settings.favicon && fileExists(settings.favicon) ? `${req.appBaseUrl}/uploads/${settings.favicon}` : '',
      image: logo_img,

      ogType: "website",
      ogTitle: `Sub Category Content | Localxlist`,
      ogSiteName: "localxlist.org",
      ogUrl: "https://localxlist.org/",
      ogDescription: `Sub Category Content | Localxlist`,
      ogImage: logo_img,
      ogImageHeight: "377",

      twitterCard: "summary_large_image",
      twitterSite: "localxlist",
      twitterCreator: "localxlist",
      twitterTitle: `Sub Category Content | Localxlist`,
      twitterDescription: `Sub Category Content | Localxlist`,
      twitterImage: logo_img,
      generator: "localxlist.org",
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

const subCategoryContents = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { page = 1, keyword = '' } = query;

    if (!user?.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    const perPageLimit = LIMIT.ADMIN_SUBCATEGORY_CONTENTS || 10;
    const offset = (page - 1) * perPageLimit;

    let whereClauses = [];
    let queryParams = [];

    // Keyword search
    if (keyword.trim()) {
      whereClauses.push("(subcategory_content.content LIKE ? OR subcity.subcity LIKE ? OR  category.category LIKE ? OR subcategory.subcategory LIKE ? )");
      const searchKeyword = `%${keyword.trim()}%`;
      queryParams.push(searchKeyword, searchKeyword, searchKeyword, searchKeyword);
    }


    // Construct WHERE clause dynamically
    const whereCondition = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

    // Fetch total count for pagination
    const totalRecordCount = await executeQuery(`SELECT COUNT(subcategory_content.id) AS total_count  FROM subcategory_content
      LEFT JOIN subcity ON subcity.id = subcategory_content.subcity_id
      LEFT JOIN category ON category.id = subcategory_content.category_id
      LEFT JOIN subcategory ON subcategory.id = subcategory_content.subcategory_id ${whereCondition};`, queryParams);
    const totalRecords = totalRecordCount[0]?.total_count || 0;
    const totalPages = Math.ceil(totalRecords / perPageLimit);

    // Fetch user list
    const q = `
      SELECT 
      subcategory_content.id,
      subcategory_content.content,
      subcategory_content.date,

      subcity.subcity,
      category.category,
      subcategory.subcategory
      
      FROM subcategory_content
      LEFT JOIN subcity ON subcity.id = subcategory_content.subcity_id
      LEFT JOIN category ON category.id = subcategory_content.category_id
      LEFT JOIN subcategory ON subcategory.id = subcategory_content.subcategory_id

      ${whereCondition}
      ORDER BY subcategory_content.id DESC
      LIMIT ? OFFSET ?;
    `;
    queryParams.push(perPageLimit, offset);
    const getList = await getTableRecord(q, queryParams);

    getList.forEach((item, index) => {
      item.srNo = offset + (index + 1);
      item.formattedDate = formattedDate(item.date, 'yyyy-MMM-dd');
    });

    res.json(createSuccessResponse('Data retrieved successfully.', {
      list: getList,
      pagination: { currentPage: page, totalPages, perPageLimit, totalRecords }
    }));

  } catch (error) {
    next(error);
  }
};

const subCategoryContentDetail = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { id } = query;

    // Validate if the user object is available
    if (!user || !user.id || !user.username) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Check if required parameters are provided
    if (!id) {
      return res.status(400).json(createErrorResponse("Missing required parameters."));
    }
    else if (id && isNaN(id)) {
      return res.status(400).json(createErrorResponse("Invalid parameter value."));
    }

    const whereCondition = `WHERE 1=1`;
    const q = `
      SELECT 
      id, content, country_id AS  countryId, 
      city_id AS cityId,
      subcity_id AS subCityId,
      category_id AS categoryId,
      subcategory_id AS subCategoryId
 FROM subcategory_content
      ${whereCondition} AND id = ?
      ORDER BY id DESC;
    `;

    const recordDetail = await getTableRecord(q, [id], true);
    if (!recordDetail) {
      return res.status(400).json(createErrorResponse(message = "Record Not Found.", data = null, code = "RECORD_NOT_FOUND"));
    }

    res.json(createSuccessResponse('Data retrieved successfully.', recordDetail));

  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const subCategoryContentSave = async (req, res, next) => {
  let transaction;

  try {
    const { user, body } = req;
    const { id = '', countryId = '', cityId = '', subCityId = '', categoryId = '', subCategoryId = '', content = '' } = body;

    // Validate user session
    if (!user?.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    const countryIds = countryId.split(",").map(s => s.trim()).filter(Boolean);
    const cityIds = cityId.split(",").map(s => s.trim()).filter(Boolean);
    const subCityIds = subCityId.split(",").map(s => s.trim()).filter(Boolean);
    const categoryIds = categoryId.split(",").map(s => s.trim()).filter(Boolean);
    const subCategoryIds = subCategoryId.split(",").map(s => s.trim()).filter(Boolean);

    // Fetch related data in a single query
    const [subCityData, subCategoryData] = await Promise.all([
      getTableRecord(
        'SELECT id, country AS countryId, city AS cityId, subcity FROM subcity WHERE id IN (?) AND city IN (?);',
        [subCityIds, cityIds]
      ),
      getTableRecord(
        'SELECT id, category AS categoryId, subcategory FROM subcategory WHERE id IN (?) AND category IN (?);',
        [subCategoryIds, categoryIds]
      )
    ]);

    if (!subCityData.length || !subCategoryData.length) {
      return res.status(400).json(createErrorResponse('Invalid SubCity or SubCategory data.'));
    }

    // **Step 1: Check for Duplicates Before Transaction**
    const duplicateCheckMap = new Map();

    for (const subCity of subCityData) {
      for (const subCategory of subCategoryData) {
        const key = `${subCity.id}_${subCategory.id}`;

        if (!duplicateCheckMap.has(key)) {
          const existingContent = await getTableRecord(
            `SELECT id FROM subcategory_content WHERE subcity_id = ? AND subcategory_id = ? LIMIT 1;`,
            [subCity.id, subCategory.id],
            true
          );

          if (existingContent && (!id || existingContent.id !== id)) {
            return res.status(400).json(createErrorResponse(
              `Duplicate record found for SubCity: ${subCity.subcity} and SubCategory: ${subCategory.subcategory}.`,
              null,
              'DUPLICATE_RECORD'
            ));
          }

          duplicateCheckMap.set(key, existingContent);
        }
      }
    }

    // **Step 2: Proceed with Insert/Update Only if No Duplicates Were Found**
    transaction = await startTransaction();

    for (const subCity of subCityData) {
      for (const subCategory of subCategoryData) {
        const key = `${subCity.id}_${subCategory.id}`;
        const existingRecord = duplicateCheckMap.get(key);

        let setRecordData = {
          country_id: subCity.countryId,
          city_id: subCity.cityId,
          subcity_id: subCity.id,
          category_id: subCategory.categoryId,
          subcategory_id: subCategory.id,
          content,
          added_by: user.id,
          date: new Date()
        };

        if (id) {
          // Ensure the record exists before updating
          const singleDetail = await getTableRecord(`SELECT id FROM subcategory_content WHERE id = ? LIMIT 1;`, [id], true);
          if (!singleDetail) {
            await rollbackTransaction(transaction);
            return res.status(400).json(createErrorResponse('Record Not Found.', null, 'RECORD_NOT_FOUND'));
          }

          if (existingRecord?.id === id) {
            await updateRecord('subcategory_content', setRecordData, { id }, transaction);
          } else {
            await insertRecord('subcategory_content', setRecordData, transaction);
          }
        } else {
          await insertRecord('subcategory_content', setRecordData, transaction);
        }
      }
    }

    // **Step 3: Commit Transaction (Only If Everything is Fine)**
    await commitTransaction(transaction);
    res.json(createSuccessResponse('Record saved successfully.', null, 'RECORD_SAVED'));

  } catch (error) {
    if (transaction) await rollbackTransaction(transaction);
    next(error);
  }
};



const siteLinkCategorySeo = async (req, res, next) => {
  try {

    const settings = await getSettingsData();

    // Prepare metadata for headers
    const logo_img = settings.header_logo_path && fileExists(settings.header_logo_path) ? `${req.appBaseUrl}/uploads/${settings.header_logo_path}` : `${req.appBaseUrl}/uploads/backend/images/settings/header_logo_15477661460.png`;

    const header_data = {
      author: 'localxlist.org',
      title: `Site Link Categories | Localxlist`,
      description: `Site Link Categories | Localxlist`,
      keywords: "Site Link Categories | Localxlist",
      favicon: settings.favicon && fileExists(settings.favicon) ? `${req.appBaseUrl}/uploads/${settings.favicon}` : '',
      image: logo_img,

      ogType: "website",
      ogTitle: `Site Link Categories | Localxlist`,
      ogSiteName: "localxlist.org",
      ogUrl: "https://localxlist.org/",
      ogDescription: `Site Link Categories | Localxlist`,
      ogImage: logo_img,
      ogImageHeight: "377",

      twitterCard: "summary_large_image",
      twitterSite: "localxlist",
      twitterCreator: "localxlist",
      twitterTitle: `Site Link Categories | Localxlist`,
      twitterDescription: `Site Link Categories | Localxlist`,
      twitterImage: logo_img,
      generator: "localxlist.org",
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

const siteLinkCategoryDetail = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { id } = query;

    // Validate if the user object is available
    if (!user || !user.id || !user.username) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Check if required parameters are provided
    if (!id) {
      return res.status(400).json(createErrorResponse("Missing required parameters."));
    }
    else if (id && isNaN(id)) {
      return res.status(400).json(createErrorResponse("Invalid parameter value."));
    }

    const whereCondition = `WHERE 1=1`;
    const q = `
      SELECT 
        * FROM sites_link_category
      ${whereCondition} AND id = ?
      ORDER BY id DESC;
    `;

    const recordDetail = await getTableRecord(q, [id], true);
    if (!recordDetail) {
      return res.status(400).json(createErrorResponse(message = "Record Not Found.", data = null, code = "RECORD_NOT_FOUND"));
    }

    res.json(createSuccessResponse('Data retrieved successfully.', recordDetail));

  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const siteLinkCategorySave = async (req, res, next) => {
  let transaction;

  try {
    const { user, body } = req;
    const { id = '', category = '', content = '' } = body;

    // Validate user session
    if (!user || !user?.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Start transaction
    transaction = await startTransaction();

    console.log({
      category, content
    });


    // Prepare record data
    let setRecordData = {
      category,
      content,
    };

    if (id) {
      // Check if the record exists before updating
      const singleDetail = await getTableRecord(`SELECT id FROM sites_link_category WHERE id = ? LIMIT 1;`, [id], true);
      if (!singleDetail) {
        await rollbackTransaction(transaction);
        return res.status(400).json(createErrorResponse('Record Not Found.', null, 'RECORD_NOT_FOUND'));
      }

      // Update the record
      const affectedRows = await updateRecord('sites_link_category', setRecordData, { id }, transaction);
      console.log(`Updated record affectedRows:${affectedRows}`);
    } else {
      // Insert new record
      const recordInsertedId = await insertRecord('sites_link_category', setRecordData, transaction);
      console.log(`Saved record Id:${recordInsertedId}`);
      setRecordData.id = recordInsertedId;
    }

    // Commit transaction
    await commitTransaction(transaction);
    res.json(createSuccessResponse('Record saved successfully.', setRecordData.id || id, 'RECORD_SAVED'));

  } catch (error) {
    if (transaction) await rollbackTransaction(transaction);
    next(error);
  }
};

const sponseredLinkSeo = async (req, res, next) => {
  try {

    const settings = await getSettingsData();

    // Prepare metadata for headers
    const logo_img = settings.header_logo_path && fileExists(settings.header_logo_path) ? `${req.appBaseUrl}/uploads/${settings.header_logo_path}` : `${req.appBaseUrl}/uploads/backend/images/settings/header_logo_15477661460.png`;

    const header_data = {
      author: 'localxlist.org',
      title: `Sponsered Links | Localxlist`,
      description: `Sponsered Links | Localxlist`,
      keywords: "Sponsered Links | Localxlist",
      favicon: settings.favicon && fileExists(settings.favicon) ? `${req.appBaseUrl}/uploads/${settings.favicon}` : '',
      image: logo_img,

      ogType: "website",
      ogTitle: `Sponsered Links | Localxlist`,
      ogSiteName: "localxlist.org",
      ogUrl: "https://localxlist.org/",
      ogDescription: `Sponsered Links | Localxlist`,
      ogImage: logo_img,
      ogImageHeight: "377",

      twitterCard: "summary_large_image",
      twitterSite: "localxlist",
      twitterCreator: "localxlist",
      twitterTitle: `Sponsered Links | Localxlist`,
      twitterDescription: `Sponsered Links | Localxlist`,
      twitterImage: logo_img,
      generator: "localxlist.org",
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

const sponseredLinks = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { page = 1, keyword = '' } = query;

    if (!user?.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    const perPageLimit = LIMIT.ADMIN_SPONSERED_LINKS || 10;
    const offset = (page - 1) * perPageLimit;

    let whereClauses = [];
    let queryParams = [];

    // Keyword search
    if (keyword.trim()) {
      whereClauses.push("(text LIKE ? OR  title LIKE ? OR  url LIKE ?)");
      const searchKeyword = `%${keyword.trim()}%`;
      queryParams.push(searchKeyword, searchKeyword, searchKeyword);
    }

    // Construct WHERE clause dynamically
    const whereCondition = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

    // Fetch total count for pagination
    const totalRecordCount = await executeQuery(`SELECT COUNT(id) AS total_count  FROM sponsors_links ${whereCondition};`, queryParams);
    const totalRecords = totalRecordCount[0]?.total_count || 0;
    const totalPages = Math.ceil(totalRecords / perPageLimit);

    // Fetch user list
    const q = `
      SELECT 
      * FROM sponsors_links
      ${whereCondition}
      ORDER BY id DESC
      LIMIT ? OFFSET ?;
    `;
    queryParams.push(perPageLimit, offset);
    const getList = await getTableRecord(q, queryParams);

    getList.forEach((item, index) => {
      item.srNo = offset + (index + 1);
    });

    res.json(createSuccessResponse('Data retrieved successfully.', {
      list: getList,
      pagination: { currentPage: page, totalPages, perPageLimit, totalRecords }
    }));

  } catch (error) {
    next(error);
  }
};

const sponseredLinkDetail = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { id } = query;

    // Validate if the user object is available
    if (!user || !user.id || !user.username) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Check if required parameters are provided
    if (!id) {
      return res.status(400).json(createErrorResponse("Missing required parameters."));
    }
    else if (id && isNaN(id)) {
      return res.status(400).json(createErrorResponse("Invalid parameter value."));
    }

    const whereCondition = `WHERE 1=1`;
    const q = `
      SELECT 
        * FROM sponsors_links
      ${whereCondition} AND id = ?
      ORDER BY id DESC;
    `;

    const recordDetail = await getTableRecord(q, [id], true);
    if (!recordDetail) {
      return res.status(400).json(createErrorResponse(message = "Record Not Found.", data = null, code = "RECORD_NOT_FOUND"));
    }

    res.json(createSuccessResponse('Data retrieved successfully.', recordDetail));

  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const sponseredLinkSave = async (req, res, next) => {
  let transaction;

  try {
    const { user, body } = req;
    const { id = '', text, url, title, sort_order } = body;

    // Validate user session
    if (!user || !user?.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Start transaction
    transaction = await startTransaction();

    // Prepare record data
    let setRecordData = {
      text, url, title, sort_order,
    };

    if (id) {
      // Check if the record exists before updating
      const singleDetail = await getTableRecord(`SELECT id FROM sponsors_links WHERE id = ? LIMIT 1;`, [id], true);
      if (!singleDetail) {
        await rollbackTransaction(transaction);
        return res.status(400).json(createErrorResponse('Record Not Found.', null, 'RECORD_NOT_FOUND'));
      }
      setRecordData.date_modified = new Date();
      // Update the record
      const affectedRows = await updateRecord('sponsors_links', setRecordData, { id }, transaction);
      console.log(`Updated record affectedRows:${affectedRows}`);
    } else {
      // Insert new record
      setRecordData.date_created = new Date();
      setRecordData.date_modified = new Date();

      const recordInsertedId = await insertRecord('sponsors_links', setRecordData, transaction);
      console.log(`Saved record Id:${recordInsertedId}`);
      setRecordData.id = recordInsertedId;
    }

    // Commit transaction
    await commitTransaction(transaction);
    res.json(createSuccessResponse('Record saved successfully.', setRecordData.id || id, 'RECORD_SAVED'));

  } catch (error) {
    if (transaction) await rollbackTransaction(transaction);
    next(error);
  }
};


const friendLinkSeo = async (req, res, next) => {
  try {

    const settings = await getSettingsData();

    // Prepare metadata for headers
    const logo_img = settings.header_logo_path && fileExists(settings.header_logo_path) ? `${req.appBaseUrl}/uploads/${settings.header_logo_path}` : `${req.appBaseUrl}/uploads/backend/images/settings/header_logo_15477661460.png`;

    const header_data = {
      author: 'localxlist.org',
      title: `Friend Links | Localxlist`,
      description: `Friend Links | Localxlist`,
      keywords: "Friend Links | Localxlist",
      favicon: settings.favicon && fileExists(settings.favicon) ? `${req.appBaseUrl}/uploads/${settings.favicon}` : '',
      image: logo_img,

      ogType: "website",
      ogTitle: `Friend Links | Localxlist`,
      ogSiteName: "localxlist.org",
      ogUrl: "https://localxlist.org/",
      ogDescription: `Friend Links | Localxlist`,
      ogImage: logo_img,
      ogImageHeight: "377",

      twitterCard: "summary_large_image",
      twitterSite: "localxlist",
      twitterCreator: "localxlist",
      twitterTitle: `Friend Links | Localxlist`,
      twitterDescription: `Friend Links | Localxlist`,
      twitterImage: logo_img,
      generator: "localxlist.org",
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

const friendLinks = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { page = 1, keyword = '', text, url, title, sort_order } = query;

    if (!user?.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    const perPageLimit = LIMIT.ADMIN_FRIEND_LINKS || 10;
    const offset = (page - 1) * perPageLimit;

    let whereClauses = [];
    let queryParams = [];

    // Keyword search
    if (keyword.trim()) {
      whereClauses.push("(text LIKE ? OR  title LIKE ?)");
      const searchKeyword = `%${keyword}%`;
      queryParams.push(searchKeyword, searchKeyword);
    }

    // Construct WHERE clause dynamically
    const whereCondition = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

    // Fetch total count for pagination
    const totalRecordCount = await executeQuery(`SELECT COUNT(id) AS total_count  FROM friends_links ${whereCondition};`, queryParams);
    const totalRecords = totalRecordCount[0]?.total_count || 0;
    const totalPages = Math.ceil(totalRecords / perPageLimit);

    // Fetch user list
    const q = `
      SELECT 
      * FROM friends_links
      ${whereCondition}
      ORDER BY id DESC
      LIMIT ? OFFSET ?;
    `;
    queryParams.push(perPageLimit, offset);
    const getList = await getTableRecord(q, queryParams);

    getList.forEach((item, index) => {
      item.srNo = offset + (index + 1);
    });

    res.json(createSuccessResponse('Data retrieved successfully.', {
      list: getList,
      pagination: { currentPage: page, totalPages, perPageLimit, totalRecords }
    }));

  } catch (error) {
    next(error);
  }
};

const friendLinkDetail = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { id } = query;

    // Validate if the user object is available
    if (!user || !user.id || !user.username) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Check if required parameters are provided
    if (!id) {
      return res.status(400).json(createErrorResponse("Missing required parameters."));
    }
    else if (id && isNaN(id)) {
      return res.status(400).json(createErrorResponse("Invalid parameter value."));
    }

    const whereCondition = `WHERE 1=1`;
    const q = `
      SELECT 
        * FROM friends_links
      ${whereCondition} AND id = ?
      ORDER BY id DESC;
    `;

    const recordDetail = await getTableRecord(q, [id], true);
    if (!recordDetail) {
      return res.status(400).json(createErrorResponse(message = "Record Not Found.", data = null, code = "RECORD_NOT_FOUND"));
    }

    res.json(createSuccessResponse('Data retrieved successfully.', recordDetail));

  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const friendLinkSave = async (req, res, next) => {
  let transaction;

  try {
    const { user, body } = req;
    const { id = '', text, url, title, sort_order } = body;

    // Validate user session
    if (!user || !user?.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Start transaction
    transaction = await startTransaction();

    // Prepare record data
    let setRecordData = {
      text, url, title, sort_order,
    };

    if (id) {
      // Check if the record exists before updating
      const singleDetail = await getTableRecord(`SELECT id FROM friends_links WHERE id = ? LIMIT 1;`, [id], true);
      if (!singleDetail) {
        await rollbackTransaction(transaction);
        return res.status(400).json(createErrorResponse('Record Not Found.', null, 'RECORD_NOT_FOUND'));
      }
      setRecordData.date_modified = new Date();
      // Update the record
      const affectedRows = await updateRecord('friends_links', setRecordData, { id }, transaction);
      console.log(`Updated record affectedRows:${affectedRows}`);
    } else {
      // Insert new record
      setRecordData.date_created = new Date();
      setRecordData.date_modified = new Date();

      const recordInsertedId = await insertRecord('friends_links', setRecordData, transaction);
      console.log(`Saved record Id:${recordInsertedId}`);
      setRecordData.id = recordInsertedId;
    }

    // Commit transaction
    await commitTransaction(transaction);
    res.json(createSuccessResponse('Record saved successfully.', setRecordData.id || id, 'RECORD_SAVED'));

  } catch (error) {
    if (transaction) await rollbackTransaction(transaction);
    next(error);
  }
};

const siteSettingsSeo = async (req, res, next) => {
  try {

    const settings = await getSettingsData();

    // Prepare metadata for headers
    const logo_img = settings.header_logo_path && fileExists(settings.header_logo_path) ? `${req.appBaseUrl}/uploads/${settings.header_logo_path}` : `${req.appBaseUrl}/uploads/backend/images/settings/header_logo_15477661460.png`;

    const header_data = {
      author: 'localxlist.org',
      title: `Settings | Localxlist`,
      description: `Settings | Localxlist`,
      keywords: "Settings | Localxlist",
      favicon: settings.favicon && fileExists(settings.favicon) ? `${req.appBaseUrl}/uploads/${settings.favicon}` : '',
      image: logo_img,

      ogType: "website",
      ogTitle: `Settings | Localxlist`,
      ogSiteName: "localxlist.org",
      ogUrl: "https://localxlist.org/",
      ogDescription: `Settings | Localxlist`,
      ogImage: logo_img,
      ogImageHeight: "377",

      twitterCard: "summary_large_image",
      twitterSite: "localxlist",
      twitterCreator: "localxlist",
      twitterTitle: `Settings | Localxlist`,
      twitterDescription: `Settings | Localxlist`,
      twitterImage: logo_img,
      generator: "localxlist.org",
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

const siteSettingsDetail = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { id } = query;

    // Validate if the user object is available
    if (!user || !user.id || !user.username) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Check if required parameters are provided
    if (!id) {
      return res.status(400).json(createErrorResponse("Missing required parameters."));
    }
    else if (id && isNaN(id)) {
      return res.status(400).json(createErrorResponse("Invalid parameter value."));
    }

    const recordDetail = await getSettingsData();

    if (!recordDetail) {
      return res.status(400).json(createErrorResponse(message = "Record Not Found.", data = null, code = "RECORD_NOT_FOUND"));
    }


    recordDetail.faviconFullPath = recordDetail?.favicon && fileExists(recordDetail?.favicon) ? `${req.appBaseUrl}/uploads/${recordDetail.favicon}` : `${req.appBaseUrl}/uploads/${COMMON_CONFIG.admin.DEFAULT_NO_IMG}`;
    recordDetail.headerLogoFullPath = recordDetail?.header_logo_path && fileExists(recordDetail?.header_logo_path) ? `${req.appBaseUrl}/uploads/${recordDetail.header_logo_path}` : `${req.appBaseUrl}/uploads/${COMMON_CONFIG.admin.DEFAULT_NO_IMG}`;
    recordDetail.footerLogoFullPath = recordDetail?.footer_logo_path && fileExists(recordDetail?.footer_logo_path) ? `${req.appBaseUrl}/uploads/${recordDetail.footer_logo_path}` : `${req.appBaseUrl}/uploads/${COMMON_CONFIG.admin.DEFAULT_NO_IMG}`;


    res.json(createSuccessResponse('Data retrieved successfully.', recordDetail));

  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const settingsSave2 = async (req, res, next) => {
  let transaction;
  let uploadedFiles = [];

  const deleteUploadedFilesWhenError = (filePaths) => {
    if (filePaths && filePaths.length > 0) {
      filePaths.forEach((filePath) => {
        console.log("Deleting:", filePath);

        fs.unlink(filePath, (err) => {
          if (err) {
            console.error(`Failed to delete file: ${filePath}`, err);
          } else {
            console.log(`File deleted: ${filePath}`);
          }
        });
      });
    }
  };

  try {
    const { user, body, files } = req;
    const { id = 1, site_name, header_text, footer_text, banner_path, header_logo_path, footer_logo_path, favicon, currency, address, phone, email, social_media = {}, member_default_cradit, charged_for_per_post, by_default_ad_showing_for, current_ad, site_link_home_content, home_our_directory, sponsored_links, sponsored_heading, sponsored_links_desktop, sponsored_links_mobile, paginate_limit, support_email, post_duration } = body;

    // Access uploaded files
    const logoFile = files.logo ? files.logo[0] : null; // Gets logo if uploaded
    const logoFilePath = `${UPLOADED_PATH.SITE_LINK_LOGO}/${logoFile?.filename}`;

    const imageFile = files.image ? files.image[0] : null; // Gets image if uploaded
    const imageFilePath = `${UPLOADED_PATH.SITE_LINK_IMAGE}/${imageFile?.filename}`;

    // Collect file paths for deletion if needed
    uploadedFiles = [logoFile?.path, imageFile?.path].filter(Boolean);

    // Validate user session
    if (!user || !user?.id) {
      deleteUploadedFilesWhenError(uploadedFiles);

      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Start transaction
    transaction = await startTransaction();

    // Prepare record data
    let setRecordData = {
      text, url, title, sort_order,
    };

    if (id) {
      // Check if the record exists before updating
      const singleDetail = await getTableRecord(`SELECT id FROM friends_links WHERE id = ? LIMIT 1;`, [id], true);
      if (!singleDetail) {
        deleteUploadedFilesWhenError(uploadedFiles);
        await rollbackTransaction(transaction);
        return res.status(400).json(createErrorResponse('Record Not Found.', null, 'RECORD_NOT_FOUND'));
      }
      setRecordData.date_modified = new Date();

      if (logoFile?.filename) {
        // Delete the logo file if it exists
        const oldLogoPath = siteDetail.logo ? path.join(global.uploadsBaseDir, siteDetail.logo) : null;
        if (oldLogoPath) {
          try {
            await fs.promises.access(oldLogoPath); // Check if the logo exists
            await fs.promises.unlink(oldLogoPath); // Delete the logo
          } catch (err) {
            console.error(`Error deleting logo: ${siteDetail.logo}:`, err);
          }
        }
        // update with new
        setRecordData.logo = logoFile?.filename && logoFilePath || "";
      }

      if (imageFile?.filename) {
        // Delete the image file if it exists
        const oldImagePath = siteDetail.image ? path.join(global.uploadsBaseDir, siteDetail.image) : null;
        if (oldImagePath) {
          try {
            await fs.promises.access(oldImagePath); // Check if the logo exists
            await fs.promises.unlink(oldImagePath); // Delete the logo
          } catch (err) {
            console.error(`Error deleting image: ${siteDetail.image}:`, err);
          }
        }
        // update with new
        setRecordData.image = imageFile?.filename && imageFilePath || "";
      }

      // Update the record
      const affectedRows = await updateRecord('settings', setRecordData, { id }, transaction);
      console.log(`Updated record affectedRows:${affectedRows}`);
    } else {

      // Insert new record
      if (!logoFile || !logoFile?.filename) {
        return res.status(400).json(createValidationErrorResponse("Logo is required.", []));
      }
      if (!imageFile || !imageFile?.filename) {
        return res.status(400).json(createValidationErrorResponse("Image preview is required.", []));
      }
      setRecordData.logo = logoFile?.filename && logoFilePath || "";
      setRecordData.image = imageFile?.filename && imageFilePath || "";

      setRecordData.date_created = new Date();
      setRecordData.date_modified = new Date();

      const recordInsertedId = await insertRecord('settings', setRecordData, transaction);
      console.log(`Saved record Id:${recordInsertedId}`);
      setRecordData.id = recordInsertedId;
    }

    // Commit transaction
    await commitTransaction(transaction);
    res.json(createSuccessResponse('Record saved successfully.', setRecordData.id || id, 'RECORD_SAVED'));

  } catch (error) {
    if (transaction) await rollbackTransaction(transaction);
    next(error);
  }
};

const siteSettingsSave = async (req, res, next) => {
  let transaction;
  let uploadedFiles = [];

  const imageFields = [
    {
      field: "faviconImage",
      column: 'favicon'
    },
    {
      field: "headerImage",
      column: 'header_logo_path'
    },
    {
      field: "footerImage",
      column: 'footer_logo_path'
    }];

  const deleteUploadedFilesWhenError = (filePaths) => {
    filePaths.forEach((filePath) => {
      if (filePath) {
        fs.unlink(filePath, (err) => {
          if (err) console.error(`Failed to delete file: ${filePath}`, err);
        });
      }
    });
  };

  try {
    const { user, body, files } = req;
    if (!user || !user.id) return res.status(400).json(createErrorResponse('Invalid user data.'));

    const { id = 1, ...otherFields } = body;
    let setRecordData = {};

    // Fetch existing record if updating
    let existingRecord = null;
    if (id) {
      existingRecord = await getTableRecord('SELECT id, favicon,header_logo_path,footer_logo_path FROM settings WHERE id = ? LIMIT 1;', [id], true);
      if (!existingRecord) {
        return res.status(400).json(createErrorResponse('Record Not Found.', null, 'RECORD_NOT_FOUND'));
      }
    }

    // Handle image uploads dynamically
    imageFields.forEach((img) => {
      if (files[img.field]) {
        const uploadedFile = files[img.field][0];
        setRecordData[img.column] = `${UPLOADED_PATH.ADMIN_SETTINGS_IMAGE}/${uploadedFile.filename}`;
        uploadedFiles.push(uploadedFile.path);

        // Delete old file if exists
        if (existingRecord && existingRecord[img.column]) {
          const oldFilePath = path.join(global.uploadsBaseDir, existingRecord[img.column]);
          fs.unlink(oldFilePath, (err) => {
            if (err) console.error(`Failed to delete old file: ${oldFilePath}`, err);
          });
        }
      } else {
        setRecordData[img.column] = existingRecord ? existingRecord[img.column] : null;
      }
    });

    // Add other fields if they are present
    Object.keys(otherFields).forEach((key) => {
      if (otherFields[key] !== undefined && otherFields[key] !== null) {
        setRecordData[key] = otherFields[key];
      }
    });

    transaction = await startTransaction();

    if (id) {
      await updateRecord('settings', setRecordData, { id }, transaction);
    } else {
      const insertedId = await insertRecord('settings', setRecordData, transaction);
      setRecordData.id = insertedId;
    }

    await commitTransaction(transaction);
    res.json(createSuccessResponse('Record saved successfully.', setRecordData.id || id, 'RECORD_SAVED'));
  } catch (error) {
    if (transaction) await rollbackTransaction(transaction);
    deleteUploadedFilesWhenError(uploadedFiles);
    next(error);
  }
};

const smtpSeo = async (req, res, next) => {
  try {

    const settings = await getSettingsData();

    // Prepare metadata for headers
    const logo_img = settings.header_logo_path && fileExists(settings.header_logo_path) ? `${req.appBaseUrl}/uploads/${settings.header_logo_path}` : `${req.appBaseUrl}/uploads/backend/images/settings/header_logo_15477661460.png`;

    const header_data = {
      author: 'localxlist.org',
      title: `SMTP | Localxlist`,
      description: `SMTP | Localxlist`,
      keywords: "SMTP | Localxlist",
      favicon: settings.favicon && fileExists(settings.favicon) ? `${req.appBaseUrl}/uploads/${settings.favicon}` : '',
      image: logo_img,

      ogType: "website",
      ogTitle: `SMTP | Localxlist`,
      ogSiteName: "localxlist.org",
      ogUrl: "https://localxlist.org/",
      ogDescription: `SMTP | Localxlist`,
      ogImage: logo_img,
      ogImageHeight: "377",

      twitterCard: "summary_large_image",
      twitterSite: "localxlist",
      twitterCreator: "localxlist",
      twitterTitle: `SMTP | Localxlist`,
      twitterDescription: `SMTP | Localxlist`,
      twitterImage: logo_img,
      generator: "localxlist.org",
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

const smtpDetail = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { id = 1 } = query;

    // Validate if the user object is available
    if (!user || !user.id || !user.username) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Check if required parameters are provided
    if (!id) {
      return res.status(400).json(createErrorResponse("Missing required parameters."));
    }
    else if (id && isNaN(id)) {
      return res.status(400).json(createErrorResponse("Invalid parameter value."));
    }

    const whereCondition = `WHERE 1=1`;
    const q = `
      SELECT 
        * FROM e_smtp
      ${whereCondition} AND id = ?
      ORDER BY id DESC;
    `;

    const recordDetail = await getTableRecord(q, [id], true);

    if (!recordDetail) {
      return res.status(400).json(createErrorResponse(message = "Record Not Found.", data = null, code = "RECORD_NOT_FOUND"));
    }

    res.json(createSuccessResponse('Data retrieved successfully.', recordDetail));

  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const smtpSave = async (req, res, next) => {
  let transaction;

  try {
    const { user, body } = req;
    const { id = '', protocol, smtp_host, smtp_user, smtp_pass, email_from, smtp_port } = body;

    // Validate user session
    if (!user || !user?.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Start transaction
    transaction = await startTransaction();

    // Prepare record data
    let setRecordData = {
      protocol, smtp_host, smtp_user, smtp_pass, email_from, smtp_port
    };

    if (id) {
      // Check if the record exists before updating
      const singleDetail = await getTableRecord(`SELECT id FROM e_smtp WHERE id = ? LIMIT 1;`, [id], true);
      if (!singleDetail) {
        await rollbackTransaction(transaction);
        return res.status(400).json(createErrorResponse('Record Not Found.', null, 'RECORD_NOT_FOUND'));
      }
      // Update the record
      const affectedRows = await updateRecord('e_smtp', setRecordData, { id }, transaction);
      console.log(`Updated record affectedRows:${affectedRows}`);
    } else {
      // Insert new record
      const recordInsertedId = await insertRecord('e_smtp', setRecordData, transaction);
      console.log(`Saved record Id:${recordInsertedId}`);
      setRecordData.id = recordInsertedId;
    }

    // Commit transaction
    await commitTransaction(transaction);
    res.json(createSuccessResponse('Record saved successfully.', setRecordData.id || id, 'RECORD_SAVED'));

  } catch (error) {
    if (transaction) await rollbackTransaction(transaction);
    next(error);
  }
};

const maunalPaymentMethodSeo = async (req, res, next) => {
  try {

    const settings = await getSettingsData();

    // Prepare metadata for headers
    const logo_img = settings.header_logo_path && fileExists(settings.header_logo_path) ? `${req.appBaseUrl}/uploads/${settings.header_logo_path}` : `${req.appBaseUrl}/uploads/backend/images/settings/header_logo_15477661460.png`;

    const header_data = {
      author: 'localxlist.org',
      title: `Manual Payment Method | Localxlist`,
      description: `Manual Payment Method | Localxlist`,
      keywords: "Manual Payment Method | Localxlist",
      favicon: settings.favicon && fileExists(settings.favicon) ? `${req.appBaseUrl}/uploads/${settings.favicon}` : '',
      image: logo_img,

      ogType: "website",
      ogTitle: `Manual Payment Method | Localxlist`,
      ogSiteName: "localxlist.org",
      ogUrl: "https://localxlist.org/",
      ogDescription: `Manual Payment Method | Localxlist`,
      ogImage: logo_img,
      ogImageHeight: "377",

      twitterCard: "summary_large_image",
      twitterSite: "localxlist",
      twitterCreator: "localxlist",
      twitterTitle: `Manual Payment Method | Localxlist`,
      twitterDescription: `Manual Payment Method | Localxlist`,
      twitterImage: logo_img,
      generator: "localxlist.org",
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

const maunalPaymentMethods = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { page = 1, keyword = '' } = query;

    if (!user?.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    const perPageLimit = LIMIT.ADMIN_PAYMENT_METHODS || 10;
    const offset = (page - 1) * perPageLimit;

    let whereClauses = [];
    let queryParams = [];

    whereClauses.push("(method_type = ?)");
    queryParams.push(2);

    // Keyword search
    if (keyword.trim()) {
      whereClauses.push("(method_name LIKE ? OR  method_details LIKE ?)");
      const searchKeyword = `%${keyword.trim()}%`;
      queryParams.push(searchKeyword, searchKeyword);
    }

    // Construct WHERE clause dynamically
    const whereCondition = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

    // Fetch total count for pagination
    const totalRecordCount = await executeQuery(`SELECT COUNT(id) AS total_count  FROM payment_methods ${whereCondition};`, queryParams);
    const totalRecords = totalRecordCount[0]?.total_count || 0;
    const totalPages = Math.ceil(totalRecords / perPageLimit);

    // Fetch user list
    const q = `
      SELECT 
      * FROM payment_methods
      ${whereCondition}
      ORDER BY id DESC
      LIMIT ? OFFSET ?;
    `;
    queryParams.push(perPageLimit, offset);
    const getList = await getTableRecord(q, queryParams);

    getList.forEach((item, index) => {
      item.srNo = offset + (index + 1);
      item.status = item.deleted_yn === 'Y' ? 'Disabled' : 'Enabled';

    });

    res.json(createSuccessResponse('Data retrieved successfully.', {
      list: getList,
      pagination: { currentPage: page, totalPages, perPageLimit, totalRecords }
    }));

  } catch (error) {
    next(error);
  }
};

const maunalPaymentMethodDetail = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { id } = query;

    // Validate if the user object is available
    if (!user || !user.id || !user.username) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Check if required parameters are provided
    if (!id) {
      return res.status(400).json(createErrorResponse("Missing required parameters."));
    }
    else if (id && isNaN(id)) {
      return res.status(400).json(createErrorResponse("Invalid parameter value."));
    }

    const whereCondition = `WHERE 1=1`;
    const q = `
      SELECT 
        * FROM payment_methods
      ${whereCondition} AND id = ?
      ORDER BY id DESC;
    `;

    const recordDetail = await getTableRecord(q, [id], true);
    if (!recordDetail) {
      return res.status(400).json(createErrorResponse(message = "Record Not Found.", data = null, code = "RECORD_NOT_FOUND"));
    }

    res.json(createSuccessResponse('Data retrieved successfully.', recordDetail));

  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const maunalPaymentMethodSave = async (req, res, next) => {
  let transaction;

  try {
    const { user, body } = req;
    const { id = '', method_name, method_type, method_details, status } = body;

    // Validate user session
    if (!user || !user?.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Start transaction
    transaction = await startTransaction();

    // Prepare record data
    let setRecordData = {
      method_name,
      method_type,
      method_details,
      deleted_yn: (status === true || status === 'true') ? 'N' : 'Y'
    };

    if (id) {
      // Check if the record exists before updating
      const singleDetail = await getTableRecord(`SELECT id FROM payment_methods WHERE id = ? LIMIT 1;`, [id], true);
      if (!singleDetail) {
        await rollbackTransaction(transaction);
        return res.status(400).json(createErrorResponse('Record Not Found.', null, 'RECORD_NOT_FOUND'));
      }
      // Update the record
      const affectedRows = await updateRecord('payment_methods', setRecordData, { id }, transaction);
      console.log(`Updated record affectedRows:${affectedRows}`);
    } else {
      // Insert new record
      const recordInsertedId = await insertRecord('payment_methods', setRecordData, transaction);
      console.log(`Saved record Id:${recordInsertedId}`);
      setRecordData.id = recordInsertedId;
    }

    // Commit transaction
    await commitTransaction(transaction);
    res.json(createSuccessResponse('Record saved successfully.', setRecordData.id || id, 'RECORD_SAVED'));

  } catch (error) {
    if (transaction) await rollbackTransaction(transaction);
    next(error);
  }
};

const maunalPaymentRequestSeo = async (req, res, next) => {
  try {

    const settings = await getSettingsData();

    // Prepare metadata for headers
    const logo_img = settings.header_logo_path && fileExists(settings.header_logo_path) ? `${req.appBaseUrl}/uploads/${settings.header_logo_path}` : `${req.appBaseUrl}/uploads/backend/images/settings/header_logo_15477661460.png`;

    const header_data = {
      author: 'localxlist.org',
      title: `Manual Payment Request | Localxlist`,
      description: `Manual Payment Request | Localxlist`,
      keywords: "Manual Payment Request | Localxlist",
      favicon: settings.favicon && fileExists(settings.favicon) ? `${req.appBaseUrl}/uploads/${settings.favicon}` : '',
      image: logo_img,

      ogType: "website",
      ogTitle: `Manual Payment Request | Localxlist`,
      ogSiteName: "localxlist.org",
      ogUrl: "https://localxlist.org/",
      ogDescription: `Manual Payment Request | Localxlist`,
      ogImage: logo_img,
      ogImageHeight: "377",

      twitterCard: "summary_large_image",
      twitterSite: "localxlist",
      twitterCreator: "localxlist",
      twitterTitle: `Manual Payment Request | Localxlist`,
      twitterDescription: `Manual Payment Request | Localxlist`,
      twitterImage: logo_img,
      generator: "localxlist.org",
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

const maunalPaymentRequests = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { page = 1, keyword = '', status = 'all' } = query;

    if (!user?.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    const perPageLimit = LIMIT.ADMIN_PAYMENT_REQUESTS || 10;
    const offset = (page - 1) * perPageLimit;

    let whereClauses = [];
    let queryParams = [];

    // Keyword search
    if (keyword.trim()) {
      whereClauses.push("(method_name LIKE ? OR  method_details LIKE ? OR  transaction_id LIKE ?)");
      const searchKeyword = `%${keyword.trim()}%`;
      queryParams.push(searchKeyword, searchKeyword, searchKeyword);
    }

    if (status !== 'all') {
      whereClauses.push("(pstatus = ?)");
      queryParams.push(status);
    }

    // Construct WHERE clause dynamically
    const whereCondition = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

    // Fetch total count for pagination
    const totalRecordCount = await executeQuery(`SELECT COUNT(id) AS total_count  FROM manual_payment_request ${whereCondition};`, queryParams);
    const totalRecords = totalRecordCount[0]?.total_count || 0;
    const totalPages = Math.ceil(totalRecords / perPageLimit);

    // Fetch user list
    const q = `
      SELECT 
      * FROM manual_payment_request
      ${whereCondition}
      ORDER BY id DESC
      LIMIT ? OFFSET ?;
    `;
    queryParams.push(perPageLimit, offset);
    const getList = await getTableRecord(q, queryParams);

    getList.forEach((item, index) => {
      item.srNo = offset + (index + 1);

      item.attachFullPath = item?.attached_file && fileExists(`${UPLOADED_PATH.MANUAL_PAYMENT_SCREENSHOT}/${item?.attached_file}`) ? `${req.appBaseUrl}/uploads/${UPLOADED_PATH.MANUAL_PAYMENT_SCREENSHOT}/${item?.attached_file}` : `${req.appBaseUrl}/uploads/${COMMON_CONFIG.admin.DEFAULT_NO_IMG}`;
      item.formattedDate = formattedDate(item.created_date, 'yyyy-MMM-dd');

      item.statusColorBg = item.pstatus === 'Approved' ? 'success' : (item.pstatus === 'Rejected' ? 'danger' : 'warning');
    });

    res.json(createSuccessResponse('Data retrieved successfully.', {
      list: getList,
      pagination: { currentPage: page, totalPages, perPageLimit, totalRecords }
    }));

  } catch (error) {
    next(error);
  }
};

const maunalPaymentRequestDetail = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { id } = query;

    // Validate if the user object is available
    if (!user || !user.id || !user.username) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    const settings = await getSettingsData();
    const currency = settings?.currency || '';

    // Check if required parameters are provided
    if (!id) {
      return res.status(400).json(createErrorResponse("Missing required parameters."));
    }
    else if (id && isNaN(id)) {
      return res.status(400).json(createErrorResponse("Invalid parameter value."));
    }

    const whereCondition = `WHERE 1=1`;
    const q = `
      SELECT 
        * FROM manual_payment_request
      ${whereCondition} AND id = ?
      ORDER BY id DESC;
    `;

    const recordDetail = await getTableRecord(q, [id], true);
    if (!recordDetail) {
      return res.status(400).json(createErrorResponse(message = "Record Not Found.", data = null, code = "RECORD_NOT_FOUND"));
    }

    recordDetail.currency = currency || '';
    recordDetail.attachFullPath = recordDetail?.attached_file && fileExists(`${UPLOADED_PATH?.MANUAL_PAYMENT_SCREENSHOT}/${recordDetail?.attached_file}`) ? `${req.appBaseUrl}/uploads/${UPLOADED_PATH?.MANUAL_PAYMENT_SCREENSHOT}/${recordDetail?.attached_file}` : `${req.appBaseUrl}/uploads/${COMMON_CONFIG.admin.DEFAULT_NO_IMG}`;
    recordDetail.statusColorBg = recordDetail.pstatus === 'Approved' ? 'success' : (recordDetail.pstatus === 'Rejected' ? 'danger' : 'warning');

    recordDetail.formattedCreatedDate = formattedDate(recordDetail?.created_date, 'yyyy-MMM-dd hh:mm:ss a');
    recordDetail.formattedApprovedRejectedDate = formattedDate(recordDetail?.approved_date, 'yyyy-MMM-dd hh:mm:ss a');



    res.json(createSuccessResponse('Data retrieved successfully.', recordDetail));

  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const savePaymentRequestReason = async (req, res, next) => {
  let transaction;

  try {
    const { user, body } = req;
    const { id = '', description = '', pstatus } = body;

    // Validate user session
    if (!user || !user?.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Check if required parameters are provided
    if (!id) {
      return res.status(400).json(createErrorResponse("Missing required parameters."));
    }
    else if (id && isNaN(id)) {
      return res.status(400).json(createErrorResponse("Invalid parameter value."));
    }

    // Start transaction
    transaction = await startTransaction();

    const whereCondition = `WHERE 1=1`;
    const q = `
      SELECT 
        * FROM manual_payment_request
      ${whereCondition} AND id = ?
      ORDER BY id DESC;
    `;
    const recordDetail = await getTableRecord(q, [id], true);
    if (!recordDetail) {
      return res.status(400).json(createErrorResponse(message = "Record Not Found.", data = null, code = "RECORD_NOT_FOUND"));
    }

    if (recordDetail?.pstatus !== "Pending") {
      return res.status(400).json(createErrorResponse(message = "Payment request must be pending first.", data = null));
    }

    let responseMsg = "Record saved.";

    if (pstatus === "Rejected") {
      const setPaymentRequestData = {
        approved_by: user?.id || '',
        approved_date: new Date(),
        pstatus,
        reason: description
      };
      // Update the record
      const affectedRows = await updateRecord('manual_payment_request', setPaymentRequestData, { id }, transaction);
      console.log(`Updated record affectedRows:${affectedRows}`);
      responseMsg = 'Manual Payment Request has been Rejected Successfully.';

      // Add notification
      const status = pstatus?.toLowerCase() || 'rejected';
      const setUserNotificationData = {
        member_id: recordDetail?.member_id || 0,
        title: `Payment Request ${status.charAt(0).toUpperCase() + status.slice(1)}`,
        description: `Your payment request for ${recordDetail?.method_name} (Transaction ID: ${recordDetail?.transaction_id}) of amount ${recordDetail?.payment_amount} has been ${status}.`,
        created_date: new Date(),
      };
      const userNotificationInsertedId = await insertRecord('user_notifications', setUserNotificationData, transaction);
      console.log(`Saved User Notification Id:${userNotificationInsertedId}`);
    }

    if (pstatus === "Approved") {

      // Get Member Balance Detail
      const balanceQuery = `SELECT balance.balance, balance.username FROM balance WHERE balance.username IN (SELECT member.username FROM member INNER JOIN manual_payment_request ON manual_payment_request.member_id = member.id WHERE manual_payment_request.id = ?) `;
      const balanceDetail = await getTableRecord(balanceQuery, [recordDetail?.id], true);

      if (balanceDetail?.balance) {

        // Update Balance With Latest Balance
        const updatedBalance = parseFloat((parseFloat(balanceDetail?.balance) + parseFloat(recordDetail?.payment_amount)).toFixed(2));
        const setbalanceData = {
          balance: updatedBalance
        };
        // Update the record
        const affectedBalanceRows = await updateRecord('balance', setbalanceData, { username: balanceDetail?.username || '' }, transaction);
        console.log(`Updated record affectedBalanceRows:${affectedBalanceRows}`);

        // Add Balance History
        const setBalanceHistoryData = {
          date_time: new Date(),
          username: balanceDetail?.username,
          btc_rate: 0,
          recharge: parseFloat(recordDetail?.payment_amount).toFixed(2),
          transection_hash: recordDetail?.transaction_id,
          method_name: recordDetail?.method_name,
          payment_status: pstatus,
        };
        // Insert new 
        const recordInsertedId = await insertRecord('balance_history', setBalanceHistoryData, transaction);
        console.log(`Saved record Balance History Id:${recordInsertedId}`);

      } else {
        // Add Balance With Latest Balance

        const updatedBalance = parseFloat((0 + parseFloat(recordDetail?.payment_amount)).toFixed(2));
        const setbalanceData = {
          balance: updatedBalance,
          date: new Date(),
          username: balanceDetail?.username,
        };
        // Insert new 
        const recordBalanceInsertedId = await insertRecord('balance', setbalanceData, transaction);
        console.log(`Saved record New Balance Id:${recordBalanceInsertedId}`);

        // Add Balance History
        const setBalanceHistoryData = {
          date_time: new Date(),
          username: balanceDetail?.username,
          btc_rate: 0,
          recharge: parseFloat(recordDetail?.payment_amount).toFixed(2),
          transection_hash: recordDetail?.transaction_id,
          method_name: recordDetail?.method_name,
          payment_status: pstatus,
        };
        // Insert new 
        const recordInsertedId = await insertRecord('balance_history', setBalanceHistoryData, transaction);
        console.log(`Saved record Balance History Id:${recordInsertedId}`);
      }

      // Update Manual Payment Request Status
      const setPaymentRequestData = {
        approved_by: user?.id || '',
        approved_date: new Date(),
        pstatus,
        reason: description
      };
      // Update the record
      const affectedRows = await updateRecord('manual_payment_request', setPaymentRequestData, { id }, transaction);
      console.log(`Updated record affectedRows:${affectedRows}`);
      responseMsg = 'Manual Payment Request has been Approved Successfully.';

      // Add notification
      const status = pstatus?.toLowerCase() || 'approved';
      const setUserNotificationData = {
        member_id: recordDetail?.member_id || 0,
        title: `Payment Request ${status.charAt(0).toUpperCase() + status.slice(1)}`,
        description: `Your payment request for ${recordDetail?.method_name} (Transaction ID: ${recordDetail?.transaction_id}) of amount ${recordDetail?.payment_amount} has been ${status}.`,
        created_date: new Date(),
      };
      const userNotificationInsertedId = await insertRecord('user_notifications', setUserNotificationData, transaction);
      console.log(`Saved User Notification Id:${userNotificationInsertedId}`);
    }

    // Commit transaction
    await commitTransaction(transaction);
    res.json(createSuccessResponse(responseMsg, id, 'RECORD_SAVED'));
  } catch (error) {
    if (transaction) await rollbackTransaction(transaction);
    next(error);
  }
};

const videoUploadSeo = async (req, res, next) => {
  try {

    const settings = await getSettingsData();

    // Prepare metadata for headers
    const logo_img = settings.header_logo_path && fileExists(settings.header_logo_path) ? `${req.appBaseUrl}/uploads/${settings.header_logo_path}` : `${req.appBaseUrl}/uploads/backend/images/settings/header_logo_15477661460.png`;

    const header_data = {
      author: 'localxlist.org',
      title: `Upload Video | Localxlist`,
      description: `Upload Video | Localxlist`,
      keywords: "Upload Video | Localxlist",
      favicon: settings.favicon && fileExists(settings.favicon) ? `${req.appBaseUrl}/uploads/${settings.favicon}` : '',
      image: logo_img,

      ogType: "website",
      ogTitle: `Upload Video | Localxlist`,
      ogSiteName: "localxlist.org",
      ogUrl: "https://localxlist.org/",
      ogDescription: `Upload Video | Localxlist`,
      ogImage: logo_img,
      ogImageHeight: "377",

      twitterCard: "summary_large_image",
      twitterSite: "localxlist",
      twitterCreator: "localxlist",
      twitterTitle: `Upload Video | Localxlist`,
      twitterDescription: `Upload Video | Localxlist`,
      twitterImage: logo_img,
      generator: "localxlist.org",
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

const videoUploads = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { page = 1, keyword = '' } = query;

    if (!user?.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    const perPageLimit = LIMIT.ADMIN_VIDEOS || 10;
    const offset = (page - 1) * perPageLimit;

    let whereClauses = [];
    let queryParams = [];

    // Convert snake_case to Title Case dynamically
    const toTitleCase = (text) => {
      return text
        .replace(/_/g, ' ') // Replace underscores with spaces
        .replace(/\b\w/g, (char) => char.toUpperCase()); // Capitalize first letter of each word
    };

    // Keyword search
    if (keyword.trim()) {
      whereClauses.push(`
        upload_for LIKE ? 
        OR REPLACE(upload_for, '_', ' ') LIKE ?
        OR LOWER(upload_for) LIKE LOWER(?)
        OR title LIKE ?
        OR REPLACE(title, '_', ' ') LIKE ?
        OR LOWER(title) LIKE LOWER(?) `);
      const searchKeyword = `%${keyword}%`;
      queryParams.push(searchKeyword, searchKeyword, searchKeyword);
    }

    // Construct WHERE clause dynamically
    const whereCondition = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

    // Fetch total count for pagination
    const totalRecordCount = await executeQuery(`SELECT COUNT(id) AS total_count FROM videos ${whereCondition};`, queryParams);
    const totalRecords = totalRecordCount[0]?.total_count || 0;
    const totalPages = Math.ceil(totalRecords / perPageLimit);

    // Fetch video list
    const q = `
      SELECT id, title, deleted_yn, video_path, upload_for
      FROM videos
      ${whereCondition}
      ORDER BY id DESC
      LIMIT ? OFFSET ?;
    `;
    queryParams.push(perPageLimit, offset);
    const getList = await getTableRecord(q, queryParams);

    // Transform `upload_for` dynamically
    getList.forEach((item, index) => {
      item.srNo = offset + (index + 1);
      item.videoFullPath = item?.video_path && fileExists(item?.video_path)
        ? `${req.appBaseUrl}/uploads/${item.video_path}`
        : `N/A`;
      item.upload_for_display = toTitleCase(item.upload_for);
      item.status = item.deleted_yn === 'Y' ? 'Disabled' : 'Enabled';
    });

    res.json(createSuccessResponse('Data retrieved successfully.', {
      list: getList,
      pagination: { currentPage: page, totalPages, perPageLimit, totalRecords }
    }));

  } catch (error) {
    next(error);
  }
};

const videoUploadDetail = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { id } = query;

    // Validate if the user object is available
    if (!user || !user.id || !user.username) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Check if required parameters are provided
    if (!id) {
      return res.status(400).json(createErrorResponse("Missing required parameters."));
    }
    else if (id && isNaN(id)) {
      return res.status(400).json(createErrorResponse("Invalid parameter value."));
    }

    const whereCondition = `WHERE 1=1`;
    const q = `
      SELECT 
        * FROM videos
      ${whereCondition} AND id = ?
      ORDER BY id DESC;
    `;

    const recordDetail = await getTableRecord(q, [id], true);
    if (!recordDetail) {
      return res.status(400).json(createErrorResponse(message = "Record Not Found.", data = null, code = "RECORD_NOT_FOUND"));
    }

    res.json(createSuccessResponse('Data retrieved successfully.', recordDetail));

  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const videoUploadSave = async (req, res, next) => {
  let transaction;

  try {
    const { user, body, file } = req;
    const { id = '', title, video, upload_for, status } = body;


    // Validate user session
    if (!user || !user?.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Start transaction
    transaction = await startTransaction();

    // Prepare record data
    let setRecordData = {
      title,
      video_path: video,
      upload_for,
      deleted_yn: (status === true || status === 'true') ? 'N' : 'Y'
    };

    if (id) {
      // Check if the record exists before updating
      const existingRecord = await getTableRecord(`SELECT id FROM videos WHERE id = ? LIMIT 1;`, [id], true);
      if (!existingRecord) {
        await rollbackTransaction(transaction);
        return res.status(400).json(createErrorResponse('Record Not Found.', null, 'RECORD_NOT_FOUND'));
      }

      // Update the record
      const affectedRows = await updateRecord('videos', setRecordData, { id }, transaction);
      console.log(`Updated record affectedRows:${affectedRows}`);
    } else {
      // Insert new subcategory
      const recordInsertedId = await insertRecord('videos', setRecordData, transaction);
      console.log(`Saved record Id:${recordInsertedId}`);
      setRecordData.id = recordInsertedId;
    }

    // Commit transaction
    await commitTransaction(transaction);
    res.json(createSuccessResponse('Record saved successfully.', setRecordData.id || id, 'RECORD_SAVED'));

  } catch (error) {
    if (transaction) await rollbackTransaction(transaction);
    next(error);
  }
};

// Multi Posts
const multiPostsSeo = async (req, res, next) => {
  try {

    const settings = await getSettingsData();

    // Prepare metadata for headers
    const logo_img = settings.header_logo_path && fileExists(settings.header_logo_path) ? `${req.appBaseUrl}/uploads/${settings.header_logo_path}` : `${req.appBaseUrl}/uploads/backend/images/settings/header_logo_15477661460.png`;

    const header_data = {
      author: 'localxlist.org',
      title: `Multi Posts | Localxlist`,
      description: `Multi Posts | Localxlist`,
      keywords: "Multi Posts | Localxlist",
      favicon: settings.favicon && fileExists(settings.favicon) ? `${req.appBaseUrl}/uploads/${settings.favicon}` : '',
      image: logo_img,

      ogType: "website",
      ogTitle: `Multi Posts | Localxlist`,
      ogSiteName: "localxlist.org",
      ogUrl: "https://localxlist.org/",
      ogDescription: `Multi Posts | Localxlist`,
      ogImage: logo_img,
      ogImageHeight: "377",

      twitterCard: "summary_large_image",
      twitterSite: "localxlist",
      twitterCreator: "localxlist",
      twitterTitle: `Multi Posts | Localxlist`,
      twitterDescription: `Multi Posts | Localxlist`,
      twitterImage: logo_img,
      generator: "localxlist.org",
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

const multiPosts = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { page = 1, type = 'adminPosts', keyword = '', countryId = '', cityId = '', subCityId = '', categoryId = '', subCategoryId = '' } = query;


    if (!user?.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    const perPageLimit = LIMIT.ADMIN_POSTS || 10;
    const offset = (page - 1) * perPageLimit;

    let whereClauses = [];
    let queryParams = [];

    // Post filter
    if (type === 'activated') {
      whereClauses.push("post.status = ?");
      queryParams.push(1);
    } else if (type === 'deactivated') {
      whereClauses.push("post.status = ?");
      queryParams.push(0);
    } else if (type === 'trashed') {
      whereClauses.push("post.status = ?");
      queryParams.push(2);
    } else if (type === 'adminPosts') {
      whereClauses.push("post.member_id = ?");
      queryParams.push(0);
    } else if (type === 'todayPosts') {
      whereClauses.push("post.member_id != ? AND post.status = ? AND DATE(post.date) = CURDATE()");
      queryParams.push(0, 1);
    }

    // Others filter
    if (countryId) {
      whereClauses.push("post.country_id = ?");
      queryParams.push(countryId);
    }
    if (cityId) {
      whereClauses.push("post.city_id = ?");
      queryParams.push(cityId);
    }
    if (subCityId) {
      whereClauses.push("post.subcity_id = ?");
      queryParams.push(subCityId);
    }
    if (categoryId) {
      whereClauses.push("post.category_id = ?");
      queryParams.push(categoryId);
    }
    if (subCategoryId) {
      whereClauses.push("post.subcategory_id = ?");
      queryParams.push(subCategoryId);
    }

    // Keyword search
    if (keyword.trim()) {
      whereClauses.push("(post.title LIKE ? OR post.description LIKE ?)");
      const searchKeyword = `%${keyword}%`;
      queryParams.push(searchKeyword, searchKeyword);
    }

    // Construct WHERE clause dynamically
    const whereCondition = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

    // Fetch total count for pagination
    const totalRecordCount = await executeQuery(`SELECT COUNT(id) AS total_count FROM post ${whereCondition};`, queryParams);
    const totalRecords = totalRecordCount[0]?.total_count || 0;
    const totalPages = Math.ceil(totalRecords / perPageLimit);

    // Fetch user list
    const q = `
      SELECT 
      post.id, 
      post.title, 
      post.date, 
      post.status, 
      post.visitors_count,
      country.country, 
      city.city, 
      subcity.subcity, 
      category.category,
      subcategory.subcategory,
      IF(post.featured_end_date > '0000-00-00 00:00:00', 1, 0) AS featured_post
        FROM post
        LEFT JOIN country ON post.country_id = country.id
        LEFT JOIN city ON post.city_id = city.id
        LEFT JOIN subcity ON post.subcity_id = subcity.id
        LEFT JOIN category ON post.category_id = category.id
        LEFT JOIN subcategory ON post.subcategory_id = subcategory.id 
      ${whereCondition}
      ORDER BY id DESC
      LIMIT ? OFFSET ?;
    `;
    queryParams.push(perPageLimit, offset);
    const getList = await getTableRecord(q, queryParams);

    getList.forEach((item, index) => {
      item.srNo = offset + (index + 1);
      item.status_text = item.status == 1 ? 'Active' : 'Pending';
      item.status_text_color = item.status == 1 ? 'green' : 'red';
      item.formattedDate = formattedDate(item.date, 'yyyy-MMM-dd');
    });

    res.json(createSuccessResponse('Data retrieved successfully.', {
      list: getList,
      pagination: { currentPage: page, totalPages, perPageLimit, totalRecords }
    }));

  } catch (error) {
    next(error);
  }
};

const multiPostDetail = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { id } = query;

    // Validate if the user object is available
    if (!user || !user.id || !user.username) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Check if required parameters are provided
    if (!id) {
      return res.status(400).json(createErrorResponse("Missing required parameters."));
    }
    else if (id && isNaN(id)) {
      return res.status(400).json(createErrorResponse("Invalid parameter value."));
    }

    const whereCondition = `WHERE 1=1`;
    const q = `
      SELECT 
        id, 
        title, 
        description, 
        email, 
        phone, 
        location, 
        sexual_oriantation, 
        sex, 
        age, 
        img_id,
        country_id,
        city_id,
        subcity_id,
        category_id,
        subcategory_id,
        extended_ad_id,
        featured_ad_id
        
      FROM post
      ${whereCondition} AND id = ?
      ORDER BY id DESC;
    `;

    const postDetail = await getTableRecord(q, [id, id, id, id, id], true);
    if (!postDetail) {
      return res.status(400).json(createErrorResponse(message = "Post Not Found.", data = null, code = "POST_NOT_FOUND"));
    }

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

    res.json(createSuccessResponse('Data retrieved successfully.', postDetail));

  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const multiPostSave = async (req, res, next) => {
  let transaction;
  let uploadedFilesPath = [];

  const deleteUploadedFilesWhenError = () => {
    const uploadedFiles = req?.files && req.files.length > 0 && req.files.map((file) => file.path) || [];

    // Delete uploaded files
    if (uploadedFiles && uploadedFiles.length > 0) {
      uploadedFiles.forEach((filePath) => {
        console.log("Deleting:", filePath);

        fs.unlink(filePath, (err) => {
          if (err) {
            console.error(`Failed to delete file: ${filePath}`, err);
          } else {
            console.log(`File deleted: ${filePath}`);
          }
        });
      });
    }
  };

  try {
    const { user } = req;
    const { id = '',
      countryId = '',
      cityId = '',
      subCityId = '',
      categoryId = '',
      subCategoryId = '',
      title = '',
      description = '',
      email = '',
      phone = '',
      sex = '',
      age = '',
      sexualOrientation = '',
      featuredAdId = '',
      extendedAdId = '',
      postVisibleDays = '' } = req.body;

    // if (!req.files || req.files.length === 0) {
    //   return res.status(400).json(createValidationErrorResponse("No files uploaded.", []));
    // }

    // Validate if the user object is available
    if (!user || !user.id || !user.username) {
      deleteUploadedFilesWhenError();
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    const countryIds = countryId.split(",") || [];
    const cityIds = cityId.split(",") || [];
    const subCityIds = subCityId.split(",") || [];

    const categoryIds = categoryId.split(",") || [];
    const subCategoryIds = subCategoryId.split(",") || [];

    // Check Country, City, SubCity, Category, SubCategory
    const countryData = await getTableRecord('SELECT id FROM country WHERE id IN (?);', [countryIds]);
    const cityData = await getTableRecord('SELECT id FROM city WHERE id IN (?) AND country IN (?);', [cityIds, countryIds]);
    const subCityData = await getTableRecord('SELECT id, country AS countryId, city AS cityId, subcity FROM subcity WHERE id IN (?) AND city IN (?);', [subCityIds, cityIds]);

    const categoryData = await getTableRecord('SELECT id FROM category WHERE id IN (?);', [categoryIds]);
    const subCategoryData = await getTableRecord('SELECT id, category AS categoryId FROM subcategory WHERE id IN (?) AND category IN (?);', [subCategoryIds, categoryIds]);

    if (countryData.length !== countryIds.length) {
      deleteUploadedFilesWhenError();
      return res.status(400).json(createErrorResponse('Invalid country.'));
    }
    if (cityData.length !== cityIds.length) {
      deleteUploadedFilesWhenError();
      return res.status(400).json(createErrorResponse('Invalid city.'));
    }
    if (subCityData.length !== subCityIds.length) {
      deleteUploadedFilesWhenError();
      return res.status(400).json(createErrorResponse('Invalid sub city.'));
    }
    if (categoryData.length !== categoryIds.length) {
      deleteUploadedFilesWhenError();
      return res.status(400).json(createErrorResponse('Invalid category.'));
    }
    if (subCategoryData.length !== subCategoryIds.length) {
      deleteUploadedFilesWhenError();
      return res.status(400).json(createErrorResponse('Invalid sub category.'));
    }

    const settings = await getSettingsData();
    const default_ad_displayed_for = settings?.by_default_ad_showing_for || 0;

    // Check if required parameters are provided
    const requiredParams = [
      "title",
      "countryId",
      "cityId",
      "subCityId",
      "categoryId",
      "subCategoryId",
      "description",
      "email",
      "sex",
      "age",
      "sexualOrientation"
    ];
    const missingParams = requiredParams.filter(param => !req.body[param]);
    if (missingParams.length > 0) {
      deleteUploadedFilesWhenError();
      return res.status(400).json(createErrorResponse(`Missing required parameters: ${missingParams.join(', ')}`));
    }

    // Start a transaction
    transaction = await startTransaction();
    const charged_for_per_post = settings?.charged_for_per_post || '';
    const sanitizeTitle = title.replace(/\\/g, '').replace(/\//g, ''); // Sanitize title input;

    // ::::::::: Create post extended delete date ::::::::: 
    const defaultAdDisplayedFor = parseInt(postVisibleDays || default_ad_displayed_for);
    let postDeleteDate = addDays(new Date(), defaultAdDisplayedFor); // Add default days
    postDeleteDate = format(postDeleteDate, "yyyy-MM-dd HH:mm:ss"); // Format the date    

    // Read extend_ad value from extend ad table
    const extendAdId = extendedAdId;
    const extendAd = await getTableRecord('SELECT amount, days FROM extended_ad WHERE id = ?;', [extendAdId], true);
    if (extendAd) {
      const extendDays = extendAd.days || 0; // Get the additional days
      postDeleteDate = addDays(new Date(postDeleteDate), parseInt(extendDays)); // Add extend days
      postDeleteDate = format(postDeleteDate, "yyyy-MM-dd HH:mm:ss"); // Format the updated date      
    }
    // ::::::::: Create post extended delete date ::::::::: 


    // ::::::::: Create post featured_end_date ::::::::: 
    const featuredAd = await getTableRecord('SELECT amount, days FROM featured_ad WHERE id = ?;', [featuredAdId], true);
    let featuredEndDate = "0000-00-00 00:00:00"; // Default value
    if (featuredAd) {
      const featuredDays = featuredAd.days || 0; // Get the featured days
      featuredEndDate = addDays(new Date(), parseInt(featuredDays)); // Add featured days
      featuredEndDate = format(featuredEndDate, "yyyy-MM-dd HH:mm:ss"); // Format the end date
    }
    // ::::::::: Create post featured_end_date ::::::::: 

    // ::::::::: Check Existence of the Same Post ::::::::: 
    // const postCheckCondition = {
    //   member_id: user?.id || '',
    //   title: sanitizeTitle,
    //   country_id: countryId,
    //   city_id: cityId,
    //   subcity_id: subCityId,
    //   category_id: categoryId,
    //   subcategory_id: subCategoryId
    // };
    // // Construct the SQL query
    // const queryParts = [];
    // const queryValues = [];
    // // Build the WHERE clause dynamically based on which properties are defined
    // for (const [key, value] of Object.entries(postCheckCondition)) {
    //   if (value) {
    //     queryParts.push(`${key} = ?`);
    //     queryValues.push(value);
    //   }
    // }
    // // Create the final SQL query
    // const postFetch = await getTableRecord(`SELECT id FROM post WHERE ${queryParts.join(' AND ')}`, queryValues, true);
    // if (postFetch) {
    //   deleteUploadedFilesWhenError();
    //   return res.status(400).json(createErrorResponse("This Type Of Post Already Exist.Try With Another Post."));
    // }
    // ::::::::: Check Existence of the Same Post ::::::::: 

    // ::::::::: Check User Balance To Do Post ::::::::: 
    // const featured_ad_charge = featuredAd?.amount || 0;
    // const extend_ad_charge = extendAd?.amount || 0;

    // const total_charge = parseFloat(charged_for_per_post || 0) + parseFloat(extend_ad_charge || 0) + parseFloat(featured_ad_charge || 0);
    // const fee = parseFloat(extend_ad_charge || 0) + parseFloat(featured_ad_charge || 0);
    // // Get User Balance and check can post or not
    // const balanceDetail = await getTableRecord('SELECT id, balance FROM balance WHERE username = ?;', [user.username], true);
    // const balance = balanceDetail?.balance || 0;
    // if (charged_for_per_post && balance < total_charge) {
    //   deleteUploadedFilesWhenError();
    //   return res.status(400).json(createErrorResponse("Sorry Your Balance Is Not Sufficient For This Post.", {
    //     balance, total_charge, charged_for_per_post
    //   }));
    // } else if (balance < fee && fee !== 0) {
    //   deleteUploadedFilesWhenError();
    //   return res.status(400).json(createErrorResponse("Sorry Your Balance Is Not Sufficient For This Post with features.", {
    //     balance, fee, charged_for_per_post
    //   }));
    // }
    // ::::::::: Check User Balance To Do Post ::::::::: 


    // ::::::::: Check Last added post duration to saving this post ::::::::: 
    // const lastPostDetail = await getTableRecord('SELECT id, date FROM post WHERE member_id = ? ORDER BY date DESC LIMIT 1;', [user.id], true);
    // if (lastPostDetail) {
    //   const postDuration = settings?.post_duration || 0;
    //   const postDate = new Date(lastPostDetail.date).getTime(); // Convert post date to milliseconds
    //   const expirationTime = postDate + postDuration * 1000; // Add the duration (in milliseconds)
    //   const currentTime = Date.now(); // Get current time in milliseconds

    //   console.log({
    //     expirationTime,
    //     currentTime,
    //     cond: currentTime < expirationTime
    //   });

    //   // Check if the current time is less than the expiration time
    //   if (currentTime < expirationTime) {
    //     deleteUploadedFilesWhenError();
    //     // If within duration
    //     return res.status(400).json(createErrorResponse(`Warning! Please wait ${postDuration} seconds before creating a new post.`));
    //   }
    // }
    // ::::::::: Check Last added post duration to saving this post ::::::::: 


    // :::::::::::: Handle file upload :::::::::::: 
    let imgId = '';
    // Check if there are files

    if (req.files && req.files.length > 0) {
      imgId = await getUploadImageId(transaction);
      const insertPromises = req.files.map(async (file) => {
        let newImagePath = `${UPLOADED_PATH.ADMIN_POST_IMAGE}/${file.filename}`;
        // Add to the array of uploaded paths
        uploadedFilesPath.push(newImagePath);
        return await insertRecord('post_img_table', {
          date: new Date(),
          path: newImagePath || '',
          img_id: imgId,
          status: 1
        }, transaction);
      });
      const imgInsertedIds = await Promise.all(insertPromises);
      // Optional: Log after all inserts are complete
      imgInsertedIds.forEach(id => console.log(`Saved Post Img Id: ${id}`));
    }
    // :::::::::::: Handle file upload ::::::::::::


    // ::::::::::: Save Post Data :::::::::::::

    let postInsertedIds = [];

    for (let i = 0; i < subCityData.length; i++) {
      const subCity = subCityData[i];

      for (let j = 0; j < subCategoryData.length; j++) {
        const subCategory = subCategoryData[j];

        // ::::::::::: Save Post Data :::::::::::::

        const postData = {
          date: new Date(),
          member_id: 0,
          title: sanitizeTitle,
          country_id: subCity.countryId,
          city_id: subCity.cityId,
          subcity_id: subCity.id,
          category_id: subCategory.categoryId,
          img_id: imgId,
          subcategory_id: subCategory.id,
          location: subCity.subcity || "",
          post_code: '',
          description: description,
          email: email,
          phone: phone,
          sex: sex,
          age: age,
          sexual_oriantation: sexualOrientation,
          extended_ad_id: extendAdId,
          post_delete_date: postDeleteDate,
          featured_ad_id: featuredAdId,
          featured_end_date: featuredEndDate,
          status: 1,
        };

        const postInsertedId = await insertRecord('post', postData, transaction);
        postInsertedIds.push(postInsertedId);
        console.log(`Saved Post Id:${postInsertedId}`);
      }
    }

    // Update User Balance
    // const updatedBalance = parseFloat((parseFloat(balance) - parseFloat(total_charge)).toFixed(2));
    // const affectedRows = await updateRecord('balance', { "balance": updatedBalance }, { username: user.username }, transaction);
    // console.log(`Updated Balance affectedRows:${affectedRows}`);

    // Add Transation Post
    // const transactionPost = {
    //   member_id: 0,
    //   amount: total_charge,
    //   actual_post_rate: charged_for_per_post,
    //   post_id: postInsertedId,
    //   balance_aft_post: updatedBalance,
    // };
    // const transactionPostInsertedId = await insertRecord('transaction_posts', transactionPost, transaction);
    // console.log(`Saved transaction Post Id:${transactionPostInsertedId}`);


    // Commit the transaction
    await commitTransaction(transaction);
    console.log(`All done!!`);
    res.json(createSuccessResponse('Post added successfully.', postInsertedIds, "POST_SAVED"));

  } catch (error) {
    // Rollback the transaction in case of an error
    if (transaction) await rollbackTransaction(transaction);
    // Delete Uploaded Images Also If Any Error
    for (const filePath of uploadedFilesPath) {
      try {
        const imagePath = path.join(global.uploadsBaseDir, filePath);
        // Delete the file if it exists
        if (imagePath && fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath); // Delete the file
          console.log(`Deleted uploaded file: ${filePath}`);
        }
      } catch (deleteError) {
        console.error(`Failed to delete file: ${filePath}`, deleteError);
      }
    }
    next(error); // Pass the error to the error handler middleware
  }
};

// Modules

const moduleSeo = async (req, res, next) => {
  try {

    const settings = await getSettingsData();

    // Prepare metadata for headers
    const logo_img = settings.header_logo_path && fileExists(settings.header_logo_path) ? `${req.appBaseUrl}/uploads/${settings.header_logo_path}` : `${req.appBaseUrl}/uploads/backend/images/settings/header_logo_15477661460.png`;

    const header_data = {
      author: 'localxlist.org',
      title: `Modules | Localxlist`,
      description: `Modules | Localxlist`,
      keywords: "Modules | Localxlist",
      favicon: settings.favicon && fileExists(settings.favicon) ? `${req.appBaseUrl}/uploads/${settings.favicon}` : '',
      image: logo_img,

      ogType: "website",
      ogTitle: `Modules | Localxlist`,
      ogSiteName: "localxlist.org",
      ogUrl: "https://localxlist.org/",
      ogDescription: `Modules | Localxlist`,
      ogImage: logo_img,
      ogImageHeight: "377",

      twitterCard: "summary_large_image",
      twitterSite: "localxlist",
      twitterCreator: "localxlist",
      twitterTitle: `Modules | Localxlist`,
      twitterDescription: `Modules | Localxlist`,
      twitterImage: logo_img,
      generator: "localxlist.org",
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

const modulePermissions = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { page = 1, keyword = '' } = query;

    if (!user?.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    const perPageLimit = LIMIT.ADMIN_MODULES || 10;
    const offset = (page - 1) * perPageLimit;

    let whereClauses = [];
    let queryParams = [];

    // Keyword search
    if (keyword.trim()) {
      whereClauses.push(`
        role_user_permissions.role LIKE ? 
        OR LOWER(role_user_permissions.role) LIKE LOWER(?)
        OR modules.name LIKE ?
        OR LOWER(modules.name) LIKE LOWER(?) 
        OR createdUser.name LIKE ?
        OR updatedUser.name LIKE ? 
        OR role_user_permissions.allowed_actions LIKE ?
        `);
      const searchKeyword = `%${keyword.trim()}%`;
      queryParams.push(searchKeyword, searchKeyword, searchKeyword, searchKeyword, searchKeyword, searchKeyword, searchKeyword);
    }

    // Construct WHERE clause dynamically
    const whereCondition = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

    // Fetch total count for pagination
    const totalRecordCount = await executeQuery(`SELECT 
      COUNT(role_user_permissions.id) AS total_count 
      FROM role_user_permissions 
      INNER JOIN modules ON modules.id  = role_user_permissions.module_id
      LEFT JOIN user AS createdUser ON createdUser.id  = role_user_permissions.created_by
      LEFT JOIN user AS updatedUser ON updatedUser.id  = role_user_permissions.updated_by 
      ${whereCondition};`, queryParams);
    const totalRecords = totalRecordCount[0]?.total_count || 0;
    const totalPages = Math.ceil(totalRecords / perPageLimit);

    // Fetch video list
    const q = `
      SELECT 
        role_user_permissions.id,      
        role_user_permissions.role,
        modules.name AS module,
        user.id AS userId,
        user.name AS userMainName,
        role_user_permissions.allowed_actions,
        createdUser.name AS createdBy,
        updatedUser.name AS updatedBy,
        role_user_permissions.created_at,
        role_user_permissions.updated_at
      FROM role_user_permissions 
      INNER JOIN modules ON modules.id  = role_user_permissions.module_id
      INNER JOIN user ON user.id  = role_user_permissions.user_id
      LEFT JOIN user AS createdUser ON createdUser.id  = role_user_permissions.created_by
      LEFT JOIN user AS updatedUser ON updatedUser.id  = role_user_permissions.updated_by

      ${whereCondition}
      ORDER BY role_user_permissions.id DESC
      LIMIT ? OFFSET ?;
    `;
    queryParams.push(perPageLimit, offset);
    const getList = await getTableRecord(q, queryParams);

    // Transform `upload_for` dynamically
    getList.forEach((item, index) => {
      item.srNo = offset + (index + 1);
      item.created_at = formattedDate(item.created_at, 'yyyy-MMM-dd hh:mm:ss a');
      item.updated_at = formattedDate(item.updated_at, 'yyyy-MMM-dd hh:mm:ss a');
      item.createdBy = item.createdBy || "N/A";
      item.updatedBy = item.updatedBy || "N/A";
      item.userMainName = `${item.userMainName} (${item.role})`;
    });

    res.json(createSuccessResponse('Data retrieved successfully.', {
      list: getList,
      pagination: { currentPage: page, totalPages, perPageLimit, totalRecords }
    }));

  } catch (error) {
    next(error);
  }
};

const allModules = async (req, res, next) => {
  try {
    const { user } = req;
    if (!user?.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    const q = `SELECT * FROM modules;`;
    const modules = await getTableRecord(q, []);

    // Prepare actions list by extracting and flattening actions from all modules
    const actionsList = [];

    modules.forEach(module => {
      const module_id = module.id || "";
      const module_name = module.name || "";

      let actionsArray = [];

      try {
        if (typeof module.actions === "string") {
          actionsArray = JSON.parse(module.actions);
        } else if (Array.isArray(module.actions)) {
          actionsArray = module.actions;
        }
      } catch (e) {
        actionsArray = [];
      }

      // Add each action with module info to the actionsList
      actionsArray.forEach(actionName => {
        actionsList.push({
          module_id,
          module_name,
          name: actionName,
        });
      });
    });

    // Respond with two arrays: modules and actions
    res.json(createSuccessResponse('Data retrieved successfully.', {
      modules,
      actions: actionsList
    }));
  } catch (error) {
    next(error);
  }
};


const modulePermissionsDetailOld = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { id } = query;

    // Validate if the user object is available
    if (!user || !user.id || !user.username) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Check if required parameters are provided
    if (!id) {
      return res.status(400).json(createErrorResponse("Missing required parameters."));
    }
    else if (id && isNaN(id)) {
      return res.status(400).json(createErrorResponse("Invalid parameter value."));
    }

    const whereCondition = `WHERE 1=1`;
    const q = `
      SELECT 
        * FROM role_user_permissions
      ${whereCondition} AND id = ?
      ORDER BY id DESC;
    `;

    const recordDetail = await getTableRecord(q, [id], true);
    if (!recordDetail) {
      return res.status(400).json(createErrorResponse("Record Not Found.", null, "RECORD_NOT_FOUND"));
    }

    res.json(createSuccessResponse('Data retrieved successfully.', recordDetail));

  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const saveModulePermissionOld = async (req, res, next) => {
  let transaction;

  try {
    const { user, body } = req;
    const { id = '', action_id, actions, role, user_id } = body;

    // 🔒 Validate user session
    if (!user?.id) {
      return res.status(401).json(createErrorResponse('Unauthorized: User session invalid.'));
    }

    transaction = await startTransaction();

    // 🔍 Check for duplicate record (excluding current one if editing)
    const duplicateQuery = `
      SELECT id 
      FROM role_user_permissions 
      WHERE module_id = ? AND role = ? ${id ? 'AND id != ?' : ''} 
      LIMIT 1;
    `;
    const duplicateParams = id ? [module_id, role, id] : [module_id, role];
    const duplicateRecord = await getTableRecord(duplicateQuery, duplicateParams, true);

    if (duplicateRecord) {
      await rollbackTransaction(transaction);
      return res.status(409).json(createErrorResponse('A permission record already exists for this role and module.', null, 'DUPLICATE_ENTRY'));
    }

    // 🧱 Prepare data
    const recordData = {
      role,
      module_id,
      allowed_actions: JSON.stringify(actions),
      ...(id ? { updated_by: user.id } : { created_by: user.id }),
    };

    let recordId = id;

    if (id) {
      // ✏️ Update existing record
      const existingRecord = await getTableRecord(`SELECT id FROM role_user_permissions WHERE id = ? LIMIT 1;`, [id], true);

      if (!existingRecord) {
        await rollbackTransaction(transaction);
        return res.status(404).json(createErrorResponse('The permission record you are trying to update does not exist.', null, 'RECORD_NOT_FOUND'));
      }

      await updateRecord('role_user_permissions', recordData, { id }, transaction);
    } else {
      // ➕ Insert new record
      recordId = await insertRecord('role_user_permissions', recordData, transaction);
    }

    // ✅ Commit transaction
    await commitTransaction(transaction);

    res.status(200).json(
      createSuccessResponse(
        `Permission record ${id ? 'updated' : 'created'} successfully.`,
        recordId,
        'RECORD_SAVED'
      )
    );

  } catch (error) {
    if (transaction) await rollbackTransaction(transaction);
    next(error); // will be handled by express error middleware
  }
};

const modulePermissionsDetail = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { user_id } = query;

    // Validate if the user object is available
    if (!user || !user.id || !user.username) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Check if required parameters are provided
    if (!user_id) {
      return res.status(400).json(createErrorResponse("Missing required parameter: user_id"));
    }
    else if (user_id && isNaN(user_id)) {
      return res.status(400).json(createErrorResponse("Invalid user_id value. Must be a number."));
    }


    // Then get all permissions for this user
    const permissionsQuery = `
      SELECT 
        rup.id,
        rup.role,
        rup.module_id,
        rup.allowed_actions,
        m.name AS module_name
      FROM role_user_permissions rup
      INNER JOIN modules m ON rup.module_id = m.id
      WHERE rup.user_id = ?
      ORDER BY rup.module_id ASC;
    `;

    const permissions = await getTableRecord(permissionsQuery, [user_id]);

    if (!permissions || permissions.length === 0) {
      return res.status(404).json(createSuccessResponse("No permissions found for this user.", []));
    }

    let userIds = [];
    let actionIds = [];
    if (permissions && permissions.length > 0) {
      permissions.forEach(perm => {
        const actions = typeof perm.allowed_actions === 'string'
          ? JSON.parse(perm.allowed_actions)
          : perm.allowed_actions;

        if (actions && actions.length) {
          actions.forEach(action => {
            actionIds.push(`${perm.module_id}-${action}`);
          });
        }
      });
    }

    userIds.push(+ user_id);

    // Create the response object matching form structure
    const singlePermission = permissions.length ? permissions[0] : {};
    const responseData = {
      id: user_id,
      role: singlePermission?.role || "",
      action_id: actionIds.join(','),
      selectedModuleActions: actionIds,
      selectedUsers: userIds,
      user_id: userIds.join(',')
    };

    res.json(createSuccessResponse('User permissions retrieved successfully.', responseData));

  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};
const saveModulePermission = async (req, res, next) => {
  let transaction;

  try {
    const { user, body } = req;
    const { id = '', action_id, role, user_id } = body;

    // 🔒 Validate user session
    if (!user?.id) {
      return res.status(401).json(createErrorResponse('Unauthorized: User session invalid.'));
    }

    // Validate required fields
    if (!role || !user_id || !action_id) {
      return res.status(400).json(createErrorResponse('Role, user_id, and action_id are required fields.'));
    }

    transaction = await startTransaction();

    // Parse the action_id into structured format
    const actionsMap = {};
    action_id.split(',').forEach(item => {
      // Split on FIRST hyphen only to preserve action suffixes
      const [moduleId, actionName] = item.trim().match(/^([^-]+)-(.*)/).slice(1);
      console.log({
        aplit: item.trim().match(/^([^-]+)-(.*)/).slice(1),
        item,
        moduleId, actionName
      });

      if (!actionsMap[moduleId]) {
        actionsMap[moduleId] = new Set(); // Using Set to avoid duplicates
      }
      actionsMap[moduleId].add(actionName);
    });

    // Get array of user IDs
    const userIds = user_id.split(',');

    // Process each user
    for (const userId of userIds) {
      // Get existing permissions for this user-role combination
      const existingPermissions = await getTableRecord(
        `SELECT id, module_id, allowed_actions 
         FROM role_user_permissions 
         WHERE role = ? AND user_id = ?`,
        [role, userId]
      );

      // Convert existing permissions to a map for easy lookup
      const existingPermissionsMap = {};
      existingPermissions.forEach(perm => {
        existingPermissionsMap[perm.module_id] = {
          id: perm.id,
          actions: new Set(JSON.parse(perm.allowed_actions))
        };
      });

      // Process each module in the payload
      for (const moduleId in actionsMap) {
        const requestedActions = actionsMap[moduleId];
        const existingPermission = existingPermissionsMap[moduleId];

        if (existingPermission) {
          // Permission exists - we need to update it
          const currentActions = existingPermission.actions;

          // Check if actions need to be updated
          const needsUpdate =
            requestedActions.size !== currentActions.size ||
            [...requestedActions].some(action => !currentActions.has(action));

          if (needsUpdate) {
            // Update the permission with new actions
            await updateRecord(
              'role_user_permissions',
              {
                allowed_actions: JSON.stringify([...requestedActions]),
                updated_by: user.id
              },
              { id: existingPermission.id },
              transaction
            );
          }
          // If no update needed, do nothing
        } else {
          // Permission doesn't exist - create new
          await insertRecord(
            'role_user_permissions',
            {
              role,
              module_id: moduleId,
              user_id: userId,
              allowed_actions: JSON.stringify([...requestedActions]),
              created_by: user.id
            },
            transaction
          );
        }
      }

      // Remove permissions for modules not in the payload but exist in DB
      for (const existingModuleId in existingPermissionsMap) {
        if (!actionsMap[existingModuleId]) {
          await deleteRecord(
            'role_user_permissions',
            { id: existingPermissionsMap[existingModuleId].id },
            transaction
          );
        }
      }
    }

    // ✅ Commit transaction
    await commitTransaction(transaction);

    res.status(200).json(
      createSuccessResponse(
        `Permission records ${id ? 'updated' : 'created'} successfully.`,
        null,
        'RECORDS_SAVED'
      )
    );

  } catch (error) {
    if (transaction) await rollbackTransaction(transaction);
    next(error); // will be handled by express error middleware
  }
};



const performAction = async (req, res, next) => {
  try {
    const { user, body } = req;
    const { actionType, payload } = body;

    if (!user?.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    if (!actionType || !payload) {
      return res.status(400).json(createErrorResponse('Invalid request data.'));
    }

    let response_message, response_data, response_code;

    switch (actionType) {
      case 'deleteNotices': {
        const parsedIds = JSON.parse(payload);
        if (!Array.isArray(parsedIds) || parsedIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid or missing notice IDs.'));
        }

        // Ensure all IDs are valid integers
        const validIds = parsedIds.filter(id => Number.isInteger(id));
        if (validIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid notice IDs.'));
        }
        // Prepare a parameterized query to prevent SQL injection
        const placeholders = validIds.map(() => '?').join(',');
        const query = `DELETE FROM notices WHERE id IN (${placeholders})`;
        response_data = await executeQuery(query, validIds);
        // response_data = true;
        response_message = 'Notices deleted successfully.';
        response_code = 'NOTICES_DELETED';
        break;
      }

      case 'deleteNotifications': {
        const parsedIds = JSON.parse(payload);
        if (!Array.isArray(parsedIds) || parsedIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid or missing notification IDs.'));
        }

        // Ensure all IDs are valid integers
        const validIds = parsedIds.filter(id => Number.isInteger(id));
        if (validIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid notification IDs.'));
        }
        // Prepare a parameterized query to prevent SQL injection
        const placeholders = validIds.map(() => '?').join(',');
        const query = `DELETE FROM notifications WHERE id IN (${placeholders})`;

        response_data = await executeQuery(query, validIds);
        // response_data = true;
        response_message = 'Notifications deleted successfully.';
        response_code = 'NOTIFICATIONS_DELETED';
        break;
      }

      case 'markReadNotices': {
        const parsedIds = JSON.parse(payload);
        if (!Array.isArray(parsedIds) || parsedIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid or missing notice IDs.'));
        }

        // Ensure all IDs are valid integers
        const validIds = parsedIds.filter(id => Number.isInteger(id));
        if (validIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid notice IDs.'));
        }
        // Prepare a parameterized query to prevent SQL injection
        const placeholders = validIds.map(() => '?').join(',');
        const query = `UPDATE notices SET read_yn = ? WHERE id IN (${placeholders})`;
        response_data = await executeQuery(query, ['Y', ...validIds]);
        response_message = 'Notices marked as read successfully.';
        response_code = 'NOTICES_MARKED_READ';
        break;
      }

      case 'deleteLinksRequested': {
        const parsedIds = JSON.parse(payload);
        if (!Array.isArray(parsedIds) || parsedIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid or missing IDs.'));
        }

        // Ensure all IDs are valid integers
        const validIds = parsedIds.filter(id => Number.isInteger(id));
        if (validIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid IDs.'));
        }
        // Prepare a parameterized query to prevent SQL injection
        const placeholders = validIds.map(() => '?').join(',');
        const query = `DELETE FROM site_request WHERE id IN (${placeholders})`;

        response_data = await executeQuery(query, validIds);
        // response_data = true;
        response_message = 'Requested sites deleted successfully.';
        response_code = 'LINKS_REQUESTED_DELETED';
        break;
      }

      case 'deleteLinksAdded': {
        const parsedIds = JSON.parse(payload);
        if (!Array.isArray(parsedIds) || parsedIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid or missing IDs.'));
        }

        // Ensure all IDs are valid integers
        const validIds = parsedIds.filter(id => Number.isInteger(id));
        if (validIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid IDs.'));
        }

        // Select Data Of that Id with images
        const placeholders = validIds.map(() => '?').join(',');
        const selectQuery = `SELECT id, logo, image FROM site_link WHERE id IN (${placeholders})`;
        const siteLinks = await executeQuery(selectQuery, validIds);

        if (siteLinks && siteLinks.length > 0) {
          // Prepare an array of promises for deletions
          const deletePromises = siteLinks.map(async (site) => {
            try {
              // Delete the logo file if it exists
              const logoPath = site.logo ? path.join(global.uploadsBaseDir, site.logo) : null;
              if (logoPath) {
                try {
                  await fs.promises.access(logoPath); // Check if the logo exists
                  await fs.promises.unlink(logoPath); // Delete the logo
                } catch (err) {
                  console.error(`Error deleting logo with ID ${site.id}:`, err);
                }
              }

              // Delete Image File
              const imagePath = site.image ? path.join(global.uploadsBaseDir, site.image) : null;
              if (imagePath) {
                try {
                  await fs.promises.access(imagePath); // Check if the image exists
                  await fs.promises.unlink(imagePath); // Delete the image
                } catch (err) {
                  console.error(`Error deleting image with ID ${site.id}:`, err);
                }
              }

            } catch (deleteError) {
              console.error(`Error processing deletion for ID ${site.id}:`, deleteError);
            }
          });

          // Wait for all delete operations to complete
          await Promise.all(deletePromises);
        }

        // Parameterized DELETE query
        const query = `DELETE FROM site_link WHERE id IN (${placeholders})`;
        response_data = await executeQuery(query, validIds);

        // response_data = true;
        response_message = 'Site links deleted successfully.';
        response_code = 'LINKS_ADDED_DELETED';
        break;
      }

      case 'deleteMessage': {
        const parsedIds = JSON.parse(payload);
        if (!Array.isArray(parsedIds) || parsedIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid or missing IDs.'));
        }

        // Ensure all IDs are valid integers
        const validIds = parsedIds.filter(id => Number.isInteger(id));
        if (validIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid IDs.'));
        }
        // Prepare a parameterized query to prevent SQL injection
        const placeholders = validIds.map(() => '?').join(',');
        const query = `DELETE FROM massage WHERE id IN (${placeholders})`;

        response_data = await executeQuery(query, validIds);
        // response_data = true;
        response_message = 'Messages deleted successfully.';
        response_code = 'MESSAGES_DELETED';
        break;
      }

      case 'deleteProfile': {
        const parsedIds = JSON.parse(payload);
        if (!Array.isArray(parsedIds) || parsedIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid or missing IDs.'));
        }

        // Ensure all IDs are valid integers
        const validIds = parsedIds.filter(id => Number.isInteger(id));
        if (validIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid IDs.'));
        }

        // Check id contain any current logged in user
        if (validIds.includes(user?.id)) {
          return res.status(400).json(createErrorResponse(`The logged-in user (${user.email}) cannot delete their profile.`));
        }

        // Select Data Of that Id with images
        const placeholders = validIds.map(() => '?').join(',');
        const selectQuery = `SELECT id, image FROM user WHERE id IN (${placeholders})`;
        const adminProfiles = await executeQuery(selectQuery, validIds);

        if (adminProfiles && adminProfiles.length > 0) {
          // Prepare an array of promises for deletions
          const deletePromises = adminProfiles.map(async (adminProfile) => {
            try {
              // Delete Image File
              const imagePath = adminProfile.image ? path.join(global.uploadsBaseDir, adminProfile.image) : null;
              if (imagePath) {
                try {
                  await fs.promises.access(imagePath); // Check if the image exists
                  await fs.promises.unlink(imagePath); // Delete the image
                } catch (err) {
                  console.error(`Error deleting image with ID ${adminProfile.id}:`, err);
                }
              }

            } catch (deleteError) {
              console.error(`Error processing deletion for ID ${adminProfile.id}:`, deleteError);
            }
          });

          // Wait for all delete operations to complete
          await Promise.all(deletePromises);
        }

        // Prepare a parameterized query to prevent SQL injection
        const query = `DELETE FROM user WHERE id IN (${placeholders})`;
        response_data = await executeQuery(query, validIds);
        // response_data = true;
        response_message = 'Profiles deleted successfully.';
        response_code = 'PROFILES_DELETED';
        break;
      }

      case 'activeProfile': {
        const parsedIds = JSON.parse(payload);
        if (!Array.isArray(parsedIds) || parsedIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid or missing IDs.'));
        }

        // Ensure all IDs are valid integers
        const validIds = parsedIds.filter(id => Number.isInteger(id));
        if (validIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid IDs.'));
        }
        // Prepare a parameterized query to prevent SQL injection
        const placeholders = validIds.map(() => '?').join(',');
        const query = `UPDATE user SET status = ? WHERE id IN (${placeholders})`;
        response_data = await executeQuery(query, [1, ...validIds]);
        response_message = 'Account status activated successfully.';
        response_code = 'PROFILE_ACTIVE_STATUS';
        break;
      }

      case 'deactivateProfile': {
        const parsedIds = JSON.parse(payload);
        if (!Array.isArray(parsedIds) || parsedIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid or missing IDs.'));
        }

        // Ensure all IDs are valid integers
        const validIds = parsedIds.filter(id => Number.isInteger(id));
        if (validIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid IDs.'));
        }

        // Check id contain any current logged in user
        if (validIds.includes(user?.id)) {
          return res.status(400).json(createErrorResponse(`The logged-in user (${user.email}) cannot deactivate their profile.`));
        }
        // Prepare a parameterized query to prevent SQL injection
        const placeholders = validIds.map(() => '?').join(',');
        const query = `UPDATE user SET status = ? WHERE id IN (${placeholders})`;
        response_data = await executeQuery(query, [0, ...validIds]);
        response_message = 'Account status deactivated successfully.';
        response_code = 'PROFILE_DEACTIVE_STATUS';
        break;
      }

      // Users
      case 'suspendUsers': {
        const parsedIds = JSON.parse(payload);

        // Validate IDs
        if (!Array.isArray(parsedIds) || parsedIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid or missing IDs.'));
        }

        // Filter valid integer IDs
        const validIds = parsedIds.filter(id => Number.isInteger(id));
        if (validIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid IDs.'));
        }

        // Prepare placeholders for parameterized queries
        const placeholders = validIds.map(() => '?').join(',');

        // Select User id, Username, Email
        const getUsersQuery = `SELECT id, username, email FROM member WHERE id IN (${placeholders})`;
        const userList = await executeQuery(getUsersQuery, validIds);

        const emailStatus = {
          totalSuccessSent: 0,
          totalFailedSent: 0,
          failedEmails: [],
        };

        // Prepare email content placeholder
        const emailPlaceholders = {
          LOGO_URL: "https://localxlist.com/backend/images/settings/header_logo_15854785210.png",
          STATUS_UPDATE_MESSAGE: "Your account has been suspended successfully.",
        };

        // Send emails
        await Promise.all(userList.map(async (user) => {
          const userEmail = user?.email || "";
          const username = user?.username || "";

          // Update user status in the database
          await updateRecord('member', { status: 2 }, { id: user?.id });

          // Load Email Template
          const emailTemplatePath = path.join(__dirname, '../../email_templates/accountStatusUpdateMailTemplate.html');
          const emailContent = loadEmailTemplate(emailTemplatePath, { ...emailPlaceholders, USERNAME: username });

          // Send Email
          const emailOptions = {
            to: userEmail,
            subject: "Testing Mode - Important Update: Account Status | Localxlist",
            html: emailContent,
          };

          try {
            // const sentMail = await sendEmail(emailOptions);
            // logger.info({ sentMail });
            emailStatus.totalSuccessSent++;
          } catch (error) {
            emailStatus.totalFailedSent++;
            emailStatus.failedEmails.push({ id: user.id, email: user.email });
            logger.error({ error: `Failed to send email to ${userEmail}` });
            // Depending on your application's needs, you may choose to log the error and continue,
            // or halt execution for unhandled email sending issues.
          }
        }));

        response_data = {
          ids: validIds, emailStatus, updatedFields: {
            status: 2
          }
        };
        response_message = 'Account suspended successfully.';
        response_code = 'USERS_SUSPENDED_SUCCESS';
        break;
      }


      case 'activateUsers': {
        const parsedIds = JSON.parse(payload);
        if (!Array.isArray(parsedIds) || parsedIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid or missing IDs.'));
        }

        // Ensure all IDs are valid integers
        const validIds = parsedIds.filter(id => Number.isInteger(id));
        if (validIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid IDs.'));
        }
        // Prepare a parameterized query to prevent SQL injection
        const placeholders = validIds.map(() => '?').join(',');

        // Select User id, Username, Email
        const getUsersQuery = `SELECT id, username, email FROM member WHERE id IN (${placeholders})`;
        const userList = await executeQuery(getUsersQuery, validIds);

        const emailStatus = {
          totalSuccessSent: 0,
          totalFailedSent: 0,
          failedEmails: [],
        };

        // Prepare email content placeholder
        const emailPlaceholders = {
          LOGO_URL: "https://localxlist.com/backend/images/settings/header_logo_15854785210.png",
          STATUS_UPDATE_MESSAGE: "Your account has been activated successfully.",
        };

        // Send emails
        await Promise.all(userList.map(async (user) => {
          const userEmail = user?.email || "";
          const username = user?.username || "";

          // Update user status in the database
          await updateRecord('member', { status: 1 }, { id: user?.id });

          // Load Email Template
          const emailTemplatePath = path.join(__dirname, '../../email_templates/accountStatusUpdateMailTemplate.html');
          const emailContent = loadEmailTemplate(emailTemplatePath, { ...emailPlaceholders, USERNAME: username });

          // Send Email
          const emailOptions = {
            to: userEmail,
            subject: "Testing Mode - Important Update: Account Status | Localxlist",
            html: emailContent,
          };

          try {
            // const sentMail = await sendEmail(emailOptions);
            // logger.info({ sentMail });
            emailStatus.totalSuccessSent++;
          } catch (error) {
            emailStatus.totalFailedSent++;
            emailStatus.failedEmails.push({ id: user.id, email: user.email });
            logger.error({ error: `Failed to send email to ${userEmail}` });
            // Depending on your application's needs, you may choose to log the error and continue,
            // or halt execution for unhandled email sending issues.
          }
        }));

        response_data = {
          ids: validIds, emailStatus, updatedFields: {
            status: 1
          }
        };
        response_message = 'Account activated successfully.';
        response_code = 'USERS_ACTIVATED_SUCCESS';
        break;
      }

      case 'deactivateUsers': {
        const parsedIds = JSON.parse(payload);
        if (!Array.isArray(parsedIds) || parsedIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid or missing IDs.'));
        }

        // Ensure all IDs are valid integers
        const validIds = parsedIds.filter(id => Number.isInteger(id));
        if (validIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid IDs.'));
        }
        // Prepare a parameterized query to prevent SQL injection
        const placeholders = validIds.map(() => '?').join(',');

        // Select User id, Username, Email
        const getUsersQuery = `SELECT id, username, email FROM member WHERE id IN (${placeholders})`;
        const userList = await executeQuery(getUsersQuery, validIds);

        const emailStatus = {
          totalSuccessSent: 0,
          totalFailedSent: 0,
          failedEmails: [],
        };

        // Prepare email content placeholder
        const emailPlaceholders = {
          LOGO_URL: "https://localxlist.com/backend/images/settings/header_logo_15854785210.png",
          STATUS_UPDATE_MESSAGE: "Your account has been deactivated successfully.",
        };

        // Send emails
        await Promise.all(userList.map(async (user) => {
          const userEmail = user?.email || "";
          const username = user?.username || "";

          // Update user status in the database
          await updateRecord('member', { status: 0 }, { id: user?.id });

          // Load Email Template
          const emailTemplatePath = path.join(__dirname, '../../email_templates/accountStatusUpdateMailTemplate.html');
          const emailContent = loadEmailTemplate(emailTemplatePath, { ...emailPlaceholders, USERNAME: username });

          // Send Email
          const emailOptions = {
            to: userEmail,
            subject: "Testing Mode - Important Update: Account Status | Localxlist",
            html: emailContent,
          };

          try {
            // const sentMail = await sendEmail(emailOptions);
            // logger.info({ sentMail });
            emailStatus.totalSuccessSent++;
          } catch (error) {
            emailStatus.totalFailedSent++;
            emailStatus.failedEmails.push({ id: user.id, email: user.email });
            logger.error({ error: `Failed to send email to ${userEmail}` });
            // Depending on your application's needs, you may choose to log the error and continue,
            // or halt execution for unhandled email sending issues.
          }
        }));

        response_data = {
          ids: validIds, emailStatus, updatedFields: {
            status: 0
          }
        };
        response_message = 'Account deactivated successfully.';
        response_code = 'USERS_DEACTIVATED_SUCCESS';
        break;
      }

      case 'verifyUsers': {
        const parsedIds = JSON.parse(payload);
        if (!Array.isArray(parsedIds) || parsedIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid or missing IDs.'));
        }

        // Ensure all IDs are valid integers
        const validIds = parsedIds.filter(id => Number.isInteger(id));
        if (validIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid IDs.'));
        }
        // Prepare a parameterized query to prevent SQL injection
        const placeholders = validIds.map(() => '?').join(',');

        // Select User id, Username, Email
        const getUsersQuery = `SELECT id, username, email FROM member WHERE id IN (${placeholders})`;
        const userList = await executeQuery(getUsersQuery, validIds);

        const emailStatus = {
          totalSuccessSent: 0,
          totalFailedSent: 0,
          failedEmails: [],
        };

        // Prepare email content placeholder
        const emailPlaceholders = {
          LOGO_URL: "https://localxlist.com/backend/images/settings/header_logo_15854785210.png",
          STATUS_UPDATE_MESSAGE: "Your account has been verified successfully.",
        };

        // Send emails
        await Promise.all(userList.map(async (user) => {
          const userEmail = user?.email || "";
          const username = user?.username || "";

          // Update user status in the database
          await updateRecord('member', { status: 1, verified: 1 }, { id: user?.id });

          // Load Email Template
          const emailTemplatePath = path.join(__dirname, '../../email_templates/accountStatusUpdateMailTemplate.html');
          const emailContent = loadEmailTemplate(emailTemplatePath, { ...emailPlaceholders, USERNAME: username });

          // Send Email
          const emailOptions = {
            to: userEmail,
            subject: "Testing Mode - Important Update: Account Status | Localxlist",
            html: emailContent,
          };

          try {
            // const sentMail = await sendEmail(emailOptions);
            // logger.info({ sentMail });
            emailStatus.totalSuccessSent++;
          } catch (error) {
            emailStatus.totalFailedSent++;
            emailStatus.failedEmails.push({ id: user.id, email: user.email });
            logger.error({ error: `Failed to send email to ${userEmail}` });
            // Depending on your application's needs, you may choose to log the error and continue,
            // or halt execution for unhandled email sending issues.
          }
        }));

        response_data = {
          ids: validIds, emailStatus, updatedFields: {
            status: 1, verified: 1
          }
        };
        response_message = 'Account verified successfully.';
        response_code = 'USERS_VERIFIED_SUCCESS';
        break;
      }

      case 'deleteUsers': {
        const parsedIds = JSON.parse(payload);
        if (!Array.isArray(parsedIds) || parsedIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid or missing IDs.'));
        }

        // Ensure all IDs are valid integers
        const validIds = parsedIds.filter(id => Number.isInteger(id));
        if (validIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid IDs.'));
        }

        let transaction;

        try {
          transaction = await startTransaction(); // Start transaction

          // Select Data Of that Id with images
          const placeholders = validIds.map(() => '?').join(',');
          const selectQuery = `SELECT id, path, username FROM member WHERE id IN (${placeholders})`;
          const allUsers = await executeQuery(selectQuery, validIds);

          if (allUsers && allUsers.length > 0) {
            // Prepare an array of promises for deletions
            const deletePromises = allUsers.map(async (user) => {
              try {
                // Delete Image File
                const imagePath = user.path ? path.join(global.uploadsBaseDir, user.path) : null;
                if (imagePath) {
                  try {
                    await fs.promises.access(imagePath); // Check if the image exists
                    await fs.promises.unlink(imagePath); // Delete the image
                  } catch (err) {
                    console.error(`Error deleting image with ID ${user.id}:`, err);
                  }
                }

              } catch (deleteError) {
                console.error(`Error processing deletion for ID ${user.id}:`, deleteError);
              }
            });

            // Wait for all delete operations to complete
            await Promise.all(deletePromises);
          }

          // ========= Delete Member's Balance =========
          const validUsernames = allUsers.map(member => member.username); // Extract usernames from an array of member objects
          const usernamePlaceholders = validUsernames.map(() => '?').join(',');
          await executeQuery(`DELETE FROM balance WHERE username IN (${usernamePlaceholders})`, validUsernames);
          await executeQuery(`DELETE FROM balance_history WHERE username IN (${usernamePlaceholders})`, validUsernames);

          // ========= Delete All Member's Posts =========
          const posts = await getTableRecord(`SELECT id, img_id FROM post WHERE member_id IN (${placeholders})`, validIds);
          // Collect all post IDs, image IDs
          const postIds = posts.map(post => post.id).filter(id => id);
          const imageIds = posts.map(post => post.img_id).filter(img_id => img_id);
          if (imageIds.length > 0) {
            const imgPlaceholders = imageIds.map(() => '?').join(',');
            const postImgs = await getTableRecord(`SELECT id, path FROM post_img_table WHERE img_id IN (${imgPlaceholders})`, imageIds);

            if (postImgs.length > 0) {
              // Delete all image records in one query
              await executeQuery(`DELETE FROM post_img_table WHERE img_id IN (${imgPlaceholders})`, imageIds);

              // Delete files asynchronously
              const deleteFilePromises = postImgs.map(async (image) => {
                try {
                  const imagePath = image.path ? path.join(global.uploadsBaseDir, image.path) : null;
                  if (imagePath && fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                  }
                } catch (deleteError) {
                  console.error(`Error deleting image file: ${image.path}`, deleteError);
                }
              });

              await Promise.all(deleteFilePromises);
            }
          }
          // Delete the posts
          if (postIds.length > 0) {
            const postIdPlaceholders = postIds.map(() => '?').join(',');
            await executeQuery(`DELETE FROM post WHERE id IN (${postIdPlaceholders})`, postIds);
            // Delete the transaction posts
            await executeQuery(`DELETE FROM transaction_posts WHERE post_id IN (${postIdPlaceholders})`, postIds);
          }

          // Delete the users
          await executeQuery(`DELETE FROM member WHERE id IN (${placeholders})`, validIds);

          response_data = {
            ids: validIds
          };
          response_message = 'Users deleted successfully.';
          response_code = 'USERS_DELETED';

        } catch (error) {
          await rollbackTransaction(transaction); // Rollback on error
          console.error(error);
        }
        break;
      }

      case 'rechargeBalanceToUsers': {
        const parsedPayload = JSON.parse(payload);
        const { rechargeType, amount, ids } = parsedPayload;
        console.log({ parsedPayload });

        const rechargeAmount = parseFloat(amount || 0);
        if (rechargeAmount <= 0) {
          return res.status(400).json(createErrorResponse('Invalid recharge amount.'));
        }

        let transaction;

        try {
          transaction = await startTransaction(); // Start transaction

          let users;
          if (rechargeType === 'all') {
            // Fetch all active and verified users
            const getUsersQuery = `
                    SELECT member.id, member.username
                    FROM member
                    WHERE member.status = ? AND member.verified = ?;
                `;
            users = await executeQuery(getUsersQuery, [1, 1], transaction);
          } else {
            if (!Array.isArray(ids) || ids.length === 0) {
              return res.status(400).json(createErrorResponse('Invalid or missing IDs.'));
            }

            const validIds = ids.filter(id => Number.isInteger(id));
            if (validIds.length === 0) {
              return res.status(400).json(createErrorResponse('Invalid IDs.'));
            }

            const placeholders = validIds.map(() => '?').join(',');
            const getUsersQuery = `
                    SELECT member.id, member.username
                    FROM member
                    WHERE member.id IN (${placeholders});
                `;
            users = await executeQuery(getUsersQuery, validIds, transaction);
          }

          if (users.length === 0) {
            await rollbackTransaction(transaction);
            return res.status(404).json(createErrorResponse('No users found.'));
          }

          // Process in chunks (10,000 users at a time)
          const maxChunkSize = 1000;
          const totalUsers = users.length;
          const chunkSize = Math.min(totalUsers, maxChunkSize); // Dynamically adjust chunk size

          for (let i = 0; i < totalUsers; i += chunkSize) {
            const batchUsers = users.slice(i, i + chunkSize);
            const batchUsernames = batchUsers.map(user => user.username);

            // Step 1: Prepare bulk update for existing balances
            const placeholders = batchUsernames.map(() => '?').join(',');
            const updateQuery = `
                    UPDATE balance
                    SET balance = balance + ?
                    WHERE username IN (${placeholders});
                `;
            await executeQuery(updateQuery, [rechargeAmount, ...batchUsernames], transaction);

            // Step 2: Insert new balances for users who don't have an entry
            const insertQuery = `
                    INSERT INTO balance (username, balance)
                    SELECT member.username, ?
                    FROM member
                    LEFT JOIN balance ON member.username = balance.username
                    WHERE member.username IN (${placeholders}) 
                    AND balance.username IS NULL;
                `;
            await executeQuery(insertQuery, [rechargeAmount, ...batchUsernames], transaction);
          }

          await commitTransaction(transaction); // Commit transaction after all batches

          response_data = true;
          response_message = rechargeType === 'all'
            ? 'Balance recharged to all users successfully.'
            : 'Balance recharged to selected users successfully.';
          response_code = rechargeType === 'all'
            ? 'BALANCE_RECHARGED_TO_ALL_SUCCESS'
            : 'BALANCE_RECHARGED_TO_SELECTED_SUCCESS';

        } catch (error) {
          await rollbackTransaction(transaction); // Rollback on error
          console.error(error);
          return res.status(500).json(createErrorResponse('Something went wrong.'));
        }
        break;
      }

      case 'deactivatePosts': {
        const parsedIds = JSON.parse(payload);
        if (!Array.isArray(parsedIds) || parsedIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid or missing IDs.'));
        }

        // Ensure all IDs are valid integers
        const validIds = parsedIds.filter(id => Number.isInteger(id));
        if (validIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid IDs.'));
        }
        // Prepare a parameterized query to prevent SQL injection
        const placeholders = validIds.map(() => '?').join(',');

        // Select Post and Member
        const getUsersQuery = `SELECT post.id, post.title, member.username, member.email FROM post INNER JOIN member ON member.id = post.member_id WHERE post.id IN (${placeholders})`;
        const postList = await executeQuery(getUsersQuery, validIds);

        const emailStatus = {
          totalSuccessSent: 0,
          totalFailedSent: 0,
          failedEmails: [],
        };

        // Send emails
        await Promise.all(postList.map(async (post) => {
          // Prepare email content placeholder
          const emailPlaceholders = {
            LOGO_URL: "https://localxlist.com/backend/images/settings/header_logo_15854785210.png",
            STATUS_UPDATE_MESSAGE: `Your post titled: "${sanitizeXSSInput(post.title)}" has been suspended.`,
          };

          const userEmail = post?.email || "";
          const username = post?.username || "";

          // Update user status in the database
          await updateRecord('post', { status: 0 }, { id: post?.id });

          // Load Email Template
          const emailTemplatePath = path.join(__dirname, '../../email_templates/postStatusUpdateMailTemplate.html');
          const emailContent = loadEmailTemplate(emailTemplatePath, { ...emailPlaceholders, USERNAME: username });

          // Send Email
          const emailOptions = {
            to: userEmail,
            subject: "Testing Mode - Important Update: Post Status | Localxlist",
            html: emailContent,
          };

          try {
            const sentMail = await sendEmail(emailOptions);
            logger.info({ sentMail });
            emailStatus.totalSuccessSent++;
          } catch (error) {
            emailStatus.totalFailedSent++;
            emailStatus.failedEmails.push({ id: user.id, email: user.email });
            logger.error({ error: `Failed to send email to ${userEmail}` });
            // Depending on your application's needs, you may choose to log the error and continue,
            // or halt execution for unhandled email sending issues.
          }
        }));

        response_data = {
          ids: validIds, emailStatus, updatedFields: {
            status: 0
          }
        };
        response_message = 'Post deactivated successfully.';
        response_code = 'POSTS_DEACTIVATED_SUCCESS';
        break;
      }

      case 'trashPosts': {
        const parsedIds = JSON.parse(payload);
        if (!Array.isArray(parsedIds) || parsedIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid or missing IDs.'));
        }

        // Ensure all IDs are valid integers
        const validIds = parsedIds.filter(id => Number.isInteger(id));
        if (validIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid IDs.'));
        }
        // Prepare a parameterized query to prevent SQL injection
        const placeholders = validIds.map(() => '?').join(',');
        const query = `UPDATE post SET status = ? WHERE id IN (${placeholders})`;
        await executeQuery(query, [2, ...validIds]);
        response_data = {
          ids: validIds, updatedFields: {
            status: 2
          }
        };
        response_message = 'Post trashed successfully.';
        response_code = 'POSTS_TRASHED_SUCCESS';
        break;
      }

      case 'activatePosts': {
        const parsedIds = JSON.parse(payload);
        if (!Array.isArray(parsedIds) || parsedIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid or missing IDs.'));
        }

        // Ensure all IDs are valid integers
        const validIds = parsedIds.filter(id => Number.isInteger(id));
        if (validIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid IDs.'));
        }
        // Prepare a parameterized query to prevent SQL injection
        const placeholders = validIds.map(() => '?').join(',');

        // Select Post and Member
        const getUsersQuery = `SELECT post.id, post.title, member.username, member.email FROM post INNER JOIN member ON member.id = post.member_id WHERE post.id IN (${placeholders})`;
        const postList = await executeQuery(getUsersQuery, validIds);

        const emailStatus = {
          totalSuccessSent: 0,
          totalFailedSent: 0,
          failedEmails: [],
        };

        // Send emails
        await Promise.all(postList.map(async (post) => {
          // Prepare email content placeholder
          const emailPlaceholders = {
            LOGO_URL: "https://localxlist.com/backend/images/settings/header_logo_15854785210.png",
            STATUS_UPDATE_MESSAGE: `Your post titled: "${sanitizeXSSInput(post.title)}" has been activated now.`,
          };

          const userEmail = post?.email || "";
          const username = post?.username || "";

          // Update user status in the database
          await updateRecord('post', { status: 1 }, { id: post?.id });

          // Load Email Template
          const emailTemplatePath = path.join(__dirname, '../../email_templates/postStatusUpdateMailTemplate.html');
          const emailContent = loadEmailTemplate(emailTemplatePath, { ...emailPlaceholders, USERNAME: username });

          // Send Email
          const emailOptions = {
            to: userEmail,
            subject: "Testing Mode - Important Update: Post Status | Localxlist",
            html: emailContent,
          };

          try {
            // const sentMail = await sendEmail(emailOptions);
            // logger.info({ sentMail });
            emailStatus.totalSuccessSent++;
          } catch (error) {
            emailStatus.totalFailedSent++;
            emailStatus.failedEmails.push({ id: user.id, email: user.email });
            logger.error({ error: `Failed to send email to ${userEmail}` });
            // Depending on your application's needs, you may choose to log the error and continue,
            // or halt execution for unhandled email sending issues.
          }
        }));

        response_data = {
          ids: validIds, emailStatus, updatedFields: {
            status: 1
          }
        };
        response_message = 'Post activated successfully.';
        response_code = 'POSTS_ACTIVATED_SUCCESS';
        break;
      }

      case 'deleteMultiPosts':
      case 'deletePosts': {
        const parsedIds = JSON.parse(payload);
        if (!Array.isArray(parsedIds) || parsedIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid or missing IDs.'));
        }

        // Ensure valid IDs
        const validIds = parsedIds.filter(id => Number.isInteger(id));
        if (validIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid IDs.'));
        }

        // Fetch posts
        const placeholders = validIds.map(() => '?').join(',');
        const posts = await getTableRecord(`SELECT id, img_id FROM post WHERE id IN (${placeholders})`, validIds);
        if (!posts || posts.length === 0) {
          return res.status(400).json(createErrorResponse('No valid posts found.'));
        }

        // Step 1: Get all unique img_ids in posts
        const imageIds = [...new Set(posts.map(post => post.img_id).filter(Boolean))];
        let imgIdToPostIdsMap = new Map();

        if (imageIds.length > 0) {
          // Step 2: Fetch all posts related to these img_ids (all posts using the images)
          const imgPlaceholders = imageIds.map(() => '?').join(',');
          const postsUsingImages = await getTableRecord(
            `SELECT id, img_id FROM post WHERE img_id IN (${imgPlaceholders})`, imageIds
          );

          // Step 3: Cache img_id → post_ids map
          postsUsingImages.forEach(post => {
            if (!imgIdToPostIdsMap.has(post.img_id)) {
              imgIdToPostIdsMap.set(post.img_id, []);
            }
            imgIdToPostIdsMap.get(post.img_id).push(post.id);
          });

          // Step 4: Fetch image records
          const postImgs = await getTableRecord(
            `SELECT id, path, img_id FROM post_img_table WHERE img_id IN (${imgPlaceholders})`,
            imageIds
          );

          // Step 5: Find img_ids whose all posts are getting deleted
          let deletableImgIds = [];
          let deletableImagePaths = [];

          postImgs.forEach(image => {
            const allPostIdsForImg = imgIdToPostIdsMap.get(image.img_id) || [];
            const deletedPostIdsForImg = allPostIdsForImg.filter(postId => validIds.includes(postId));

            if (deletedPostIdsForImg.length === allPostIdsForImg.length) {
              // All posts using this img_id are being deleted
              deletableImgIds.push(image.img_id);

              if (image.path) {
                deletableImagePaths.push(path.join(global.uploadsBaseDir, image.path));
              }
            }
          });

          // Step 6: Delete image records in ONE query
          if (deletableImgIds.length > 0) {
            const deletableImgPlaceholders = deletableImgIds.map(() => '?').join(',');
            await executeQuery(`DELETE FROM post_img_table WHERE img_id IN (${deletableImgPlaceholders})`, deletableImgIds);
          }

          // Step 7: Delete image files
          deletableImagePaths.forEach(imagePath => {
            try {
              if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
                console.log(`Deleted image file: ${imagePath}`);
              }
            } catch (err) {
              console.error(`Error deleting image file: ${imagePath}`, err);
            }
          });
        }

        // Step 8: Delete posts
        await executeQuery(`DELETE FROM post WHERE id IN (${placeholders})`, validIds);

        // Final Response
        response_data = { ids: validIds };
        if (actionType == "deleteMultiPosts") {
          response_message = 'Multi Posts deleted successfully.';
          response_code = 'MULTI_POSTS_DELETED_SUCCESS';
        } else {
          response_message = 'Posts deleted successfully.';
          response_code = 'POSTS_DELETED_SUCCESS';
        }

        break;
      }


      case 'deleteCountries': {
        const parsedIds = JSON.parse(payload);
        if (!Array.isArray(parsedIds) || parsedIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid or missing IDs.'));
        }

        // Ensure all IDs are valid integers
        const validIds = parsedIds.filter(id => Number.isInteger(id));
        if (validIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid IDs.'));
        }

        // Prepare a parameterized query to prevent SQL injection
        const placeholders = validIds.map(() => '?').join(',');
        const query = `DELETE FROM country WHERE id IN (${placeholders})`;

        await executeQuery(query, validIds);
        response_data = {
          ids: validIds
        };
        response_message = 'Countries deleted successfully.';
        response_code = 'COUNTRIES_DELETED';
        break;
      }

      case 'deleteCities': {
        const parsedIds = JSON.parse(payload);
        if (!Array.isArray(parsedIds) || parsedIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid or missing IDs.'));
        }

        // Ensure all IDs are valid integers
        const validIds = parsedIds.filter(id => Number.isInteger(id));
        if (validIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid IDs.'));
        }

        // Prepare a parameterized query to prevent SQL injection
        const placeholders = validIds.map(() => '?').join(',');
        const query = `DELETE FROM city WHERE id IN (${placeholders})`;

        response_data = await executeQuery(query, validIds);
        response_message = 'Cities deleted successfully.';
        response_code = 'CITIES_DELETED';
        break;
      }

      case 'deleteSubCities': {
        const parsedIds = JSON.parse(payload);
        if (!Array.isArray(parsedIds) || parsedIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid or missing IDs.'));
        }

        // Ensure all IDs are valid integers
        const validIds = parsedIds.filter(id => Number.isInteger(id));
        if (validIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid IDs.'));
        }

        // Prepare a parameterized query to prevent SQL injection
        const placeholders = validIds.map(() => '?').join(',');
        const query = `DELETE FROM subcity WHERE id IN (${placeholders})`;

        response_data = await executeQuery(query, validIds);
        response_message = 'Sub Cities deleted successfully.';
        response_code = 'SUBCITIES_DELETED';
        break;
      }

      case 'deleteCategories': {
        const parsedIds = JSON.parse(payload);
        if (!Array.isArray(parsedIds) || parsedIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid or missing IDs.'));
        }

        // Ensure all IDs are valid integers
        const validIds = parsedIds.filter(id => Number.isInteger(id));
        if (validIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid IDs.'));
        }

        // Prepare a parameterized query to prevent SQL injection
        const placeholders = validIds.map(() => '?').join(',');
        const query = `DELETE FROM category WHERE id IN (${placeholders})`;

        response_data = await executeQuery(query, validIds);
        response_message = 'Categories deleted successfully.';
        response_code = 'CATEGORIES_DELETED';
        break;
      }

      case 'deleteSubCategories': {
        const parsedIds = JSON.parse(payload);
        if (!Array.isArray(parsedIds) || parsedIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid or missing IDs.'));
        }

        // Ensure all IDs are valid integers
        const validIds = parsedIds.filter(id => Number.isInteger(id));
        if (validIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid IDs.'));
        }

        // Prepare a parameterized query to prevent SQL injection
        const placeholders = validIds.map(() => '?').join(',');
        const query = `DELETE FROM subcategory WHERE id IN (${placeholders})`;

        response_data = await executeQuery(query, validIds);
        response_message = 'Sub Categories deleted successfully.';
        response_code = 'SUBCATEGORIES_DELETED';
        break;
      }

      case 'deleteAds': {
        const parsedIds = JSON.parse(payload);
        if (!Array.isArray(parsedIds) || parsedIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid or missing IDs.'));
        }

        // Ensure all IDs are valid integers
        const validIds = parsedIds.filter(id => Number.isInteger(id));
        if (validIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid IDs.'));
        }

        // Select Data Of that Id with images
        const placeholders = validIds.map(() => '?').join(',');
        const selectQuery = `SELECT id, path FROM ad WHERE id IN (${placeholders})`;
        const allAds = await executeQuery(selectQuery, validIds);

        if (allAds && allAds.length > 0) {
          // Prepare an array of promises for deletions
          const deletePromises = allAds.map(async (ad) => {
            try {
              // Delete Image File
              const imagePath = ad.path ? path.join(global.uploadsBaseDir, ad.path) : null;
              if (imagePath) {
                try {
                  await fs.promises.access(imagePath); // Check if the image exists
                  await fs.promises.unlink(imagePath); // Delete the image
                } catch (err) {
                  console.error(`Error deleting image with ID ${ad.id}:`, err);
                }
              }

            } catch (deleteError) {
              console.error(`Error processing deletion for ID ${ad.id}:`, deleteError);
            }
          });

          // Wait for all delete operations to complete
          await Promise.all(deletePromises);
        }

        // Parameterized DELETE query
        const query = `DELETE FROM ad WHERE id IN (${placeholders})`;
        response_data = await executeQuery(query, validIds);

        response_message = 'Ads deleted successfully.';
        response_code = 'ADS_DELETED';
        break;
      }

      case 'deleteSliderAds': {
        const parsedIds = JSON.parse(payload);
        if (!Array.isArray(parsedIds) || parsedIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid or missing IDs.'));
        }

        // Ensure all IDs are valid integers
        const validIds = parsedIds.filter(id => Number.isInteger(id));
        if (validIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid IDs.'));
        }

        // Select Data Of that Id with images
        const placeholders = validIds.map(() => '?').join(',');
        const selectQuery = `SELECT id, img AS path FROM slider_ad WHERE id IN (${placeholders})`;
        const allSliderAds = await executeQuery(selectQuery, validIds);

        if (allSliderAds && allSliderAds.length > 0) {
          // Prepare an array of promises for deletions
          const deletePromises = allSliderAds.map(async (ad) => {
            try {
              // Delete Image File
              const imagePath = ad.path ? path.join(global.uploadsBaseDir, ad.path) : null;
              if (imagePath) {
                try {
                  await fs.promises.access(imagePath); // Check if the image exists
                  await fs.promises.unlink(imagePath); // Delete the image
                } catch (err) {
                  console.error(`Error deleting image with ID ${ad.id}:`, err);
                }
              }

            } catch (deleteError) {
              console.error(`Error processing deletion for ID ${ad.id}:`, deleteError);
            }
          });

          // Wait for all delete operations to complete
          await Promise.all(deletePromises);
        }

        // Parameterized DELETE query
        const query = `DELETE FROM slider_ad WHERE id IN (${placeholders})`;
        response_data = await executeQuery(query, validIds);

        response_message = 'Slider Ads deleted successfully.';
        response_code = 'SLIDER_ADS_DELETED';
        break;
      }

      case 'deletePostAds': {
        const parsedIds = JSON.parse(payload);
        if (!Array.isArray(parsedIds) || parsedIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid or missing IDs.'));
        }

        // Ensure all IDs are valid integers
        const validIds = parsedIds.filter(id => Number.isInteger(id));
        if (validIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid IDs.'));
        }

        // Select Data Of that Id with images
        const placeholders = validIds.map(() => '?').join(',');
        const selectQuery = `SELECT id, path FROM post_ads WHERE id IN (${placeholders})`;
        const allPostAds = await executeQuery(selectQuery, validIds);

        if (allPostAds && allPostAds.length > 0) {
          // Prepare an array of promises for deletions
          const deletePromises = allPostAds.map(async (ad) => {
            try {
              // Delete Image File
              const imagePath = ad.path ? path.join(global.uploadsBaseDir, ad.path) : null;
              if (imagePath) {
                try {
                  await fs.promises.access(imagePath); // Check if the image exists
                  await fs.promises.unlink(imagePath); // Delete the image
                } catch (err) {
                  console.error(`Error deleting image with ID ${ad.id}:`, err);
                }
              }

            } catch (deleteError) {
              console.error(`Error processing deletion for ID ${ad.id}:`, deleteError);
            }
          });

          // Wait for all delete operations to complete
          await Promise.all(deletePromises);
        }

        // Parameterized DELETE query
        const query = `DELETE FROM post_ads WHERE id IN (${placeholders})`;
        response_data = await executeQuery(query, validIds);

        response_message = 'Post Ads deleted successfully.';
        response_code = 'POST_ADS_DELETED';
        break;
      }

      case 'deleteNewPostAds': {
        const parsedIds = JSON.parse(payload);
        if (!Array.isArray(parsedIds) || parsedIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid or missing IDs.'));
        }

        // Ensure all IDs are valid integers
        const validIds = parsedIds.filter(id => Number.isInteger(id));
        if (validIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid IDs.'));
        }

        // Prepare a parameterized query to prevent SQL injection
        const placeholders = validIds.map(() => '?').join(',');
        const query = `DELETE FROM new_post_ads WHERE id IN (${placeholders})`;

        response_data = await executeQuery(query, validIds);
        response_message = 'New Post Ads deleted successfully.';
        response_code = 'NEW_POST_ADS_DELETED';
        break;
      }

      case 'deleteCategoryPostAds': {
        const parsedIds = JSON.parse(payload);
        if (!Array.isArray(parsedIds) || parsedIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid or missing IDs.'));
        }

        // Ensure all IDs are valid integers
        const validIds = parsedIds.filter(id => Number.isInteger(id));
        if (validIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid IDs.'));
        }

        // Select Data Of that Id with images
        const placeholders = validIds.map(() => '?').join(',');
        const selectQuery = `SELECT id, path FROM cat_post_ads WHERE id IN (${placeholders})`;
        const allPostAds = await executeQuery(selectQuery, validIds);

        if (allPostAds && allPostAds.length > 0) {
          // Prepare an array of promises for deletions
          const deletePromises = allPostAds.map(async (ad) => {
            try {
              // Delete Image File
              const imagePath = ad.path ? path.join(global.uploadsBaseDir, ad.path) : null;
              if (imagePath) {
                try {
                  await fs.promises.access(imagePath); // Check if the image exists
                  await fs.promises.unlink(imagePath); // Delete the image
                } catch (err) {
                  console.error(`Error deleting image with ID ${ad.id}:`, err);
                }
              }

            } catch (deleteError) {
              console.error(`Error processing deletion for ID ${ad.id}:`, deleteError);
            }
          });

          // Wait for all delete operations to complete
          await Promise.all(deletePromises);
        }

        // Parameterized DELETE query
        const query = `DELETE FROM cat_post_ads WHERE id IN (${placeholders})`;
        response_data = await executeQuery(query, validIds);

        response_message = 'Category Post Ads deleted successfully.';
        response_code = 'CATEGORY_POST_ADS_DELETED';
        break;
      }

      case 'deleteGoogleAds': {
        const parsedIds = JSON.parse(payload);
        if (!Array.isArray(parsedIds) || parsedIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid or missing IDs.'));
        }

        // Ensure all IDs are valid integers
        const validIds = parsedIds.filter(id => Number.isInteger(id));
        if (validIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid IDs.'));
        }

        // Prepare a parameterized query to prevent SQL injection
        const placeholders = validIds.map(() => '?').join(',');
        const query = `DELETE FROM google_ads WHERE id IN (${placeholders})`;

        response_data = await executeQuery(query, validIds);
        response_message = 'Google Ads deleted successfully.';
        response_code = 'GOOGLE_ADS_DELETED';
        break;
      }

      case 'deleteTerms': {
        const parsedIds = JSON.parse(payload);
        if (!Array.isArray(parsedIds) || parsedIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid or missing IDs.'));
        }

        // Ensure all IDs are valid integers
        const validIds = parsedIds.filter(id => Number.isInteger(id));
        if (validIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid IDs.'));
        }

        // Prepare a parameterized query to prevent SQL injection
        const placeholders = validIds.map(() => '?').join(',');
        const query = `DELETE FROM terms WHERE id IN (${placeholders})`;

        response_data = await executeQuery(query, validIds);
        response_message = 'Terms deleted successfully.';
        response_code = 'TERMS_DELETED';
        break;
      }

      case 'deleteAlertMessages': {
        const parsedIds = JSON.parse(payload);
        if (!Array.isArray(parsedIds) || parsedIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid or missing IDs.'));
        }

        // Ensure all IDs are valid integers
        const validIds = parsedIds.filter(id => Number.isInteger(id));
        if (validIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid IDs.'));
        }

        // Prepare a parameterized query to prevent SQL injection
        const placeholders = validIds.map(() => '?').join(',');
        const query = `DELETE FROM alert_msg WHERE id IN (${placeholders})`;

        response_data = await executeQuery(query, validIds);
        response_message = 'Alert message deleted successfully.';
        response_code = 'ALERT_MESSAGE_DELETED';
        break;
      }

      case 'deletePostReports': {
        const parsedIds = JSON.parse(payload);
        if (!Array.isArray(parsedIds) || parsedIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid or missing IDs.'));
        }

        // Ensure all IDs are valid integers
        const validIds = parsedIds.filter(id => Number.isInteger(id));
        if (validIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid IDs.'));
        }

        // Prepare a parameterized query to prevent SQL injection
        const placeholders = validIds.map(() => '?').join(',');
        const query = `DELETE FROM post_report WHERE id IN (${placeholders})`;

        response_data = await executeQuery(query, validIds);
        response_message = 'Post report deleted successfully.';
        response_code = 'POST_REPORT_DELETED';
        break;
      }

      case 'deleteFeaturedPackages': {
        const parsedIds = JSON.parse(payload);
        if (!Array.isArray(parsedIds) || parsedIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid or missing IDs.'));
        }

        // Ensure all IDs are valid integers
        const validIds = parsedIds.filter(id => Number.isInteger(id));
        if (validIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid IDs.'));
        }

        // Prepare a parameterized query to prevent SQL injection
        const placeholders = validIds.map(() => '?').join(',');
        const query = `DELETE FROM featured_ad WHERE id IN (${placeholders})`;

        response_data = await executeQuery(query, validIds);
        response_message = 'Featured packages deleted successfully.';
        response_code = 'FEATURED_PACKAGES_DELETED';
        break;
      }

      case 'deleteExtendedPackages': {
        const parsedIds = JSON.parse(payload);
        if (!Array.isArray(parsedIds) || parsedIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid or missing IDs.'));
        }

        // Ensure all IDs are valid integers
        const validIds = parsedIds.filter(id => Number.isInteger(id));
        if (validIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid IDs.'));
        }

        // Prepare a parameterized query to prevent SQL injection
        const placeholders = validIds.map(() => '?').join(',');
        const query = `DELETE FROM extended_ad WHERE id IN (${placeholders})`;

        response_data = await executeQuery(query, validIds);
        response_message = 'Extended packages deleted successfully.';
        response_code = 'EXTENDED_PACKAGES_DELETED';
        break;
      }

      case 'deleteNavLinks': {
        const parsedIds = JSON.parse(payload);
        if (!Array.isArray(parsedIds) || parsedIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid or missing IDs.'));
        }

        // Ensure all IDs are valid integers
        const validIds = parsedIds.filter(id => Number.isInteger(id));
        if (validIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid IDs.'));
        }

        // Prepare a parameterized query to prevent SQL injection
        const placeholders = validIds.map(() => '?').join(',');
        const query = `DELETE FROM link_list WHERE id IN (${placeholders})`;

        response_data = await executeQuery(query, validIds);
        response_message = 'Nav links deleted successfully.';
        response_code = 'NAV_LINKS_DELETED';
        break;
      }

      case 'deleteFooterLinks': {
        const parsedIds = JSON.parse(payload);
        if (!Array.isArray(parsedIds) || parsedIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid or missing IDs.'));
        }

        // Ensure all IDs are valid integers
        const validIds = parsedIds.filter(id => Number.isInteger(id));
        if (validIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid IDs.'));
        }

        // Prepare a parameterized query to prevent SQL injection
        const placeholders = validIds.map(() => '?').join(',');
        const query = `DELETE FROM footer_links WHERE id IN (${placeholders})`;

        response_data = await executeQuery(query, validIds);
        response_message = 'Footer links deleted successfully.';
        response_code = 'FOOTER_LINKS_DELETED';
        break;
      }

      case 'deleteSubCityContents': {
        const parsedIds = JSON.parse(payload);
        if (!Array.isArray(parsedIds) || parsedIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid or missing IDs.'));
        }

        // Ensure all IDs are valid integers
        const validIds = parsedIds.filter(id => Number.isInteger(id));
        if (validIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid IDs.'));
        }

        // Prepare a parameterized query to prevent SQL injection
        const placeholders = validIds.map(() => '?').join(',');
        const query = `DELETE FROM subcity_content WHERE id IN (${placeholders})`;

        response_data = await executeQuery(query, validIds);
        response_message = 'Subcity content deleted successfully.';
        response_code = 'SUBCITY_CONTENT_DELETED';
        break;
      }

      case 'deleteSubCategoryContents': {
        const parsedIds = JSON.parse(payload);
        if (!Array.isArray(parsedIds) || parsedIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid or missing IDs.'));
        }

        // Ensure all IDs are valid integers
        const validIds = parsedIds.filter(id => Number.isInteger(id));
        if (validIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid IDs.'));
        }

        // Prepare a parameterized query to prevent SQL injection
        const placeholders = validIds.map(() => '?').join(',');
        const query = `DELETE FROM subcategory_content WHERE id IN (${placeholders})`;

        response_data = await executeQuery(query, validIds);
        response_message = 'Sub Category content deleted successfully.';
        response_code = 'SUBCATEGORY_CONTENT_DELETED';
        break;
      }

      case 'deleteSponseredLinks': {
        const parsedIds = JSON.parse(payload);
        if (!Array.isArray(parsedIds) || parsedIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid or missing IDs.'));
        }

        // Ensure all IDs are valid integers
        const validIds = parsedIds.filter(id => Number.isInteger(id));
        if (validIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid IDs.'));
        }

        // Prepare a parameterized query to prevent SQL injection
        const placeholders = validIds.map(() => '?').join(',');
        const query = `DELETE FROM sponsors_links WHERE id IN (${placeholders})`;

        response_data = await executeQuery(query, validIds);
        response_message = 'Sponsered links deleted successfully.';
        response_code = 'SPONSERED_LINKS_DELETED';
        break;
      }

      case 'deleteFriendLinks': {
        const parsedIds = JSON.parse(payload);
        if (!Array.isArray(parsedIds) || parsedIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid or missing IDs.'));
        }

        // Ensure all IDs are valid integers
        const validIds = parsedIds.filter(id => Number.isInteger(id));
        if (validIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid IDs.'));
        }

        // Prepare a parameterized query to prevent SQL injection
        const placeholders = validIds.map(() => '?').join(',');
        const query = `DELETE FROM friends_links WHERE id IN (${placeholders})`;

        response_data = await executeQuery(query, validIds);
        response_message = 'Friend links deleted successfully.';
        response_code = 'FRIEND_LINKS_DELETED';
        break;
      }

      case 'deleteLinkCategories': {
        const parsedIds = JSON.parse(payload);
        if (!Array.isArray(parsedIds) || parsedIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid or missing IDs.'));
        }

        // Ensure all IDs are valid integers
        const validIds = parsedIds.filter(id => Number.isInteger(id));
        if (validIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid IDs.'));
        }

        // Prepare a parameterized query to prevent SQL injection
        const placeholders = validIds.map(() => '?').join(',');
        const query = `DELETE FROM sites_link_category WHERE id IN (${placeholders})`;

        response_data = await executeQuery(query, validIds);
        response_message = 'Site link categories deleted successfully.';
        response_code = 'SITE_LINK_CATEGORIES_DELETED';
        break;
      }

      case 'deleteAbouts': {
        const parsedIds = JSON.parse(payload);
        if (!Array.isArray(parsedIds) || parsedIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid or missing IDs.'));
        }

        // Ensure all IDs are valid integers
        const validIds = parsedIds.filter(id => Number.isInteger(id));
        if (validIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid IDs.'));
        }

        // Prepare a parameterized query to prevent SQL injection
        const placeholders = validIds.map(() => '?').join(',');
        const query = `DELETE FROM about WHERE id IN (${placeholders})`;

        response_data = await executeQuery(query, validIds);
        response_message = 'About deleted successfully.';
        response_code = 'ABOUTS_DELETED';
        break;
      }

      case 'deleteHomePageNotices': {
        const parsedIds = JSON.parse(payload);
        if (!Array.isArray(parsedIds) || parsedIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid or missing IDs.'));
        }

        // Ensure all IDs are valid integers
        const validIds = parsedIds.filter(id => Number.isInteger(id));
        if (validIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid IDs.'));
        }

        // Prepare a parameterized query to prevent SQL injection
        const placeholders = validIds.map(() => '?').join(',');
        const query = `DELETE FROM home_page_notice WHERE id IN (${placeholders})`;

        response_data = await executeQuery(query, validIds);
        response_message = 'Home page notices deleted successfully.';
        response_code = 'HOME_NOTICES_DELETED';
        break;
      }


      case 'deleteAlertPageMessages': {
        const parsedIds = JSON.parse(payload);
        if (!Array.isArray(parsedIds) || parsedIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid or missing IDs.'));
        }

        // Ensure all IDs are valid integers
        const validIds = parsedIds.filter(id => Number.isInteger(id));
        if (validIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid IDs.'));
        }

        // Prepare a parameterized query to prevent SQL injection
        const placeholders = validIds.map(() => '?').join(',');
        const query = `DELETE FROM alert_msg WHERE id IN (${placeholders})`;

        response_data = await executeQuery(query, validIds);
        response_message = 'Alert page messages deleted successfully.';
        response_code = 'ALERT_PAGE_MESSAGES_DELETED';
        break;
      }

      case 'deleteManualPaymentMethods': {
        const parsedIds = JSON.parse(payload);
        if (!Array.isArray(parsedIds) || parsedIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid or missing IDs.'));
        }

        // Ensure all IDs are valid integers
        const validIds = parsedIds.filter(id => Number.isInteger(id));
        if (validIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid IDs.'));
        }

        // Prepare a parameterized query to prevent SQL injection
        const placeholders = validIds.map(() => '?').join(',');
        const query = `DELETE FROM payment_methods WHERE id IN (${placeholders})`;

        response_data = await executeQuery(query, validIds);
        response_message = 'Payment methods deleted successfully.';
        response_code = 'MANUAL_PAYMENT_METHODS_DELETED';
        break;
      }

      case 'deletePaymentRequests': {
        const parsedIds = JSON.parse(payload);
        if (!Array.isArray(parsedIds) || parsedIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid or missing IDs.'));
        }

        // Ensure all IDs are valid integers
        const validIds = parsedIds.filter(id => Number.isInteger(id));
        if (validIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid IDs.'));
        }

        // Prepare a parameterized query to prevent SQL injection
        const placeholders = validIds.map(() => '?').join(',');
        const query = `DELETE FROM manual_payment_request WHERE id IN (${placeholders})`;

        response_data = await executeQuery(query, validIds);
        response_message = 'Payment requests deleted successfully.';
        response_code = 'MANUAL_PAYMENT_REQUESTS_DELETED';
        break;
      }

      case 'deleteVideos': {
        const parsedIds = JSON.parse(payload);
        if (!Array.isArray(parsedIds) || parsedIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid or missing IDs.'));
        }

        // Ensure all IDs are valid integers
        const validIds = parsedIds.filter(id => Number.isInteger(id));
        if (validIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid IDs.'));
        }

        // Prepare a parameterized query to prevent SQL injection
        const placeholders = validIds.map(() => '?').join(',');
        const query = `DELETE FROM videos WHERE id IN (${placeholders})`;

        response_data = await executeQuery(query, validIds);
        response_message = 'Videos deleted successfully.';
        response_code = 'VIDEOS_DELETED';
        break;
      }

      case 'deleteBlogCategories': {
        const parsedIds = JSON.parse(payload);
        if (!Array.isArray(parsedIds) || parsedIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid or missing IDs.'));
        }

        // Ensure all IDs are valid integers
        const validIds = parsedIds.filter(id => Number.isInteger(id));
        if (validIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid IDs.'));
        }

        // Prepare a parameterized query to prevent SQL injection
        const placeholders = validIds.map(() => '?').join(',');
        const query = `DELETE FROM blog_categories WHERE id IN (${placeholders})`;

        response_data = await executeQuery(query, validIds);
        response_message = 'Blog categories deleted successfully.';
        response_code = 'BLOG_CATEGORIES_DELETED';
        break;
      }

      case 'deleteBlogs': {
        const parsedIds = JSON.parse(payload);
        if (!Array.isArray(parsedIds) || parsedIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid or missing IDs.'));
        }

        // Ensure all IDs are valid integers
        const validIds = parsedIds.filter(id => Number.isInteger(id));
        if (validIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid IDs.'));
        }

        // Select Data Of that Id with images
        const placeholders = validIds.map(() => '?').join(',');
        const selectQuery = `SELECT id, featured_image AS path FROM blogs WHERE id IN (${placeholders})`;
        const blogs = await executeQuery(selectQuery, validIds);

        if (blogs && blogs.length > 0) {
          // Prepare an array of promises for deletions
          const deletePromises = blogs.map(async (blog) => {
            try {
              // Delete Image File
              const imagePath = blog.path ? path.join(global.uploadsBaseDir, blog.path) : null;
              if (imagePath) {
                try {
                  await fs.promises.access(imagePath); // Check if the image exists
                  await fs.promises.unlink(imagePath); // Delete the image
                } catch (err) {
                  console.error(`Error deleting image with ID ${blog.id}:`, err);
                }
              }

            } catch (deleteError) {
              console.error(`Error processing deletion for ID ${blog.id}:`, deleteError);
            }
          });

          // Wait for all delete operations to complete
          await Promise.all(deletePromises);
        }

        // Parameterized DELETE query
        const query = `DELETE FROM blogs WHERE id IN (${placeholders})`;
        response_data = await executeQuery(query, validIds);

        response_message = 'Blogs deleted successfully.';
        response_code = 'BLOGS_DELETED';
        break;
      }

      case 'deleteMetaDatas': {
        const parsedIds = JSON.parse(payload);
        if (!Array.isArray(parsedIds) || parsedIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid or missing IDs.'));
        }

        // Ensure all IDs are valid integers
        const validIds = parsedIds.filter(id => Number.isInteger(id));
        if (validIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid IDs.'));
        }

        // Prepare a parameterized query to prevent SQL injection
        const placeholders = validIds.map(() => '?').join(',');
        const query = `DELETE FROM page_meta WHERE id IN (${placeholders})`;

        response_data = await executeQuery(query, validIds);
        response_message = 'Meta Data deleted successfully.';
        response_code = 'META_DATA_DELETED';
        break;
      }

      case 'deleteModulePermissions': {
        const parsedIds = JSON.parse(payload);
        if (!Array.isArray(parsedIds) || parsedIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid or missing IDs.'));
        }

        // Ensure all IDs are valid integers
        const validIds = parsedIds.filter(id => Number.isInteger(id));
        if (validIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid IDs.'));
        }

        // Prepare a parameterized query to prevent SQL injection
        const placeholders = validIds.map(() => '?').join(',');
        const query = `DELETE FROM role_user_permissions WHERE id IN (${placeholders})`;

        response_data = await executeQuery(query, validIds);
        response_message = 'Module permissions deleted successfully.';
        response_code = 'MODULE_PERMISSIONS_DELETED';
        break;
      }

      default:
        return res.status(400).json(createErrorResponse('Invalid action type.'));
    }

    res.json(createSuccessResponse(response_message, response_data, response_code));
  } catch (error) {
    next(error);
  }
};

const blogCategoriesSeo = async (req, res, next) => {
  try {

    const settings = await getSettingsData();

    // Prepare metadata for headers
    const logo_img = settings.header_logo_path && fileExists(settings.header_logo_path) ? `${req.appBaseUrl}/uploads/${settings.header_logo_path}` : `${req.appBaseUrl}/uploads/backend/images/settings/header_logo_15477661460.png`;

    const header_data = {
      author: 'localxlist.org',
      title: `Blog Categories | Localxlist`,
      description: `Blog Categories | Localxlist`,
      keywords: "Blog Categories | Localxlist",
      favicon: settings.favicon && fileExists(settings.favicon) ? `${req.appBaseUrl}/uploads/${settings.favicon}` : '',
      image: logo_img,

      ogType: "website",
      ogTitle: `Blog Categories | Localxlist`,
      ogSiteName: "localxlist.org",
      ogUrl: "https://localxlist.org/",
      ogDescription: `Blog Categories | Localxlist`,
      ogImage: logo_img,
      ogImageHeight: "377",

      twitterCard: "summary_large_image",
      twitterSite: "localxlist",
      twitterCreator: "localxlist",
      twitterTitle: `Blog Categories | Localxlist`,
      twitterDescription: `Blog Categories | Localxlist`,
      twitterImage: logo_img,
      generator: "localxlist.org",
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

const blogCategories = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { page = 1, keyword = '' } = query;

    if (!user?.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    const perPageLimit = LIMIT.ADMIN_BLOG_CATEGORIES || 10;
    const offset = (page - 1) * perPageLimit;

    let whereClauses = [];
    let queryParams = [];

    // Keyword search
    if (keyword.trim()) {
      whereClauses.push("(name LIKE ?)");
      const searchKeyword = `%${keyword}%`;
      queryParams.push(searchKeyword);
    }

    // Construct WHERE clause dynamically
    const whereCondition = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

    // Fetch total count for pagination
    const totalRecordCount = await executeQuery(`SELECT COUNT(id) AS total_count FROM blog_categories ${whereCondition};`, queryParams);
    const totalRecords = totalRecordCount[0]?.total_count || 0;
    const totalPages = Math.ceil(totalRecords / perPageLimit);

    // Fetch list
    let q = '';

    if (page == 0) {
      q = `
      SELECT 
      id, name FROM blog_categories
      ${whereCondition}
      ORDER BY id DESC;
    `;
    } else {
      q = `
      SELECT 
      id, name FROM blog_categories
      ${whereCondition}
      ORDER BY id DESC
      LIMIT ? OFFSET ?;
    `;
      queryParams.push(perPageLimit, offset);
    }
    const getList = await getTableRecord(q, queryParams);

    getList.forEach((item, index) => {
      item.srNo = offset + (index + 1);
    });

    res.json(createSuccessResponse('Data retrieved successfully.', {
      list: getList,
      pagination: { currentPage: page, totalPages, perPageLimit, totalRecords }
    }));

  } catch (error) {
    next(error);
  }
};

const blogCategoryDetail = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { id } = query;

    // Validate if the user object is available
    if (!user || !user.id || !user.username) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Check if required parameters are provided
    if (!id) {
      return res.status(400).json(createErrorResponse("Missing required parameters."));
    }
    else if (id && isNaN(id)) {
      return res.status(400).json(createErrorResponse("Invalid parameter value."));
    }

    const whereCondition = `WHERE 1=1`;
    const q = `
      SELECT 
        id, 
        name FROM blog_categories
      ${whereCondition} AND id = ?
      ORDER BY id DESC;
    `;

    const recordDetail = await getTableRecord(q, [id], true);
    if (!recordDetail) {
      return res.status(400).json(createErrorResponse(message = "Record Not Found.", data = null, code = "RECORD_NOT_FOUND"));
    }

    res.json(createSuccessResponse('Data retrieved successfully.', recordDetail));

  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const blogCategorySave = async (req, res, next) => {
  let transaction;

  try {
    const { user, body } = req;
    const { id = '', category = '' } = body;

    // Validate user session
    if (!user || !user?.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Start transaction
    transaction = await startTransaction();

    // Check if the category already exists (both for insert and update)
    const categorySlug = slugify(category);
    const existingCategory = await getTableRecord(
      `SELECT id FROM blog_categories WHERE name = ? OR slug = ? LIMIT 1;`,
      [category, categorySlug],
      true
    );

    if (existingCategory && (!id || existingCategory.id !== id)) {
      await rollbackTransaction(transaction);
      return res.status(400).json(createErrorResponse('Duplicate record found.', null, 'DUPLICATE_RECORD'));
    }

    // Prepare record data
    let setRecordData = {
      name: category,
      slug: slugify(category)
    };

    if (id) {
      // Check if the record exists before updating
      const existingRecord = await getTableRecord(`SELECT id FROM blog_categories WHERE id = ? LIMIT 1;`, [id], true);
      if (!existingRecord) {
        await rollbackTransaction(transaction);
        return res.status(400).json(createErrorResponse('Record Not Found.', null, 'RECORD_NOT_FOUND'));
      }

      // Update the category
      const affectedRows = await updateRecord('blog_categories', setRecordData, { id }, transaction);
      console.log(`Updated record affectedRows:${affectedRows}`);
    } else {
      // Insert new category
      const recordInsertedId = await insertRecord('blog_categories', setRecordData, transaction);
      console.log(`Saved record Id:${recordInsertedId}`);
      setRecordData.id = recordInsertedId;
    }

    // Commit transaction
    await commitTransaction(transaction);
    res.json(createSuccessResponse('Record saved successfully.', setRecordData.id || id, 'RECORD_SAVED'));

  } catch (error) {
    if (transaction) await rollbackTransaction(transaction);
    next(error);
  }
};

const blogsSeo = async (req, res, next) => {
  try {

    const settings = await getSettingsData();

    // Prepare metadata for headers
    const logo_img = settings.header_logo_path && fileExists(settings.header_logo_path) ? `${req.appBaseUrl}/uploads/${settings.header_logo_path}` : `${req.appBaseUrl}/uploads/backend/images/settings/header_logo_15477661460.png`;

    const header_data = {
      author: 'localxlist.org',
      title: `Blogs | Localxlist`,
      description: `Blogs | Localxlist`,
      keywords: "Blogs | Localxlist",
      favicon: settings.favicon && fileExists(settings.favicon) ? `${req.appBaseUrl}/uploads/${settings.favicon}` : '',
      image: logo_img,

      ogType: "website",
      ogTitle: `Blogs | Localxlist`,
      ogSiteName: "localxlist.org",
      ogUrl: "https://localxlist.org/",
      ogDescription: `Blogs | Localxlist`,
      ogImage: logo_img,
      ogImageHeight: "377",

      twitterCard: "summary_large_image",
      twitterSite: "localxlist",
      twitterCreator: "localxlist",
      twitterTitle: `Blogs | Localxlist`,
      twitterDescription: `Blogs | Localxlist`,
      twitterImage: logo_img,
      generator: "localxlist.org",
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

const blogs = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { page = 1, keyword = '' } = query;

    if (!user?.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    const perPageLimit = LIMIT.ADMIN_BLOGS || 10;
    const offset = (page - 1) * perPageLimit;

    let whereClauses = [];
    let queryParams = [];

    // Keyword search
    if (keyword.trim()) {
      whereClauses.push("(title LIKE ?)");
      const searchKeyword = `%${keyword}%`;
      queryParams.push(searchKeyword);
    }

    // Construct WHERE clause dynamically
    const whereCondition = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

    // Fetch total count for pagination
    const totalRecordCount = await executeQuery(`SELECT COUNT(id) AS total_count FROM blogs ${whereCondition};`, queryParams);
    const totalRecords = totalRecordCount[0]?.total_count || 0;
    const totalPages = Math.ceil(totalRecords / perPageLimit);

    // Fetch user list
    const q = `
      SELECT blog_categories.name AS category,  blogs.id, blogs.title, blogs.slug, blogs.featured_image, blogs.excerpt, blogs.status FROM blogs LEFT JOIN blog_categories ON blog_categories.id  = blogs.category_id
      ${whereCondition}
      ORDER BY blogs.id DESC
      LIMIT ? OFFSET ?;
    `;
    queryParams.push(perPageLimit, offset);
    const getList = await getTableRecord(q, queryParams);

    getList.forEach((item, index) => {
      item.srNo = offset + (index + 1);
      item.imgFullPath = item?.featured_image && fileExists(item?.featured_image) ? `${req.appBaseUrl}/uploads/${item.featured_image}` : `${req.appBaseUrl}/uploads/${COMMON_CONFIG.admin.DEFAULT_NO_IMG}`;
      item.status = item.status == 'published' ? "Published" : "Draft";
    });

    res.json(createSuccessResponse('Data retrieved successfully.', {
      list: getList,
      pagination: { currentPage: page, totalPages, perPageLimit, totalRecords }
    }));

  } catch (error) {
    next(error);
  }
};

const blogDetail = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { id } = query;

    // Validate if the user object is available
    if (!user || !user.id || !user.username) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Check if required parameters are provided
    if (!id) {
      return res.status(400).json(createErrorResponse("Missing required parameters."));
    }
    else if (id && isNaN(id)) {
      return res.status(400).json(createErrorResponse("Invalid parameter value."));
    }

    const whereCondition = `WHERE 1=1`;
    const q = `
      SELECT 
        id, title,excerpt, content, category_id, featured_image, status FROM blogs
      ${whereCondition} AND id = ?
      ORDER BY id DESC;
    `;

    const recordDetail = await getTableRecord(q, [id], true);
    if (!recordDetail) {
      return res.status(400).json(createErrorResponse(message = "Record Not Found.", data = null, code = "RECORD_NOT_FOUND"));
    }
    recordDetail.imgFullPath = recordDetail?.featured_image && fileExists(recordDetail?.featured_image) ? `${req.appBaseUrl}/uploads/${recordDetail.featured_image}` : `${req.appBaseUrl}/uploads/${COMMON_CONFIG.admin.DEFAULT_NO_IMG}`;

    res.json(createSuccessResponse('Data retrieved successfully.', recordDetail));

  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const saveBlog = async (req, res, next) => {
  let transaction;
  let uploadedFiles = [];

  const deleteUploadedFilesWhenError = (filePaths) => {
    if (filePaths && filePaths.length > 0) {
      filePaths.forEach((filePath) => {
        console.log("Deleting:", filePath);

        fs.unlink(filePath, (err) => {
          if (err) {
            console.error(`Failed to delete file: ${filePath}`, err);
          } else {
            console.log(`File deleted: ${filePath}`);
          }
        });
      });
    }
  };

  try {
    const { user, body, file } = req;
    const { id = '', title, content, excerpt, category_id, status } = body;

    // Access uploaded file
    const imageFileName = file && file?.filename || "";
    const imageFilePath = `${UPLOADED_PATH.ADMIN_BLOG_IMAGE}/${imageFileName}`;

    // Collect file paths for deletion if needed
    uploadedFiles = [file?.path || ""].filter(Boolean);

    // Validate user session
    if (!user || !user?.id) {
      deleteUploadedFilesWhenError(uploadedFiles);
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // console.log({
    //   title, content
    // });


    // Start transaction
    transaction = await startTransaction();
    // Prepare record data
    let setRecordData = {
      title, content, excerpt, category_id, status, slug: slugify(title || ""), author_id: user?.id
    };
    if (id) {
      // Check if the record exists before updating
      const existingRecord = await getTableRecord(`SELECT id, featured_image FROM blogs WHERE id = ? LIMIT 1;`, [id], true);
      if (!existingRecord) {
        deleteUploadedFilesWhenError(uploadedFiles);
        await rollbackTransaction(transaction);
        return res.status(400).json(createErrorResponse('Record Not Found.', null, 'RECORD_NOT_FOUND'));
      }

      if (imageFileName) {
        // Delete the image file if it exists
        const oldImagePath = existingRecord.featured_image ? path.join(global.uploadsBaseDir, existingRecord.featured_image) : null;
        if (oldImagePath) {
          try {
            await fs.promises.access(oldImagePath); // Check if the logo exists
            await fs.promises.unlink(oldImagePath); // Delete the logo
          } catch (err) {
            console.error(`Error deleting image: ${existingRecord.featured_image}:`, err);
          }
        }
        // update with new
        setRecordData.featured_image = imageFileName && imageFilePath || "";
      }

      // Update the ad
      const affectedRows = await updateRecord('blogs', setRecordData, { id }, transaction);
      console.log(`Updated record affectedRows:${affectedRows}`);
    } else {
      // Insert new 
      if (!imageFileName) {
        return res.status(400).json(createValidationErrorResponse("Image is required.", []));
      }
      setRecordData.featured_image = imageFileName && imageFilePath || "";
      const recordInsertedId = await insertRecord('blogs', setRecordData, transaction);
      console.log(`Saved record Id:${recordInsertedId}`);
      setRecordData.id = recordInsertedId;
    }

    // Commit transaction
    await commitTransaction(transaction);
    res.json(createSuccessResponse('Record saved successfully.', setRecordData.id || id, 'RECORD_SAVED'));

  } catch (error) {
    deleteUploadedFilesWhenError(uploadedFiles);
    if (transaction) await rollbackTransaction(transaction);
    next(error);
  }
};

const metaDataSeo = async (req, res, next) => {
  try {

    const settings = await getSettingsData();

    // Prepare metadata for headers
    const logo_img = settings.header_logo_path && fileExists(settings.header_logo_path) ? `${req.appBaseUrl}/uploads/${settings.header_logo_path}` : `${req.appBaseUrl}/uploads/backend/images/settings/header_logo_15477661460.png`;

    const header_data = {
      author: 'localxlist.org',
      title: `Meta Data | Localxlist`,
      description: `Meta Data | Localxlist`,
      keywords: "Meta Data | Localxlist",
      favicon: settings.favicon && fileExists(settings.favicon) ? `${req.appBaseUrl}/uploads/${settings.favicon}` : '',
      image: logo_img,

      ogType: "website",
      ogTitle: `Meta Data | Localxlist`,
      ogSiteName: "localxlist.org",
      ogUrl: "https://localxlist.org/",
      ogDescription: `Meta Data | Localxlist`,
      ogImage: logo_img,
      ogImageHeight: "377",

      twitterCard: "summary_large_image",
      twitterSite: "localxlist",
      twitterCreator: "localxlist",
      twitterTitle: `Meta Data | Localxlist`,
      twitterDescription: `Meta Data | Localxlist`,
      twitterImage: logo_img,
      generator: "localxlist.org",
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

const metaDatas = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { page = 1, keyword = '', is_default = '' } = query;

    if (!user?.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    const perPageLimit = LIMIT.ADMIN_METADATAS || 10;
    const offset = (page - 1) * perPageLimit;

    let whereClauses = [];
    let queryParams = [];

    // Keyword search
    if (keyword.trim()) {
      whereClauses.push("(page_meta.title LIKE ?)");
      const searchKeyword = `%${keyword}%`;
      queryParams.push(searchKeyword);
    }

    // Is Default Meta Data
    if (is_default.trim()) {
      whereClauses.push("(page_meta.is_default = ?)");
      const isDefault = parseInt(is_default);
      queryParams.push(isDefault);
    }

    // Construct WHERE clause dynamically
    const whereCondition = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

    // Fetch total count for pagination
    const totalRecordCount = await executeQuery(`SELECT COUNT(page_meta.id) AS total_count FROM page_meta  LEFT JOIN country ON country.id = page_meta.country_id
    LEFT JOIN city ON city.id = page_meta.city_id
    LEFT JOIN subcity ON subcity.id = page_meta.subcity_id
    LEFT JOIN category ON category.id = page_meta.category_id
    LEFT JOIN subcategory ON subcategory.id = page_meta.subcategory_id ${whereCondition};`, queryParams);
    const totalRecords = totalRecordCount[0]?.total_count || 0;
    const totalPages = Math.ceil(totalRecords / perPageLimit);

    // Fetch list
    const q = `SELECT page_meta.id, page_meta.page_type, page_meta.is_default, page_meta.page_heading, page_meta.title, 
    page_meta.description, 
    country.country,  
    city.city, 
    subcity.subcity, 
    category.category, 
    subcategory.subcategory FROM page_meta 
    LEFT JOIN country ON country.id = page_meta.country_id
    LEFT JOIN city ON city.id = page_meta.city_id
    LEFT JOIN subcity ON subcity.id = page_meta.subcity_id
    LEFT JOIN category ON category.id = page_meta.category_id
    LEFT JOIN subcategory ON subcategory.id = page_meta.subcategory_id      
     ${whereCondition} ORDER BY page_meta.id DESC LIMIT ? OFFSET ?;`;
    queryParams.push(perPageLimit, offset);
    const getList = await getTableRecord(q, queryParams);

    getList.forEach((item, index) => {
      item.srNo = offset + (index + 1);
      // item.imgFullPath = item?.featured_image && fileExists(item?.featured_image) ? `${req.appBaseUrl}/uploads/${item.featured_image}` : `${req.appBaseUrl}/uploads/${COMMON_CONFIG.admin.DEFAULT_NO_IMG}`;
    });

    res.json(createSuccessResponse('Data retrieved successfully.', {
      list: getList,
      pagination: { currentPage: page, totalPages, perPageLimit, totalRecords }
    }));

  } catch (error) {
    next(error);
  }
};

const metaDataDetail = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { id = '', is_default = '', byPage = '' } = query;

    // Validate if the user object is available
    if (!user || !user.id || !user.username) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Check if required parameters are provided
    if (!id && !byPage) {
      return res.status(400).json(createErrorResponse("Missing required parameters."));
    }
    else if (id && isNaN(id)) {
      return res.status(400).json(createErrorResponse("Invalid parameter value."));
    }

    let whereClauses = [];
    let queryParams = [];

    if (id) {
      whereClauses.push("(id = ?)");
      queryParams.push(id);
    }

    // Is Default Meta Data
    if (is_default.trim()) {
      whereClauses.push("(is_default = ?)");
      const isDefault = parseInt(is_default);
      queryParams.push(isDefault);
    }

    // By Page Type
    if (byPage.trim()) {
      whereClauses.push("(page_type = ?)");
      queryParams.push(byPage);
    }

    // Construct WHERE clause dynamically
    const whereCondition = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const selectNoneDefaultFiels = is_default && parseInt(is_default) == 1 ? ',' : ', country_id, city_id, subcity_id, category_id, subcategory_id ,';


    const q = `SELECT id, page_type, is_default ${selectNoneDefaultFiels} page_heading, title, description, keywords, canonical_url, robots, og_title, og_description, og_image, og_image_height, og_image_width, og_site_name, og_type, og_url, twitter_url, twitter_site, twitter_card, twitter_creator, twitter_title, twitter_description, twitter_image, author, generator FROM page_meta ${whereCondition} ORDER BY id DESC;`;

    const recordDetail = await getTableRecord(q, queryParams, true);
    if (!recordDetail) {
      return res.status(400).json(createErrorResponse(message = "Record Not Found.", data = null, code = "RECORD_NOT_FOUND"));
    }
    res.json(createSuccessResponse('Data retrieved successfully.', recordDetail));

  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const saveMetaData = async (req, res, next) => {
  let transaction;
  let uploadedFiles = [];

  const deleteUploadedFilesWhenError = (filePaths) => {
    if (filePaths && filePaths.length > 0) {
      filePaths.forEach((filePath) => {
        console.log("Deleting:", filePath);

        fs.unlink(filePath, (err) => {
          if (err) {
            console.error(`Failed to delete file: ${filePath}`, err);
          } else {
            console.log(`File deleted: ${filePath}`);
          }
        });
      });
    }
  };

  try {
    const { user, body, file } = req;
    const {
      id = "",
      page_type = "",
      category_dropdown = "",
      location_dropdown = "",
      country_id = "",
      city_id = "",
      subcity_id = "",
      category_id = "",
      subcategory_id = "",
      page_heading = "",
      title = "",
      description = "",
      keywords = "",
      canonical_url = "",
      robots = "",
      og_title = "",
      og_description = "",
      og_image = "",
      og_image_height = "",
      og_image_width = "",
      og_site_name = "",
      og_type = "",
      og_url = "",
      twitter_url = "",
      twitter_site = "",
      twitter_card = "",
      twitter_creator = "",
      twitter_title = "",
      twitter_description = "",
      twitter_image = "",
      author = "",
      generator = "",
      is_default = ""
    } = body;

    // Validate user session
    if (!user || !user?.id) {
      deleteUploadedFilesWhenError(uploadedFiles);
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // ====================== Default Meta Data Logic =====================
    if (is_default === 1) {
      // Start transaction
      transaction = await startTransaction();
      // Prepare record data
      let setRecordData = {
        page_type,
        country_id,
        city_id,
        subcity_id,
        category_id,
        subcategory_id,
        page_heading,
        title,
        description,
        keywords,
        canonical_url,
        robots,
        og_title,
        og_description,
        og_image,
        og_image_height,
        og_image_width,
        og_site_name,
        og_type,
        og_url,
        twitter_url,
        twitter_site,
        twitter_card,
        twitter_creator,
        twitter_title,
        twitter_description,
        twitter_image,
        author,
        generator,
        is_default
      };
      if (id) {
        // Check if the record exists before updating
        const existingRecord = await getTableRecord(`SELECT id FROM page_meta WHERE id = ? LIMIT 1;`, [id], true);
        if (!existingRecord) {
          deleteUploadedFilesWhenError(uploadedFiles);
          await rollbackTransaction(transaction);
          return res.status(400).json(createErrorResponse('Record Not Found.', null, 'RECORD_NOT_FOUND'));
        }

        // Update the record
        const affectedRows = await updateRecord('page_meta', setRecordData, { id }, transaction);
        console.log(`Updated record affectedRows:${affectedRows}`);
      } else {
        // Insert new 
        const recordInsertedId = await insertRecord('page_meta', setRecordData, transaction);
        console.log(`Saved record Id:${recordInsertedId}`);
        setRecordData.id = recordInsertedId;
      }
      // Commit transaction
      await commitTransaction(transaction);
      return res.json(createSuccessResponse('Record saved successfully.', setRecordData.id || id, 'RECORD_SAVED'));
    }
    // ====================== Page Meta Data Logic =====================
    if (is_default === 0) {
      // Start transaction
      transaction = await startTransaction();

      const countryIds = (country_id?.toString() || "").split(",").map(s => s.trim()).filter(Boolean);
      const cityIds = (city_id?.toString() || "").split(",").map(s => s.trim()).filter(Boolean);
      const subCityIds = (subcity_id?.toString() || "").split(",").map(s => s.trim()).filter(Boolean);
      const categoryIds = (category_id?.toString() || "").split(",").map(s => s.trim()).filter(Boolean);
      const subCategoryIds = (subcategory_id?.toString() || "").split(",").map(s => s.trim()).filter(Boolean);


      // Fetch related data - subCityData is always needed, subCategoryData is optional
      const [subCityData, subCategoryData] = await Promise.all([
        subCityIds.length > 0 ? getTableRecord(
          'SELECT id, country AS countryId, city AS cityId, subcity FROM subcity WHERE id IN (?) AND city IN (?);',
          [subCityIds, cityIds]
        ) : Promise.resolve([]),
        subCategoryIds.length > 0 ? getTableRecord(
          'SELECT id, category AS categoryId, subcategory FROM subcategory WHERE id IN (?) AND category IN (?);',
          [subCategoryIds, categoryIds]
        ) : Promise.resolve([])
      ]);

      if (location_dropdown === true && !subCityData.length) {
        return res.status(400).json(createErrorResponse('Invalid sub city data.'));
      }

      if (category_dropdown === true && !subCategoryData.length) {
        return res.status(400).json(createErrorResponse('Invalid sub category data.'));
      }

      // **Step 1: Check for Duplicates Before Transaction**
      const duplicateCheckMap = new Map();

      // Case 1: Both subCity and subCategory data exists
      if (subcity_id && subcategory_id && subCategoryData.length > 0) {

        // **Step 2: Proceed with Insert/Update Only if No Duplicates Were Found**
        for (const subCity of subCityData) {
          for (const subCategory of subCategoryData) {
            const key = `${subCity.id}_${subCategory.id}`;

            if (!duplicateCheckMap.has(key)) {
              const existingPageMeta = await getTableRecord(
                `SELECT id FROM page_meta WHERE subcity_id = ? AND subcategory_id = ? AND page_type = ? AND is_default = ? LIMIT 1;`,
                [subCity.id, subCategory.id, page_type, 0],
                true
              );

              if (existingPageMeta && (!id || existingPageMeta.id !== id)) {
                return res.status(400).json(createErrorResponse(
                  `Duplicate record found for SubCity: ${subCity.subcity} and SubCategory: ${subCategory.subcategory}.`,
                  null,
                  'DUPLICATE_RECORD'
                ));
              }

              duplicateCheckMap.set(key, existingPageMeta);
            }
          }
        }

        for (const subCity of subCityData) {
          for (const subCategory of subCategoryData) {
            const key = `${subCity.id}_${subCategory.id}`;
            const existingRecord = duplicateCheckMap.get(key);

            let setRecordData = {
              page_type,
              country_id: subCity.countryId,
              city_id: subCity.cityId,
              subcity_id: subCity.id,
              category_id: subCategory.categoryId,
              subcategory_id: subCategory.id,
              page_heading,
              title,
              description,
              keywords,
              canonical_url,
              robots,
              og_title,
              og_description,
              og_image,
              og_image_height,
              og_image_width,
              og_site_name,
              og_type,
              og_url,
              twitter_url,
              twitter_site,
              twitter_card,
              twitter_creator,
              twitter_title,
              twitter_description,
              twitter_image,
              author,
              generator,
              is_default
            };

            if (id) {
              // Ensure the record exists before updating
              const singleDetail = await getTableRecord(`SELECT id FROM page_meta WHERE id = ? LIMIT 1;`, [id], true);
              if (!singleDetail) {
                await rollbackTransaction(transaction);
                return res.status(400).json(createErrorResponse('Record Not Found.', null, 'RECORD_NOT_FOUND'));
              }

              if (existingRecord?.id === id) {
                await updateRecord('page_meta', setRecordData, { id }, transaction);
              } else {
                await insertRecord('page_meta', setRecordData, transaction);
              }
            } else {
              await insertRecord('page_meta', setRecordData, transaction);
            }
          }
        }
      } else if (subcity_id && subCityData.length > 0) {
        // Case 2: Only subCity data exists
        // **Step 2: Proceed with Insert/Update Only if No Duplicates Were Found**

        for (const subCity of subCityData) {
          const key = `${subCity.id}`;

          if (!duplicateCheckMap.has(key)) {
            const existingPageMeta = await getTableRecord(
              `SELECT id FROM page_meta WHERE subcity_id = ? AND page_type = ? AND is_default = ? LIMIT 1;`,
              [subCity.id, page_type, 0],
              true
            );

            if (existingPageMeta && (!id || existingPageMeta.id !== id)) {
              return res.status(400).json(createErrorResponse(
                `Duplicate record found for SubCity: ${subCity.subcity}.`,
                null,
                'DUPLICATE_RECORD'
              ));
            }
            duplicateCheckMap.set(key, existingPageMeta);
          }
        }

        for (const subCity of subCityData) {
          const key = `${subCity.id}`;
          const existingRecord = duplicateCheckMap.get(key);

          let setRecordData = {
            page_type,
            country_id: subCity.countryId,
            city_id: subCity.cityId,
            subcity_id: subCity.id,
            page_heading,
            title,
            description,
            keywords,
            canonical_url,
            robots,
            og_title,
            og_description,
            og_image,
            og_image_height,
            og_image_width,
            og_site_name,
            og_type,
            og_url,
            twitter_url,
            twitter_site,
            twitter_card,
            twitter_creator,
            twitter_title,
            twitter_description,
            twitter_image,
            author,
            generator,
            is_default
          };

          if (id) {
            // Ensure the record exists before updating
            const singleDetail = await getTableRecord(`SELECT id FROM page_meta WHERE id = ? LIMIT 1;`, [id], true);
            if (!singleDetail) {
              await rollbackTransaction(transaction);
              return res.status(400).json(createErrorResponse('Record Not Found.', null, 'RECORD_NOT_FOUND'));
            }

            if (existingRecord?.id === id) {
              await updateRecord('page_meta', setRecordData, { id }, transaction);
            } else {
              await insertRecord('page_meta', setRecordData, transaction);
            }
          } else {
            await insertRecord('page_meta', setRecordData, transaction);
          }
        }
      } else {
        // Without any kind of drop down
        // Prepare record data
        let setRecordData = {
          page_type,
          country_id,
          city_id,
          subcity_id,
          category_id,
          subcategory_id,
          page_heading,
          title,
          description,
          keywords,
          canonical_url,
          robots,
          og_title,
          og_description,
          og_image,
          og_image_height,
          og_image_width,
          og_site_name,
          og_type,
          og_url,
          twitter_url,
          twitter_site,
          twitter_card,
          twitter_creator,
          twitter_title,
          twitter_description,
          twitter_image,
          author,
          generator,
          is_default
        };
        if (id) {
          // Check if the record exists before updating
          const existingRecord = await getTableRecord(`SELECT id FROM page_meta WHERE id = ? LIMIT 1;`, [id], true);
          if (!existingRecord) {
            deleteUploadedFilesWhenError(uploadedFiles);
            await rollbackTransaction(transaction);
            return res.status(400).json(createErrorResponse('Record Not Found.', null, 'RECORD_NOT_FOUND'));
          }

          // Update the record
          const affectedRows = await updateRecord('page_meta', setRecordData, { id }, transaction);
          console.log(`Updated record affectedRows:${affectedRows}`);
        } else {
          // Insert new 
          const recordInsertedId = await insertRecord('page_meta', setRecordData, transaction);
          console.log(`Saved record Id:${recordInsertedId}`);
        }
      }

      // **Step 3: Commit Transaction (Only If Everything is Fine)**
      await commitTransaction(transaction);
      return res.json(createSuccessResponse('Record saved successfully.', null, 'RECORD_SAVED'));
    }

  } catch (error) {
    deleteUploadedFilesWhenError(uploadedFiles);
    if (transaction) await rollbackTransaction(transaction);
    next(error);
  }
};

module.exports = {
  loginSeo,
  login,

  // Top Navigation (Notifications)
  notificationsSeo,
  notices,
  noticeDetail,
  notifications,
  notificationAdd,

  // Top Navigation (Messages)
  messagesSeo,
  messages,
  messageDetail,
  sendReplyToMessage,

  // Users
  usersSeo,
  users,
  userDetail,
  userAllPost,

  // Site Links
  linkRequestsSeo,
  linkRequests,
  linkRequestDetail,
  siteLinksAdded,
  addSiteLink,
  siteLinkEdit,

  // Dashboard
  dashboardSeo,
  dashboard,

  // Admin Profile
  profile,
  profilesSeo,
  allProfile,
  profileDetail,
  profileSave,

  // Posts
  postsSeo,
  posts,
  postDetail,

  // Country
  countriesSeo,
  countries,
  countryDetail,
  countrySave,

  // City
  citiesSeo,
  cities,
  cityDetail,
  citySave,

  // Sub City
  subCitiesSeo,
  subCities,
  subCityDetail,
  subCitySave,

  // Category
  categoriesSeo,
  categories,
  categoryDetail,
  categorySave,

  // Sub Category
  subCategoriesSeo,
  subCategories,
  subCategoryDetail,
  subCategorySave,

  // Ad Manager
  adsSeo,
  ads,
  adDetail,
  adSave,

  // Slider Ads
  sliderAdsSeo,
  sliderAds,
  sliderAdsDetail,
  sliderAdsSave,

  // Post Ads
  postAdsSeo,
  postAds,
  postAdsDetail,
  postAdsSave,

  // New Post Ads
  newPostAdsSeo,
  newPostAds,
  newPostAdsDetail,
  newPostAdsSave,

  // Category-Post Ads
  categoryOrPostAdsSeo,
  categoryOrPostAds,
  categoryOrPostAdsDetail,
  categoryOrPostAdsSave,

  // Google Ads
  googleAdsSeo,
  googleAds,
  googleAdsDetail,
  googleAdsSave,

  // Terms Condition
  termsSeo,
  terms,
  termsDetail,
  termsSave,

  // Multi Posts
  multiPostsSeo,
  multiPosts,
  multiPostDetail,
  multiPostSave,

  // About
  aboutSeo,
  aboutList,
  aboutDetail,
  aboutSave,

  // Home Page Notice
  homePageNoticeSeo,
  homePageNotices,
  homePageNoticeDetail,
  homePageNoticeSave,

  // Alert Message
  alertMessageSeo,
  alertMessages,
  alertMessageDetail,
  alertMessageSave,

  // Dashboard Content
  dashboardContentSeo,
  dashboardContentDetail,
  dashboardContentSave,

  // Post Reports
  postReportSeo,
  postReports,
  postReportDetail,

  // Featured Packages
  featuredPackagesSeo,
  featuredPackages,
  featuredPackageDetail,
  featuredPackageSave,

  // Extended Packages
  extendedPackagesSeo,
  extendedPackages,
  extendedPackageDetail,
  extendedPackageSave,

  // Side Bar Nav Links
  navLinkSeo,
  navLinks,
  navLinkDetail,
  navLinkSave,

  footerLinkSeo,
  footerLinks,
  footerLinkDetail,
  footerLinkSave,

  // SubCity Content
  subCityContentSeo,
  subCityContents,
  subCityContentDetail,
  subCityContentSave,

  // SubCategory Content
  subCategoryContentSeo,
  subCategoryContents,
  subCategoryContentDetail,
  subCategoryContentSave,

  // SiteLink Category
  siteLinkCategorySeo,
  siteLinkCategories,
  siteLinkCategoryDetail,
  siteLinkCategorySave,

  // Sponsered Links
  sponseredLinkSeo,
  sponseredLinks,
  sponseredLinkDetail,
  sponseredLinkSave,

  // Friends Links
  friendLinkSeo,
  friendLinks,
  friendLinkDetail,
  friendLinkSave,

  // Settings
  siteSettingsSeo,
  siteSettingsDetail,
  siteSettingsSave,

  // Email SMTP
  smtpSeo,
  smtpDetail,
  smtpSave,

  // Manual Payment Method
  maunalPaymentMethodSeo,
  maunalPaymentMethods,
  maunalPaymentMethodDetail,
  maunalPaymentMethodSave,

  // Manual Payment Request
  maunalPaymentRequestSeo,
  maunalPaymentRequests,
  maunalPaymentRequestDetail,
  savePaymentRequestReason,

  // Video Collection
  videoUploadSeo,
  videoUploads,
  videoUploadDetail,
  videoUploadSave,

  moduleSeo,
  allModules,
  modulePermissions,
  modulePermissionsDetail,
  saveModulePermission,

  blogCategoriesSeo,
  blogCategories,
  blogCategoryDetail,
  blogCategorySave,

  blogsSeo,
  blogs,
  blogDetail,
  saveBlog,

  // Meta Data
  metaDataSeo,
  metaDatas,
  metaDataDetail,
  saveMetaData,

  performAction,

};
