const { LIMIT } = require('../constants');
const {
  executeQuery,
} = require('../utils/dbUtils');

const { fileExists } = require('../utils/generalUtils');

const getSettingsData = async () => {
  try {
    const settings = await executeQuery('SELECT * FROM settings WHERE id = 1;');
    return settings[0] || "";
  } catch (error) {
    throw new Error(`Failed to fetch settings data: ${error.message}`);
  }
};

const getHomeDashboardData = async () => {
  try {
    const dashboardContent = await executeQuery('SELECT * FROM dashboard_content WHERE id = 1;');
    const dashboardContentData = dashboardContent[0] || "";
    return (dashboardContentData?.show_hide === 1) ? dashboardContentData?.content : "";
  } catch (error) {
    throw new Error(`Failed to fetch home dashboard data: ${error.message}`);
  }
};


const getHomeTopNoticeData = async () => {
  try {
    const homePageNoticeData = await executeQuery('SELECT * FROM home_page_notice WHERE id = 1;');
    return homePageNoticeData[0]?.description || "";
  } catch (error) {
    throw new Error(`Failed to fetch home top notice data: ${error.message}`);

  }
};

const getHomePartnersList = async (req) => {
  try {
    const settings = await getSettingsData();
    if (settings?.home_our_directory === 1) {
      const homePartnersList = await executeQuery(`
        SELECT slc.id, slc.category
        FROM sites_link_category slc
        JOIN (
          SELECT category_id, MAX(updated_at) AS latest_updated
          FROM site_link
          GROUP BY category_id
        ) AS latest_links ON slc.id = latest_links.category_id
        JOIN site_link sl ON slc.id = sl.category_id
        GROUP BY slc.id, slc.category
        HAVING COUNT(sl.id) > 0
        ORDER BY latest_links.latest_updated DESC
        LIMIT 5;
      `);

      const homePartnersListWithSubCat = await Promise.all(homePartnersList.map(async (category) => {
        const siteLinks = await executeQuery(`
          SELECT id, title, logo, url
          FROM site_link
          WHERE category_id = ?
          ORDER BY updated_at DESC
          LIMIT 5;
        `, [category.id]);

        const allSiteLinks = await Promise.all(siteLinks.map((site) => {
          const siteLogo = site?.logo && fileExists(site?.logo || "");
          return {
            ...site,
            logo: siteLogo && `${req.appBaseUrl}/uploads/${site?.logo}` || `${req.appBaseUrl}/uploads/frontend/images/no-image.png`
          }
        }));
        return {
          ...category,
          siteLinks: allSiteLinks,
        };
      }));

      return homePartnersListWithSubCat;
    }
    return [];
  } catch (error) {
    // Include both a custom message and the original error
    throw new Error(`Failed to fetch home partners list: ${error.message}`);
  }
};

const getSponsersListWithHeading = async (isDesktop = '') => {
  try {
    const settings = await getSettingsData();

    const LIMIT_DESKTOP_QUERY = settings?.sponsored_links_desktop
      ? `LIMIT ${settings.sponsored_links_desktop}`
      : '';
    const LIMIT_MOBILE_QUERY = settings?.sponsored_links_mobile
      ? `LIMIT ${settings.sponsored_links_mobile}`
      : '';

    let limitQuery = '';
    if (isDesktop === true) {
      limitQuery = LIMIT_DESKTOP_QUERY;
    } else if (isDesktop === false) {
      limitQuery = LIMIT_MOBILE_QUERY;
    }

    const homeSponsersList = await executeQuery(`
      SELECT id, title, url, text 
      FROM sponsors_links
      ORDER BY sort_order ASC ${limitQuery};`);

    return settings?.sponsored_links === 1
      ? {
        heading: settings?.sponsored_heading || "",
        data: homeSponsersList || [],
      }
      : { heading: "", data: [] };

  } catch (error) {
    console.error(`Error fetching sponsors data: ${error.message}`);
    throw new Error("Failed to fetch home sponsors data");
  }
};


const getCountryDetail = async (country) => {
  try {
    const data = await executeQuery('SELECT * FROM country WHERE country = ?;', [country]);
    return data[0] || "";
  } catch (error) {
    throw new Error(`Failed to fetch country data: ${error.message}`);
  }
};

const getCityDetail = async (city, countryId) => {
  try {
    const data = await executeQuery('SELECT * FROM city WHERE city = ? AND country = ?;', [city, countryId]);
    return data[0] || "";
  } catch (error) {
    throw new Error(`Failed to fetch city data: ${error.message}`);
  }
};

const getSubCityDetail = async (subCity, cityId) => {
  try {
    const data = await executeQuery('SELECT * FROM subcity WHERE subcity = ? AND city = ?;', [subCity, cityId]);
    return data[0] || "";
  } catch (error) {
    throw new Error(`Failed to fetch sub city data: ${error.message}`);
  }
};

const getSubCityList = async (countryId, cityId) => {
  try {
    const data = await executeQuery('SELECT id, subcity FROM subcity WHERE country = ? AND city = ? ORDER BY subcity ASC;', [countryId, cityId]);
    return data || "";
  } catch (error) {
    throw new Error(`Failed to fetch sub city list: ${error.message}`);
  }
};

const getSubCityContent = async (subCityId) => {
  try {
    const data = await executeQuery('SELECT * FROM subcity_content WHERE subcity_id = ?;', [subCityId]);
    return data[0]?.content || "";
  } catch (error) {
    throw new Error(`Failed to fetch sub city content data: ${error.message}`);
  }
};

const getCategoryDetail = async (category) => {
  try {
    const data = await executeQuery('SELECT * FROM category WHERE category = ?;', [category]);
    return data[0] || "";
  } catch (error) {
    throw new Error(`Failed to fetch category data: ${error.message}`);
  }
};


const getCategoryList = async () => {
  try {
    const data = await executeQuery('SELECT id, category FROM category ORDER BY category ASC;', []);
    return data || "";
  } catch (error) {
    throw new Error(`Failed to fetch category list: ${error.message}`);
  }
};

const getSubCategoryDetail = async (subCategory) => {
  try {
    const data = await executeQuery('SELECT * FROM subcategory WHERE subcategory = ?;', [subCategory]);
    return data[0] || "";
  } catch (error) {
    throw new Error(`Failed to fetch sub category data: ${error.message}`);
  }
};

const getSubCategoryList = async (categoryId) => {
  try {
    const data = await executeQuery('SELECT id, subcategory FROM subcategory WHERE category = ? ORDER BY subcategory ASC;', [categoryId]);
    return data || "";
  } catch (error) {
    throw new Error(`Failed to fetch sub category list: ${error.message}`);
  }
};

const getSubCategoryContentDetail = async (subCategoryId, subCityId) => {
  try {
    const data = await executeQuery('SELECT * FROM subcategory_content WHERE subcategory_id = ? AND subcity_id = ?;', [subCategoryId, subCityId]);
    return data[0] || "";
  } catch (error) {
    throw new Error(`Failed to fetch sub category content data: ${error.message}`);
  }
};


const getSinglePostImage = async (req, postImageId) => {
  try {
    const data = await executeQuery('SELECT id, path, CONCAT(?, path) AS fullpath FROM post_img_table WHERE img_id = ? ORDER BY id ASC LIMIT 1;', [req.appBaseUrl + '/uploads/', postImageId]);
    return data[0] || "";
  } catch (error) {
    throw new Error(`Failed to fetch single post image: ${error.message}`);
  }
};

const getPostImages = async (req, postImageId) => {
  try {
    const data = await executeQuery('SELECT id, path, CONCAT(?, path) AS fullpath FROM post_img_table WHERE img_id = ? ORDER BY id ASC;', [req.appBaseUrl + '/uploads/', postImageId]);
    return data || "";
  } catch (error) {
    throw new Error(`Failed to fetch all post images: ${error.message}`);
  }
};

const getSliderAds = async (req, type = 'left') => {
  try {
    const data = await executeQuery(`SELECT *, CONCAT( ? , img) AS img FROM slider_ad WHERE type = ? AND status = ? ORDER BY RAND();`, [`${req.appBaseUrl}/uploads/`, type, 1]);
    return data || "";
  } catch (error) {
    throw new Error(`Failed to fetch slider ads ${type} data: ${error.message}`);
  }
};

const getPosts = async (wherePostCondition, searchParams, perPageLimit, offset) => {
  try {
    const data = await executeQuery(`
      SELECT id, title, date, img_id, 
      CASE WHEN featured_end_date > '0000-00-00 00:00:00' THEN 1 ELSE 0 END AS featured_post,
      -- Post Expired Flag
        CASE 
            WHEN post_delete_date IS NOT NULL AND post_delete_date < NOW() THEN 1
            ELSE 0
        END AS is_expired,

        -- Expired DateTime
        post_delete_date AS expired_at
 
      FROM post ${wherePostCondition}
      ORDER BY featured_post DESC, date DESC 
      LIMIT ? OFFSET ?;`,
      [...searchParams, perPageLimit, offset]
    );

    return data || "";
  } catch (error) {
    throw new Error(`Failed to fetch post list: ${error.message}`);
  }
};

const getNewPostAds = async (limit, offset) => {
  try {
    const data = await executeQuery(`SELECT * FROM new_post_ads LIMIT ? OFFSET ?;`,
      [limit, offset]
    );
    return data || "";
  } catch (error) {
    throw new Error(`Failed to fetch new post ads: ${error.message}`);
  }
};

const getPostAds = async (limit, offset) => {
  try {
    const data = await executeQuery(`SELECT * FROM post_ads WHERE status = 1 ORDER BY id DESC LIMIT ? OFFSET ?;`,
      [limit, offset]
    );
    return data || "";
  } catch (error) {
    throw new Error(`Failed to fetch post ads: ${error.message}`);
  }
};

const getGoogleAds = async (limit, offset) => {
  try {
    const data = await executeQuery(`SELECT * FROM google_ads WHERE status = 1 ORDER BY id DESC LIMIT ? OFFSET ?;`,
      [limit, offset]
    );
    return data || "";
  } catch (error) {
    throw new Error(`Failed to fetch post ads: ${error.message}`);
  }
};

const getCategoryPostAds = async (req, adType = 'category') => {
  try {
    const data = await executeQuery('SELECT *, CONCAT(?, path) AS path FROM cat_post_ads WHERE ads_type = ? AND active_yn = ?;', [req.appBaseUrl + '/uploads/', adType, "Y"]);
    return data || "";
  } catch (error) {
    throw new Error(`Failed to fetch category post ads data: ${error.message}`);

  }
};

const getAds = async (req) => {
  try {
    const data = await executeQuery('SELECT *, CONCAT(?, path) AS path FROM ad where status = 1;', [req.appBaseUrl + '/uploads/']);
    return data || "";
  } catch (error) {
    throw new Error(`Failed to fetch post ads data: ${error.message}`);

  }
};

const getAlertMessage = async (pType = 'POST') => {
  try {
    const data = await executeQuery('SELECT * FROM alert_msg WHERE v_status = ? AND p_type = ?;', [1, pType]);
    return data[0] || "";
  } catch (error) {
    throw new Error(`Failed to fetch alert message data: ${error.message}`);

  }
};

const getTopSideNavLinks = async () => {
  try {
    const data = await executeQuery('SELECT * FROM link_list;');
    return data || "";
  } catch (error) {
    throw new Error(`Failed to fetch top side nav: ${error.message}`);
  }
};

const getCategoryAgeVerificationModalContent = async () => {
  try {
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
    return ageVerificationRulesModalData || "";
  } catch (error) {
    throw new Error(`Failed to fetch Category Age Verification Modal Content: ${error.message}`);

  }
};

const getPartnersList = async (req) => {
  try {
    const settings = await getSettingsData();
    if (settings?.home_our_directory === 1) {
      const partnersList = await executeQuery(`
        SELECT slc.id, slc.category
        FROM sites_link_category slc
        JOIN (
          SELECT category_id, MAX(updated_at) AS latest_updated
          FROM site_link
          GROUP BY category_id
        ) AS latest_links ON slc.id = latest_links.category_id
        JOIN site_link sl ON slc.id = sl.category_id
        GROUP BY slc.id, slc.category
        HAVING COUNT(sl.id) > 0
        ORDER BY latest_links.latest_updated DESC;
      `);

      const partnersListWithSubCat = await Promise.all(partnersList.map(async (category) => {
        const siteLinks = await executeQuery(`
          SELECT id, title, logo, url
          FROM site_link
          WHERE category_id = ?
          ORDER BY updated_at DESC;
        `, [category.id]);


        const allSiteLinks = await Promise.all(siteLinks.map((site) => {
          const siteLogo = site?.logo && fileExists(site?.logo || "");
          return {
            ...site,
            logo: siteLogo && `${req.appBaseUrl}/uploads/${site?.logo}` || `${req.appBaseUrl}/uploads/frontend/images/no-image.png`
          }
        }));

        return {
          ...category,
          siteLinks: allSiteLinks,
        };
      }));

      return partnersListWithSubCat;
    }
    return [];
  } catch (error) {
    // Include both a custom message and the original error
    throw new Error(`Failed to fetch partners list: ${error.message}`);
  }
};

const getPartnersListByCategory = async (req, category) => {
  try {
    const siteLinks = await executeQuery(`
        SELECT id, title, logo, url, image
        FROM site_link
        WHERE category_id = ?
        ORDER BY updated_at DESC;
      `, [category?.id]);

    const allSiteLinks = await Promise.all(siteLinks.map((site) => {
      const siteLogo = site?.logo && fileExists(site?.logo || "");
      return {
        ...site,
        category_id: category?.id || "",
        category_name: category?.category || "",
        logo: siteLogo && `${req.appBaseUrl}/uploads/${site?.logo}` || `${req.appBaseUrl}/uploads/frontend/images/no-image.png`,
        image: site?.image && fileExists(site?.image || "") && `${req.appBaseUrl}/uploads/${site?.image}` || `${req.appBaseUrl}/uploads/frontend/images/no-image.png`,
      }
    }));
    return allSiteLinks || [];
  } catch (error) {
    // Include both a custom message and the original error
    throw new Error(`Failed to fetch partners list by category: ${error.message}`);
  }
};

const getPostWithPrevAndNext = async (whereCondition, postId) => {
  try {
    const query = `
      SELECT 
        id, 
        title, 
        description, 
        date, 
        email, 
        phone, 
        location, 
        sexual_oriantation, 
        sex, 
        age, 
        img_id,
        CASE WHEN featured_end_date > '0000-00-00 00:00:00' THEN 1 ELSE 0 END AS featured_post,
        
        -- Previous post details
        (SELECT id 
         FROM post 
          ${whereCondition} AND id > ?
         ORDER BY 
          (CASE WHEN featured_end_date > '0000-00-00 00:00:00' THEN 1 ELSE 0 END) ASC, 
          date ASC 
         LIMIT 1) AS prev_post_id,
         
        (SELECT title 
         FROM post 
         ${whereCondition} AND id > ?
         ORDER BY 
          (CASE WHEN featured_end_date > '0000-00-00 00:00:00' THEN 1 ELSE 0 END) ASC, 
          date ASC 
         LIMIT 1) AS prev_post_title,
         
        -- Next post details
        (SELECT id 
         FROM post 
         ${whereCondition} AND id < ?
         ORDER BY 
          (CASE WHEN featured_end_date > '0000-00-00 00:00:00' THEN 1 ELSE 0 END) DESC, 
          date DESC 
         LIMIT 1) AS next_post_id,
         
        (SELECT title 
         FROM post 
         ${whereCondition} AND id < ?
         ORDER BY 
          (CASE WHEN featured_end_date > '0000-00-00 00:00:00' THEN 1 ELSE 0 END) DESC, 
          date DESC 
         LIMIT 1) AS next_post_title
        
      FROM post
      ${whereCondition} AND id = ?
      ORDER BY featured_post DESC, date DESC;
    `;

    // Bind `postId` multiple times as it is reused in subqueries
    const params = [postId, postId, postId, postId, postId];
    const data = await executeQuery(query, params);

    return data[0] || "";
  } catch (error) {
    throw new Error(`Failed to fetch post detail: ${error.message}`);
  }
};


const updatePostVisitorCounter = async (req, post) => {
  try {
    const userIp = req.ip; // Get the user's IP address
    let ipArray = post.ip ? JSON.parse(post.ip) : []; // Parse the IP array
    let visitorsCount = post.visitors_count || 0;

    // Check if IP is already recorded
    if (!ipArray.includes(userIp)) {
      ipArray.push(userIp); // Add the new IP
      visitorsCount += 1;  // Increment the visitors count
      // Update the database
      await executeQuery('UPDATE post SET ip = ?, visitors_count = ? WHERE id = ?;', [JSON.stringify(ipArray), visitorsCount, post.id]);
      return true;
    }
    return false;
  } catch (error) {
    throw new Error(`Failed to fetch single post image: ${error.message}`);
  }
};

const updateSiteVisitorCounter = async (req) => {
  try {
    const userIp = req.ip; // Get the user's IP address

    // Get Today's Visitor Count
    const today_visitors = await getTableRecord(`SELECT id, count, ip FROM visitors WHERE DATE(date) = CURDATE() LIMIT 1;`, [], true);
    let ipArray = JSON.parse(today_visitors?.ip || '[]'); // Parse the IP array
    let visitorsCount = today_visitors?.count || 0;

    // Check if IP is already recorded
    if (!ipArray.includes(userIp)) {
      ipArray.push(userIp); // Add the new IP
      visitorsCount += 1;  // Increment the visitors count
      // Update the database
      await executeQuery('UPDATE visitors SET ip = ?, count = ? WHERE id = ?;', [JSON.stringify(ipArray), visitorsCount, today_visitors?.id]);
      return true;
    }
    return false;
  } catch (error) {
    throw new Error(`Failed to update home visitor count: ${error.message}`);
  }
};

const makePostReport = async (reportData) => {
  try {
    // Check if the report already exists (example: if the post ID and email already exist)
    const [existingReport] = await executeQuery('SELECT * FROM post_report WHERE post_id = ? AND email = ?;', [reportData.post_id, reportData.email]);

    if (existingReport) {
      // If the report already exists, return a message along with the existing report ID
      return { message: "You have already reported this post.", reportId: existingReport.id };
    } else {
      // If the report doesn't exist, insert the new report data into the post_report table
      const insertResult = await executeQuery('INSERT INTO post_report (post_id, email, description, date) VALUES (?, ?, ?, ?);',
        [reportData.post_id, reportData.email, reportData.description, reportData.date]);

      // Return the ID of the newly inserted report
      return { message: "Your report is under review. Thank you.", reportId: insertResult.insertId };
    }
  } catch (error) {
    throw new Error(`Failed to handle post report: ${error.message}`);
  }
};

const updateNewPostAdsClickCount = async (postId) => {
  try {

    // Check if a record exists for the given post ID and today's date
    const existingRecord = await executeQuery(
      'SELECT * FROM new_post_ad_count WHERE click_date = DATE(NOW()) AND post_ad_id = ?;',
      [postId]
    );

    if (existingRecord.length > 0) {
      // If record exists, update the click count
      const { post_ad_click_id, click_count } = existingRecord[0];
      await executeQuery(
        'UPDATE new_post_ad_count SET click_count = ? WHERE post_ad_click_id = ?;',
        [click_count + 1, post_ad_click_id]
      );
      return { message: 'Post ads click count updated.', data: { postAdClickId: post_ad_click_id, postId } };
    } else {
      // If no record exists, insert a new one
      const postAdClickId = `${new Date().toISOString().slice(2, 10).replace(/-/g, '')}${postId}`;
      await executeQuery(
        'INSERT INTO new_post_ad_count (post_ad_click_id, click_date, click_count, post_ad_id) VALUES (?, DATE(NOW()), ?, ?);',
        [postAdClickId, 1, postId]
      );
      return { message: 'Post ads click count inserted.', data: { postAdClickId, postId } };
    }

  } catch (error) {
    throw new Error(`Failed to update post ads click count: ${error.message}`);
  }
};

const saveMemberDefaultCredit = async (memberCreditData) => {
  try {
    const insertedId = await insertRecord('balance', memberCreditData);
    // Return the ID of the newly inserted report
    return { message: "Credit balance added successfully.", insertedId };
  } catch (error) {
    throw new Error(`Failed to handle save member default credit balance: ${error.message}`);
  }
};

const getPartnerContentData = async () => {
  try {
    const partnerContent = await executeQuery('SELECT site_link_home_content FROM settings WHERE id = 1;');
    const partnerContentData = partnerContent[0] || "";
    return partnerContentData?.site_link_home_content || "";
  } catch (error) {
    throw new Error(`Failed to fetch partner content data: ${error.message}`);
  }
};

const getFriendsList = async () => {
  try {
    const friendsList = await executeQuery(`SELECT id,title,url,text
          FROM friends_links
          ORDER BY sort_order ASC;`);

    return friendsList;
  } catch (error) {
    throw new Error(`Failed to fetch friends data: ${error.message}`);
  }
};

const getFriendsAds = async () => {
  try {
    const data = await executeQuery(`SELECT id, content FROM friends_ads WHERE status=1;`,
      []
    );
    return data || [];
  } catch (error) {
    throw new Error(`Failed to fetch friends ads: ${error.message}`);
  }
};

const getUploadImageId = async (transaction = null) => {

  try {
    let imgId = 1;

    const lastImgGenerator = await getTableRecord('SELECT image_id FROM id_generator ORDER BY id DESC LIMIT 1;', [], true, transaction);

    if (lastImgGenerator && lastImgGenerator.image_id !== null) {
      imgId = parseInt(lastImgGenerator?.image_id || 0) + 1;  // Increment id count      
    }

    // Save New Id the database
    await insertRecord('id_generator', { image_id: imgId }, transaction);

    return imgId;

  } catch (error) {
    throw new Error(`Failed to fetch single post image: ${error.message}`);
  }
};

const getEmailSMTPConfig = async (transaction = null) => {
  try {
    const singleSMTP = await getTableRecord('SELECT * FROM e_smtp ORDER BY id DESC LIMIT 1;', [], true, transaction);
    return singleSMTP;
  } catch (error) {
    throw new Error(`Failed to fetch get Email SMTP Config: ${error.message}`);
  }
};

const getPageMetaData = async (page_type = '', transaction = null) => {
  try {
    // First, try to fetch record with matching page_type and is_default = 0
    let singleMeta = await getTableRecord(
      'SELECT * FROM page_meta WHERE page_type = ? AND is_default = 0 LIMIT 1;',
      [page_type],
      true,
      transaction
    );

    // If no record found, try with is_default = 1
    if (!singleMeta) {
      singleMeta = await getTableRecord(
        'SELECT * FROM page_meta WHERE page_type = ? AND is_default = 1 LIMIT 1;',
        [page_type],
        true,
        transaction
      );
    }

    // Return the record if found, otherwise return an empty object
    return singleMeta || {};
  } catch (error) {
    throw new Error(`Failed to fetch page meta data: ${error.message}`);
  }
};

const getTableRecord = async (query, params = [], singleRecord = false, transaction = null) => {
  try {
    // Execute the query with the provided parameters
    const data = await executeQuery(query, params, transaction);

    // Return either the first record or the full dataset
    return singleRecord ? (data[0] || null) : data || [];
  } catch (error) {
    // Create a detailed error message with query and parameters
    const errorMessage = `
      Failed to fetch table record.
      Query: ${query}
      Parameters: ${JSON.stringify(params)}
      Error: ${error.message}
    `;
    logger.error(errorMessage); // Log the error for debugging

    // Re-throw the error for handling further up the chain
    throw new Error(errorMessage);
  }
};

const insertRecord = async (table, data = {}, transaction = null) => {
  try {
    // Construct column names and values from the data object
    const columns = Object.keys(data).join(', ');
    const values = Object.values(data);

    // Construct the INSERT query dynamically
    const query = `INSERT INTO ${table} (${columns}) VALUES (${values.map(() => '?').join(', ')});`;

    // Execute the insert query
    const result = await executeQuery(query, values, transaction);

    // Return the inserted ID or null if insert failed
    return result.insertId || null;
  } catch (error) {
    // Log detailed error information
    const errorMessage = `
      Failed to insert record.
      Table: ${table}
      Data: ${JSON.stringify(data)}
      Error: ${error.message}
    `;
    logger.error(errorMessage); // Log the error for debugging

    // Re-throw the error for handling further up the chain
    throw new Error(errorMessage);
  }
};

// Example
// const insertedId = await insertRecord('users', { name: 'John Doe', email: 'john@example.com' });


const updateRecord = async (table, fields = {}, conditions = '', transaction = null) => {
  try {
    // Construct the SET part of the query
    const setPart = Object.keys(fields)
      .map(key => `${key} = ?`)
      .join(', ');

    // Check if conditions is a string (custom WHERE clause)
    let wherePart = '';
    let values = [];

    if (typeof conditions === 'string') {
      wherePart = conditions; // Use the custom WHERE clause
    } else if (typeof conditions === 'object' && Object.keys(conditions).length > 0) {
      wherePart = Object.keys(conditions)
        .map(key => `${key} = ?`)
        .join(' AND ');
      values = Object.values(conditions);
    }

    // Combine SET and WHERE parts
    const query = `UPDATE ${table} SET ${setPart} WHERE ${wherePart};`;

    // Execute the update query with values (fields + conditions)
    const result = await executeQuery(query, [...Object.values(fields), ...values], transaction);

    // Return the number of affected rows
    return result.affectedRows || 0;
  } catch (error) {
    // Log detailed error information
    const errorMessage = `
      Failed to update record.
      Table: ${table}
      Fields: ${JSON.stringify(fields)}
      Conditions: ${JSON.stringify(conditions)}
      Error: ${error.message}
    `;
    logger.error(errorMessage); // Log the error for debugging

    // Re-throw the error for handling further up the chain
    throw new Error(errorMessage);
  }
};
// Example
// Update with Custom WHERE Clause: 
// const affectedRows = await updateRecord('users', { email: 'new-email@example.com' }, 'id IN (1, 3)');

// Update with Object Conditions:
// const affectedRows = await updateRecord('users', { email: 'new-email@example.com' }, { id: 1 });



const deleteRecord = async (table, conditions = '', transaction = null) => {
  try {
    // Check if conditions is a string (custom WHERE clause)
    let wherePart = '';
    let values = [];

    if (typeof conditions === 'string') {
      wherePart = conditions; // Use the custom WHERE clause
    } else if (typeof conditions === 'object' && Object.keys(conditions).length > 0) {
      wherePart = Object.keys(conditions)
        .map(key => `${key} = ?`)
        .join(' AND ');
      values = Object.values(conditions);
    }

    // Construct the DELETE query
    const query = `DELETE FROM ${table} WHERE ${wherePart};`;

    // Execute the delete query with conditions values
    const result = await executeQuery(query, values, transaction);

    // Return the number of affected rows
    return result.affectedRows || 0;
  } catch (error) {
    // Log detailed error information
    const errorMessage = `
      Failed to delete record.
      Table: ${table}
      Conditions: ${JSON.stringify(conditions)}
      Error: ${error.message}
    `;
    logger.error(errorMessage); // Log the error for debugging

    // Re-throw the error for handling further up the chain
    throw new Error(errorMessage);
  }
};
// Example
// Delete with Custom WHERE Clause: 
// const affectedRows = await deleteRecord('users', 'WHERE email = "test@example.com"');

// Delete with Object Conditions:
// const affectedRows = await deleteRecord('users', { id: 1 });


module.exports = { getTableRecord, insertRecord, updateRecord, deleteRecord, getSettingsData, getHomeDashboardData, getHomeTopNoticeData, getHomePartnersList, getSponsersListWithHeading, getCountryDetail, getCityDetail, getSubCityDetail, getSubCityContent, getAds, getCategoryPostAds, getTopSideNavLinks, getCategoryAgeVerificationModalContent, getPartnersList, getSubCityList, getCategoryDetail, getCategoryList, getSubCategoryDetail, getSubCategoryList, getSubCategoryContentDetail, getSinglePostImage, getPostImages, getSliderAds, getPosts, getNewPostAds, getPostAds, getGoogleAds, getAlertMessage, getPostWithPrevAndNext, updatePostVisitorCounter, makePostReport, updateNewPostAdsClickCount, saveMemberDefaultCredit, getPartnerContentData, getFriendsList, getFriendsAds, getPartnersListByCategory, getUploadImageId, updateSiteVisitorCounter, getEmailSMTPConfig, getPageMetaData };

