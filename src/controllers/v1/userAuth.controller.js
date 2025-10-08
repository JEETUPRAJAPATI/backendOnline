const fs = require('fs');
const path = require('path');
const { createSuccessResponse, createErrorResponse, createValidationErrorResponse } = require('../../utils/responseUtils');
const { getHeaderMetaData } = require('../../utils/metaUtils');
const { fileExists, hashPassword, formattedDate, getRelativeTime, generateRandomCode } = require('../../utils/generalUtils');
const { getSettingsData, getTableRecord, updateRecord, getPostWithPrevAndNext, getPostImages, deleteRecord, insertRecord, getUploadImageId } = require("../../services/common.service");
const { loadEmailTemplate, sendEmail } = require('../../utils/sendMail.Utils');
const { addDays, format } = require('date-fns'); // Import the necessary functions from date-fns

const { LIMIT, UPLOADED_PATH } = require('../../constants');
const { executeQuery, startTransaction, commitTransaction, rollbackTransaction } = require('../../utils/dbUtils');
const { generateAccessToken, generateRefreshToken } = require('../../utils/jwt');

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

    // Parameterized query to prevent SQL injection
    const query = `
      SELECT
        (SELECT COUNT(id) FROM post WHERE member_id = ? AND status = 1) AS total_active_post,
        (SELECT COUNT(id) FROM post WHERE member_id = ? AND status = 0) AS total_pending_post,
        (SELECT balance FROM balance WHERE username = ?) AS balance
    `;

    const params = [user.id, user.id, user.username];
    const dashboardData = await getTableRecord(query, params, true);

    const total_active_post = dashboardData?.total_active_post || 0;
    const total_pending_post = dashboardData?.total_pending_post || 0;
    const total_balance = `${settings?.currency || ''} ${dashboardData?.balance || 0}`;

    const response = {
      total_active_post,
      total_pending_post,
      total_balance,
    };

    res.json(createSuccessResponse('Data retrieved successfully.', response));
  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const profileSeo = async (req, res, next) => {
  try {

    const settings = await getSettingsData();

    // Prepare metadata for headers
    const logo_img = settings.header_logo_path && fileExists(settings.header_logo_path) ? `${req.appBaseUrl}/uploads/${settings.header_logo_path}` : `${req.appBaseUrl}/uploads/backend/images/settings/header_logo_15477661460.png`;

    const header_data = {
      author: 'localxlist.org',
      title: `Profile View | Localxlist`,
      description: `Profile View | Localxlist`,
      keywords: "Profile View | Localxlist",
      favicon: settings.favicon && fileExists(settings.favicon) ? `${req.appBaseUrl}/uploads/${settings.favicon}` : '',
      image: logo_img,

      ogType: "website",
      ogTitle: `Profile View | Localxlist`,
      ogSiteName: "localxlist.org",
      ogUrl: "https://localxlist.org/",
      ogDescription: `Profile View | Localxlist`,
      ogImage: logo_img,
      ogImageHeight: "377",

      twitterCard: "summary_large_image",
      twitterSite: "localxlist",
      twitterCreator: "localxlist",
      twitterTitle: `Profile View | Localxlist`,
      twitterDescription: `Profile View | Localxlist`,
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

const profile = async (req, res, next) => {
  try {
    const { user } = req;

    // Validate if the user object is available
    if (!user || !user.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Parameterized query to prevent SQL injection
    const query = `SELECT 
    id, 
    username, 
    email, 
    date_time, 
    status, 
    path, 
    (SELECT support_email FROM settings WHERE id = ? LIMIT 1) AS supportEmail,
    CASE 
        WHEN password IS NULL OR password = '' THEN 0 
        ELSE 1 
    END AS hasSetPassword
FROM member 
WHERE id = ?;`;
    const params = [1, user.id];
    const userDetail = await getTableRecord(query, params, true);

    const notificationCount = await executeQuery(`SELECT COUNT(id) AS total_unread_count FROM user_notifications WHERE member_id = ? AND read_yn = ?;`, [user.id, 'N']);
    const totalUnreadNotificationCount = notificationCount[0]?.total_unread_count || 0;

    if (userDetail && userDetail.date_time) {
      userDetail.formattedDate = formattedDate(userDetail.date_time, 'yyyy-MMM-dd hh:mm:ss aaa');
      userDetail.fullPath = userDetail?.path && fileExists(userDetail?.path) ? `${req.appBaseUrl}/uploads/${userDetail.path}` : `${req.appBaseUrl}/uploads/frontend/images/no-image.png`;
      userDetail.totalUnreadNotificationCount = totalUnreadNotificationCount;
    }

    res.json(createSuccessResponse('Data retrieved successfully.', userDetail));
  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const changeProfileSeo = async (req, res, next) => {
  try {

    const settings = await getSettingsData();

    // Prepare metadata for headers
    const logo_img = settings.header_logo_path && fileExists(settings.header_logo_path) ? `${req.appBaseUrl}/uploads/${settings.header_logo_path}` : `${req.appBaseUrl}/uploads/backend/images/settings/header_logo_15477661460.png`;

    const header_data = {
      author: 'localxlist.org',
      title: `Change Profile | Localxlist`,
      description: `Change Profile | Localxlist`,
      keywords: "Change Profile | Localxlist",
      favicon: settings.favicon && fileExists(settings.favicon) ? `${req.appBaseUrl}/uploads/${settings.favicon}` : '',
      image: logo_img,

      ogType: "website",
      ogTitle: `Change Profile | Localxlist`,
      ogSiteName: "localxlist.org",
      ogUrl: "https://localxlist.org/",
      ogDescription: `Change Profile | Localxlist`,
      ogImage: logo_img,
      ogImageHeight: "377",

      twitterCard: "summary_large_image",
      twitterSite: "localxlist",
      twitterCreator: "localxlist",
      twitterTitle: `Change Profile | Localxlist`,
      twitterDescription: `Change Profile | Localxlist`,
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

// Change profile logic
const changeProfile = async (req, res, next) => {
  try {
    const { user } = req;
    const { name, email, oldProfilePicPath } = req.body;

    // Validate required fields
    if (!email) {
      return res.status(400).json(createErrorResponse('Missing required parameters.'));
    }

    if (!user || !user.id) {
      return res.status(401).json(createErrorResponse('Unauthorized user.'));
    }

    // Check Existing Email
    const fetchUserDetail = await getTableRecord(`SELECT id, email, path FROM member WHERE id = ?;`, [user.id], true);
    if (!fetchUserDetail) {
      return res.status(404).json(createErrorResponse('User profile not found.'));
    }

    // Initialize profile data
    const profileData = {};

    // Handle file upload
    if (req.file) {
      const oldImagePath = oldProfilePicPath && (fetchUserDetail.path === oldProfilePicPath) ? path.join(global.uploadsBaseDir, oldProfilePicPath) : null;

      // Delete the old profile picture if it exists
      if (oldImagePath && fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }

      // Save new profile picture path
      const newImagePath = `member_user/images/login/${req.file.filename}`;
      profileData.path = newImagePath;
    }


    // Check Email is different
    if (fetchUserDetail.email !== email) {

      const checkEmailQuery = `SELECT id FROM member WHERE email = ? AND id != ?`;
      const checkEmail = await getTableRecord(checkEmailQuery, [email, fetchUserDetail.id], true);
      if (checkEmail) {
        return res.status(400).json(createErrorResponse(message = "This email is already taken.", data = null, code = 'EMAIL_ALREADY_EXIST'));
      }

      // Send email verification Code
      // Generate a confirmation code
      const confirmationCode = generateRandomCode();
      profileData.confirmation_code = confirmationCode;

      // Prepare placeholders
      const placeholders = {
        LOGO_URL: "https://localxlist.com/backend/images/settings/header_logo_15854785210.png",
        VERIFICATION_CODE: confirmationCode,
      };

      // Load Verification Email Template
      const templatePath = path.join(__dirname, '../../email_templates/verificationMailTemplate.html');
      const emailContent = loadEmailTemplate(templatePath, placeholders);

      // Send the verification email
      const emailOptions = {
        to: email,
        subject: 'Verification Code | Localxlist',
        html: emailContent,
      };
      const sentMail = await sendEmail(emailOptions);
      logger.info({ sentMail });

      // If Mail Success Then Update
      // Update user profile in the database
      const affectedRows = await updateRecord('member', profileData, { id: fetchUserDetail.id });

      if (affectedRows === 0) {
        return res.status(404).json(createErrorResponse('User profile not found.'));
      }

      // Fetch the updated profile data
      const userDetail = await getTableRecord(`SELECT id, path FROM member WHERE id = ?;`, [fetchUserDetail.id], true);
      const profilePicFullPath = userDetail?.path && fileExists(userDetail?.path) ? `${req.appBaseUrl}/uploads/${userDetail.path}` : `${req.appBaseUrl}/uploads/frontend/images/no-image.png`;

      return res.json(createSuccessResponse('Email verification code sent success. please check mail and verify to update your new email.', { id: userDetail?.id || '', path: userDetail?.path || '', fullPath: profilePicFullPath || '', emailVerificationModal: true }, code = "UPDATE_EMAIL_VERIFICATION_CODE_SENT"));
    }

    profileData.email = fetchUserDetail.email;
    // Update user profile in the database
    const affectedRows = await updateRecord('member', profileData, { id: fetchUserDetail.id });

    // Fetch the updated profile data
    const userDetail = await getTableRecord(`SELECT id, path FROM member WHERE id = ?;`, [fetchUserDetail.id], true);
    const profilePicFullPath = userDetail?.path && fileExists(userDetail?.path) ? `${req.appBaseUrl}/uploads/${userDetail.path}` : `${req.appBaseUrl}/uploads/frontend/images/no-image.png`;

    if (affectedRows === 0) {
      return res.status(404).json(createErrorResponse('User profile not found.'));
    }

    res.json(createSuccessResponse('Your Profile Successfully Changed.', { id: userDetail?.id || '', path: userDetail?.path || '', fullPath: profilePicFullPath || '', emailVerificationModal: false }));
  } catch (error) {
    next(error);
  }
};

// Verify Email Update Verification logic
const verifyEmailUpdateVerificationCode = async (req, res, next) => {
  try {
    const { user } = req;
    const { new_email, verification_code } = req.body;

    // Validate required fields
    if (!new_email || !verification_code) {
      return res.status(400).json(createErrorResponse('Missing required parameters.'));
    }

    if (!user || !user.id) {
      return res.status(401).json(createErrorResponse('Unauthorized user.'));
    }

    const userDetail = await getTableRecord(`SELECT id FROM member WHERE id = ? AND confirmation_code = ?;`, [user.id, verification_code], true);

    if (!userDetail) {
      return res.status(400).json(createErrorResponse(message = "Invalid confirmation code."));
    }

    // Change Status and Verified
    const updateMemberData = {
      email: new_email,
      confirmation_code: ''
    };
    await updateRecord('member', updateMemberData, { id: user.id, confirmation_code: verification_code });

    res.json(createSuccessResponse('Email verification successfully.', data = "", code = "EMAIL_VERIFICATION_SUCCESS"));


  } catch (error) {
    next(error);
  }
};

const changePasswordSeo = async (req, res, next) => {
  try {

    const settings = await getSettingsData();

    // Prepare metadata for headers
    const logo_img = settings.header_logo_path && fileExists(settings.header_logo_path) ? `${req.appBaseUrl}/uploads/${settings.header_logo_path}` : `${req.appBaseUrl}/uploads/backend/images/settings/header_logo_15477661460.png`;

    const header_data = {
      author: 'localxlist.org',
      title: `Change Profile | Localxlist`,
      description: `Change Profile | Localxlist`,
      keywords: "Change Profile | Localxlist",
      favicon: settings.favicon && fileExists(settings.favicon) ? `${req.appBaseUrl}/uploads/${settings.favicon}` : '',
      image: logo_img,

      ogType: "website",
      ogTitle: `Change Profile | Localxlist`,
      ogSiteName: "localxlist.org",
      ogUrl: "https://localxlist.org/",
      ogDescription: `Change Profile | Localxlist`,
      ogImage: logo_img,
      ogImageHeight: "377",

      twitterCard: "summary_large_image",
      twitterSite: "localxlist",
      twitterCreator: "localxlist",
      twitterTitle: `Change Profile | Localxlist`,
      twitterDescription: `Change Profile | Localxlist`,
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

const changePassword = async (req, res, next) => {
  try {
    const { user } = req;
    const { old_password, new_password } = req.body;


    // Validate if the user object is available
    if (!user || !user.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Check if required parameters are provided
    if (!new_password) {
      return res.status(400).json(createErrorResponse("Missing required parameters."));
    }

    // Fetch the user data
    const oldPasswordOriginal = hashPassword(old_password);
    const userData = await getTableRecord(`SELECT id, password FROM member WHERE id = ? ;`, [user.id], true);
    if (!userData) {
      return res.status(400).json(createErrorResponse('User not found.'));
    }

    // Check if password blank means user still not added any password
    const hasSetPassword = userData.password && userData.password.trim() !== '';

    // Check if the old password is correct
    if (hasSetPassword && (oldPasswordOriginal !== userData.password)) {
      return res.status(400).json(createErrorResponse('Old password is incorrect.'));
    }

    // Change Password
    const passwordData = {
      password: hashPassword(new_password), // Hash password before storing
    };

    // Update the code to the database
    await updateRecord('member', passwordData, { id: userData.id });

    res.json(createSuccessResponse('Your Password Successfully Changed.'));
  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const setUsername = async (req, res, next) => {
  try {
    const { user } = req;
    const { username } = req.body;

    // Validate if the user object is available
    if (!user || !user.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Check if required parameters are provided
    if (!username) {
      return res.status(400).json(createErrorResponse("Missing required parameters."));
    }

    // Check Same Username existing
    const checkExistingUsername = await getTableRecord(`SELECT id FROM member WHERE username = ? AND id != ?;`, [username, user.id], true);
    if (checkExistingUsername) {
      return res.status(400).json(createErrorResponse(message = "This username is already taken.", data = null, code = 'USERNAME_ALREADY_EXIST'));
    }

    // Change Username
    const setRecordData = {
      username
    };

    // Generate Again Token
    const jwtUser = {
      id: user.id,
      username,
      email: user.email,
    };
    const accessToken = generateAccessToken(jwtUser);
    const refreshToken = generateRefreshToken(jwtUser);

    // Update the code to the database
    await updateRecord('member', setRecordData, { id: user.id });

    res.json(createSuccessResponse('Your username has been set.', { token: accessToken, refreshToken, id: jwtUser?.id, username }, 'USERNAME_ADDED'));
  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const deleteAccountSeo = async (req, res, next) => {
  try {

    const settings = await getSettingsData();

    // Prepare metadata for headers
    const logo_img = settings.header_logo_path && fileExists(settings.header_logo_path) ? `${req.appBaseUrl}/uploads/${settings.header_logo_path}` : `${req.appBaseUrl}/uploads/backend/images/settings/header_logo_15477661460.png`;

    const header_data = {
      author: 'localxlist.org',
      title: `Delete Account | Localxlist`,
      description: `Delete Account | Localxlist`,
      keywords: "Delete Account | Localxlist",
      favicon: settings.favicon && fileExists(settings.favicon) ? `${req.appBaseUrl}/uploads/${settings.favicon}` : '',
      image: logo_img,

      ogType: "website",
      ogTitle: `Delete Account | Localxlist`,
      ogSiteName: "localxlist.org",
      ogUrl: "https://localxlist.org/",
      ogDescription: `Delete Account | Localxlist`,
      ogImage: logo_img,
      ogImageHeight: "377",

      twitterCard: "summary_large_image",
      twitterSite: "localxlist",
      twitterCreator: "localxlist",
      twitterTitle: `Delete Account | Localxlist`,
      twitterDescription: `Delete Account | Localxlist`,
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
const deleteAccount = async (req, res, next) => {
  try {
    const { user } = req;
    const { action } = req.body;

    // Check if required parameters are provided
    if (!action) {
      return res.status(400).json(createErrorResponse("Missing required parameters."));
    }

    // Validate if the user object is available
    if (!user || !user.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    let transaction, response_message, response_data, response_code;

    transaction = await startTransaction(); // Start transaction

    switch (action) {
      case 'deactivateAccount': {
        const parsedIds = [user?.id || 0];
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
        const userList = await executeQuery(getUsersQuery, validIds, transaction);

        // Send emails
        await Promise.all(userList.map(async (user) => {
          // Update user status in the database
          await updateRecord('member', { status: 0, verified: 0 }, { id: user?.id }, transaction);
        }));

        response_data = {
          ids: validIds
        };
        response_message = 'Account deactivated successfully.';
        response_code = 'ACCOUNT_DEACTIVATED_SUCCESS';
        break;
      }

      case 'deleteAccount': {
        const parsedIds = [user?.id || 0];
        if (!Array.isArray(parsedIds) || parsedIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid or missing IDs.'));
        }

        // Ensure all IDs are valid integers
        const validIds = parsedIds.filter(id => Number.isInteger(id));
        if (validIds.length === 0) {
          return res.status(400).json(createErrorResponse('Invalid IDs.'));
        }


        try {

          // Select Data Of that Id with images
          const placeholders = validIds.map(() => '?').join(',');
          const selectQuery = `SELECT id, path, username FROM member WHERE id IN (${placeholders})`;
          const allUsers = await executeQuery(selectQuery, validIds, transaction);

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
          await executeQuery(`DELETE FROM balance WHERE username IN (${usernamePlaceholders})`, validUsernames, transaction);
          await executeQuery(`DELETE FROM balance_history WHERE username IN (${usernamePlaceholders})`, validUsernames, transaction);

          // ========= Delete All Member's Posts =========
          const posts = await getTableRecord(`SELECT id, img_id FROM post WHERE member_id IN (${placeholders})`, validIds, false, transaction);
          // Collect all post IDs, image IDs
          const postIds = posts.map(post => post.id).filter(id => id);
          const imageIds = posts.map(post => post.img_id).filter(img_id => img_id);
          if (imageIds.length > 0) {
            const imgPlaceholders = imageIds.map(() => '?').join(',');
            const postImgs = await getTableRecord(`SELECT id, path FROM post_img_table WHERE img_id IN (${imgPlaceholders})`, imageIds, false, transaction);

            if (postImgs.length > 0) {
              // Delete all image records in one query
              await executeQuery(`DELETE FROM post_img_table WHERE img_id IN (${imgPlaceholders})`, imageIds, transaction);

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
            await executeQuery(`DELETE FROM post WHERE id IN (${postIdPlaceholders})`, postIds, transaction);
            // Delete the transaction posts
            await executeQuery(`DELETE FROM transaction_posts WHERE post_id IN (${postIdPlaceholders})`, postIds, transaction);
          }

          // Delete the users
          await executeQuery(`DELETE FROM member WHERE id IN (${placeholders})`, validIds, transaction);

          response_data = {
            ids: validIds
          };
          response_message = 'Account deleted successfully.';
          response_code = 'ACCOUNT_DELETED';

        } catch (error) {
          await rollbackTransaction(transaction); // Rollback on error
          console.error(error);
        }
        break;
      }

      default:
        await rollbackTransaction(transaction); // Rollback on error
        return res.status(400).json(createErrorResponse('Invalid action.'));
    }

    // Commit the transaction
    await commitTransaction(transaction);
    res.json(createSuccessResponse(response_message, response_data, response_code));
  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const postListSeo = async (req, res, next) => {
  try {

    const settings = await getSettingsData();

    // Prepare metadata for headers
    const logo_img = settings.header_logo_path && fileExists(settings.header_logo_path) ? `${req.appBaseUrl}/uploads/${settings.header_logo_path}` : `${req.appBaseUrl}/uploads/backend/images/settings/header_logo_15477661460.png`;

    const header_data = {
      author: 'localxlist.org',
      title: `My Post | Localxlist`,
      description: `My Post | Localxlist`,
      keywords: "My Post | Localxlist",
      favicon: settings.favicon && fileExists(settings.favicon) ? `${req.appBaseUrl}/uploads/${settings.favicon}` : '',
      image: logo_img,

      ogType: "website",
      ogTitle: `My Post | Localxlist`,
      ogSiteName: "localxlist.org",
      ogUrl: "https://localxlist.org/",
      ogDescription: `My Post | Localxlist`,
      ogImage: logo_img,
      ogImageHeight: "377",

      twitterCard: "summary_large_image",
      twitterSite: "localxlist",
      twitterCreator: "localxlist",
      twitterTitle: `My Post | Localxlist`,
      twitterDescription: `My Post | Localxlist`,
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

const postList = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { page = 1 } = query;

    // Validate if the user object is available
    if (!user || !user.id || !user.username) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Pagination and post fetching
    const perPageLimit = LIMIT.MY_POST || 10;
    const offset = (page - 1) * perPageLimit;

    // Fetch total post count for pagination
    const totalPostCount = await executeQuery(`SELECT COUNT(id) AS total_post FROM post WHERE post.member_id = ?`, [user.id]);
    const totalPosts = totalPostCount[0]?.total_post || 0;
    const totalPages = Math.ceil(totalPosts / perPageLimit);

    // Parameterized query to prevent SQL injection  
    const allPosts = await getTableRecord(`
    SELECT 
      post.id, 
      post.title, 
      post.date, 
      post.status, 
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
        WHERE post.member_id = ?
        ORDER BY post.id DESC
        LIMIT ? OFFSET ?;`, [user.id, perPageLimit, offset]);

    allPosts.map((post, index) => {
      post.srNo = offset + (index + 1);
      post.status_text = post.status == 1 ? 'Active' : 'Pending';
      post.status_text_color = post.status == 1 ? 'green' : 'red';
      post.formattedDate = formattedDate(post.date, 'yyyy-MMM-dd');
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

    res.json(createSuccessResponse('Data retrieved successfully.', responseData));

  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const postViewSeo = async (req, res, next) => {
  try {

    const settings = await getSettingsData();

    // Prepare metadata for headers
    const logo_img = settings.header_logo_path && fileExists(settings.header_logo_path) ? `${req.appBaseUrl}/uploads/${settings.header_logo_path}` : `${req.appBaseUrl}/uploads/backend/images/settings/header_logo_15477661460.png`;

    const header_data = {
      author: 'localxlist.org',
      title: `View Post | Localxlist`,
      description: `View Post | Localxlist`,
      keywords: "View Post | Localxlist",
      favicon: settings.favicon && fileExists(settings.favicon) ? `${req.appBaseUrl}/uploads/${settings.favicon}` : '',
      image: logo_img,

      ogType: "website",
      ogTitle: `View Post | Localxlist`,
      ogSiteName: "localxlist.org",
      ogUrl: "https://localxlist.org/",
      ogDescription: `View Post | Localxlist`,
      ogImage: logo_img,
      ogImageHeight: "377",

      twitterCard: "summary_large_image",
      twitterSite: "localxlist",
      twitterCreator: "localxlist",
      twitterTitle: `View Post | Localxlist`,
      twitterDescription: `View Post | Localxlist`,
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

const postView = async (req, res, next) => {
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

    const whereCondition = `WHERE member_id = ${user.id}`;
    // const whereCondition = `WHERE 1=1`;
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

        -- Previous post details
        (SELECT id 
         FROM post 
          ${whereCondition} AND id < ?
         ORDER BY 
          date ASC 
         LIMIT 1) AS prev_post_id,         
        (SELECT title 
         FROM post 
         ${whereCondition} AND id < ?
         ORDER BY 
          date ASC 
         LIMIT 1) AS prev_post_title,
         
        -- Next post details
        (SELECT id 
         FROM post 
         ${whereCondition} AND id > ?
         ORDER BY 
          date DESC 
         LIMIT 1) AS next_post_id,         
        (SELECT title 
         FROM post 
         ${whereCondition} AND id > ?
         ORDER BY 
          date DESC 
         LIMIT 1) AS next_post_title
        
      FROM post
      ${whereCondition} AND id = ?
      ORDER BY date DESC;
    `;

    const postDetail = await getTableRecord(query, [id, id, id, id, id], true);
    if (!postDetail) {
      return res.status(400).json(createErrorResponse(message = "Post Not Found.", data = null, code = "POST_NOT_FOUND"));
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

    res.json(createSuccessResponse('Data retrieved successfully.', postDetail));

  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const postEditSeo = async (req, res, next) => {
  try {

    const settings = await getSettingsData();

    // Prepare metadata for headers
    const logo_img = settings.header_logo_path && fileExists(settings.header_logo_path) ? `${req.appBaseUrl}/uploads/${settings.header_logo_path}` : `${req.appBaseUrl}/uploads/backend/images/settings/header_logo_15477661460.png`;

    const header_data = {
      author: 'localxlist.org',
      title: `Edit Post | Localxlist`,
      description: `Edit Post | Localxlist`,
      keywords: "Edit Post | Localxlist",
      favicon: settings.favicon && fileExists(settings.favicon) ? `${req.appBaseUrl}/uploads/${settings.favicon}` : '',
      image: logo_img,

      ogType: "website",
      ogTitle: `Edit Post | Localxlist`,
      ogSiteName: "localxlist.org",
      ogUrl: "https://localxlist.org/",
      ogDescription: `Edit Post | Localxlist`,
      ogImage: logo_img,
      ogImageHeight: "377",

      twitterCard: "summary_large_image",
      twitterSite: "localxlist",
      twitterCreator: "localxlist",
      twitterTitle: `Edit Post | Localxlist`,
      twitterDescription: `Edit Post | Localxlist`,
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

const postEdit = async (req, res, next) => {
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

    const whereCondition = `WHERE member_id = ${user.id}`;
    // const whereCondition = `WHERE 1=1`;
    const query = `
      SELECT 
        id, 
        title, 
        description, 
        email, 
        phone, 
        location
      FROM post
      ${whereCondition} AND id = ?
      ORDER BY date DESC;
    `;

    const postDetail = await getTableRecord(query, [id], true);
    if (!postDetail) {
      return res.status(400).json(createErrorResponse(message = "Post Not Found.", data = null, code = "POST_NOT_FOUND"));
    }

    res.json(createSuccessResponse('Data retrieved successfully.', postDetail));

  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const postEditUpdate = async (req, res, next) => {
  try {
    const { user } = req;
    const { id, title, location, description, email, phone } = req.body;

    // Validate if the user object is available
    if (!user || !user.id || !user.username) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Check if required parameters are provided
    if (!id || !title || !location || !description || !email || !phone) {
      return res.status(400).json(createErrorResponse("Missing required parameters."));
    }

    // Check Post Details
    const postDetail = await getTableRecord(`SELECT id FROM post WHERE id = ? AND member_id = ?`, [id, user.id], true);
    if (!postDetail) {
      return res.status(400).json(createErrorResponse(message = "Post Not Found.", data = null, code = "POST_NOT_FOUND"));
    }

    const postSetData = { title, location, description, email, phone };

    const affectedRows = await updateRecord('post', postSetData, { member_id: user.id, id: postDetail.id });

    // Update the code to the database
    res.json(createSuccessResponse('Data updated successfully.', affectedRows, "POST_UPDATED"));

  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const postDelete = async (req, res, next) => {
  try {
    const { user } = req;
    const { id } = req.body;

    // Validate if the user object is available
    if (!user || !user.id || !user.username) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Check if required parameters are provided
    if (!id) {
      return res.status(400).json(createErrorResponse("Missing required parameters."));
    }

    // Check Post Details
    const postDetail = await getTableRecord(`SELECT id, img_id FROM post WHERE id = ? AND member_id = ?`, [id, user.id], true);
    if (!postDetail) {
      return res.status(400).json(createErrorResponse(message = "Post Not Found.", data = null, code = "POST_NOT_FOUND"));
    }

    // Delete Post Images and others
    const imgId = postDetail?.img_id || "";
    const postImgs = await getTableRecord(`SELECT id, img_id, path FROM post_img_table WHERE img_id = ?;`, [imgId]);
    if (postImgs && postImgs.length > 0) {
      // Prepare an array of promises for deletions
      const deletePromises = postImgs.map(async (image) => {
        try {
          // Delete the image from the database
          await deleteRecord('post_img_table', { id: image.id });

          // Delete the file if it exists
          const imagePath = image.path ? path.join(global.uploadsBaseDir, image.path) : null;
          if (imagePath && fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
          }
        } catch (deleteError) {
          console.error(`Error deleting image with ID ${image.id}:`, deleteError);
        }
      });

      // Wait for all delete operations to complete
      await Promise.all(deletePromises);
    }


    // Delete the post
    const affectedRows = await deleteRecord('post', { member_id: user.id, id: postDetail.id });

    // Update the code to the database
    res.json(createSuccessResponse('Data deleted successfully.', affectedRows, "POST_DELETED"));

  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const balanceRechargeSeo = async (req, res, next) => {
  try {

    const settings = await getSettingsData();

    // Prepare metadata for headers
    const logo_img = settings.header_logo_path && fileExists(settings.header_logo_path) ? `${req.appBaseUrl}/uploads/${settings.header_logo_path}` : `${req.appBaseUrl}/uploads/backend/images/settings/header_logo_15477661460.png`;

    const header_data = {
      author: 'localxlist.org',
      title: `Recharge Balance | Localxlist`,
      description: `Recharge Balance | Localxlist`,
      keywords: "Recharge Balance | Localxlist",
      favicon: settings.favicon && fileExists(settings.favicon) ? `${req.appBaseUrl}/uploads/${settings.favicon}` : '',
      image: logo_img,

      ogType: "website",
      ogTitle: `Recharge Balance | Localxlist`,
      ogSiteName: "localxlist.org",
      ogUrl: "https://localxlist.org/",
      ogDescription: `Recharge Balance | Localxlist`,
      ogImage: logo_img,
      ogImageHeight: "377",

      twitterCard: "summary_large_image",
      twitterSite: "localxlist",
      twitterCreator: "localxlist",
      twitterTitle: `Recharge Balance | Localxlist`,
      twitterDescription: `Recharge Balance | Localxlist`,
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

const balanceRecharge = async (req, res, next) => {
  try {
    const { user } = req;

    // Validate if the user object is available
    if (!user || !user.id || !user.username) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Parameterized query to prevent SQL injection  
    const manualMethods = await getTableRecord(`SELECT * FROM payment_methods WHERE method_type = ? AND deleted_yn = ?;`, [2, "N"]);
    const accountAddress = await getTableRecord(`SELECT id, code FROM payment_api WHERE api_name = ?;`, ["pm"], true);

    const perfectMoneyVideosAll = await getTableRecord(`SELECT id, video_path FROM videos WHERE upload_for = ? AND deleted_yn = ?;`, ["perfect_money", "N"]);
    // Handle Videos
    const perfectMoneyVideos = await Promise.all(perfectMoneyVideosAll.map((item) => {
      const videosPath = item?.video_path && fileExists(`frontend/videos/${item.video_path}`);
      return {
        ...item,
        path: videosPath ? `${req.appBaseUrl}/uploads/frontend/videos/${item.video_path}` : `${req.appBaseUrl}/uploads/frontend/images/no-image.png`,
      };
    }));

    const manualPaymentVideosAll = await getTableRecord(`SELECT id, title, video_path FROM videos WHERE upload_for = ? AND deleted_yn = ?;`, ["manual_payment", "N"]);

    res.json(createSuccessResponse('Data retrieved successfully.', {
      manualMethods,
      accountAddress,
      perfectMoneyVideos,
      manualPaymentVideos: manualPaymentVideosAll
    }));

  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const manualPaymentDetail = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { manualPaymentMethodId = '' } = query;


    // Validate if the user object is available
    if (!user || !user.id || !user.username) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Check if required parameters are provided
    if (!manualPaymentMethodId) {
      return res.status(400).json(createErrorResponse("Missing required parameters."));
    }

    const manualPaymentMethodDetail = await getTableRecord(`SELECT * FROM payment_methods WHERE id = ?;`, [manualPaymentMethodId], true);

    res.json(createSuccessResponse('Data retrieved successfully.', manualPaymentMethodDetail || {}));

  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const saveManualRechargeBalance = async (req, res, next) => {
  let transaction;
  const uploadedFiles = [req.file?.path].filter(Boolean);

  const deleteUploadedFilesWhenError = async (filePaths) => {
    if (!filePaths?.length) return;

    await Promise.all(filePaths.map(async (filePath) => {
      try {
        await fs.promises.unlink(filePath);
        console.log(`File deleted: ${filePath}`);
      } catch (err) {
        console.error(`Failed to delete file: ${filePath}`, err);
      }
    }));
  };

  try {
    const { user, file } = req;
    const { manual_method_id, payment_amount, transaction_id, description } = req.body;

    // Validate required fields
    const requiredFields = { manual_method_id, payment_amount, transaction_id };
    if (Object.values(requiredFields).some(field => !field)) {
      await deleteUploadedFilesWhenError(uploadedFiles);
      return res.status(400).json(createErrorResponse('Missing required parameters.'));
    }

    if (!user?.id) {
      await deleteUploadedFilesWhenError(uploadedFiles);
      return res.status(401).json(createErrorResponse('Unauthorized user.'));
    }

    // Get user details
    const [fetchUserDetail, fetchMethodDetail] = await Promise.all([
      getTableRecord(`SELECT id, email, username FROM member WHERE id = ?;`, [user.id], true),
      getTableRecord(`SELECT id, method_name FROM payment_methods WHERE id = ?;`, [manual_method_id], true)
    ]);

    if (!fetchUserDetail) {
      await deleteUploadedFilesWhenError(uploadedFiles);
      return res.status(404).json(createErrorResponse('User profile not found.'));
    }

    if (!fetchMethodDetail) {
      await deleteUploadedFilesWhenError(uploadedFiles);
      return res.status(404).json(createErrorResponse('Payment method is not existing.'));
    }

    // Check for duplicate transaction
    const fetchTransactionDetail = await getTableRecord(
      `SELECT id FROM manual_payment_request WHERE transaction_id = ? AND method_id = ?;`,
      [transaction_id, manual_method_id],
      true
    );

    if (fetchTransactionDetail) {
      await deleteUploadedFilesWhenError(uploadedFiles);
      return res.status(400).json(createErrorResponse('Your Transaction ID already applied for payment.'));
    }

    // Start transaction
    transaction = await startTransaction();

    try {
      // Prepare payment data
      const paymentData = {
        member_id: user.id,
        method_id: manual_method_id,
        method_name: fetchMethodDetail.method_name,
        method_details: `Username: ${fetchUserDetail.username}, User Email: ${fetchUserDetail.email}`,
        payment_amount,
        transaction_id,
        description,
        pstatus: 'Pending',
        created_date: new Date(),
        created_by: user.id,
      };

      // Insert payment record
      const manualPaymentRequestInsertedId = await insertRecord('manual_payment_request', paymentData, transaction);
      logger.info(`Saved Payment Request Id:${manualPaymentRequestInsertedId}`);

      if (manualPaymentRequestInsertedId && file?.filename) {
        const newFileName = `${user.id}-${manualPaymentRequestInsertedId}-ss-${file?.filename}`;
        // Rename the file
        const oldPath = file.path;
        const newPath = path.join(global.uploadsBaseDir, `${UPLOADED_PATH.MANUAL_PAYMENT_SCREENSHOT}/${newFileName}`);
        if (oldPath && fs.existsSync(oldPath)) {
          fs.renameSync(oldPath, newPath);
        }
        // Update File Name in Payment Request
        const setRecord = {
          attached_file: newFileName
        };
        updateRecord('manual_payment_request', setRecord, { id: manualPaymentRequestInsertedId });
      }

      // Insert notice
      const noticeData = {
        title: `Manual Payment - ${fetchMethodDetail.method_name}`,
        notice_url: "",
        manual_payment_request_id: manualPaymentRequestInsertedId,
        notice_body: `Username: ${fetchUserDetail.username}, User Email: ${fetchUserDetail.email} || Trxn No: ${transaction_id}, Amount: ${payment_amount}`,
        read_yn: 'N',
        created_at: new Date(),
      };
      const noticeInsertedId = await insertRecord('notices', noticeData, transaction);
      logger.info(`Saved Notice Id:${noticeInsertedId}`);

      await commitTransaction(transaction);
      res.json(createSuccessResponse('Manually Payment Request Submitted Successfully.'));
    } catch (error) {
      await rollbackTransaction(transaction);
      throw error;
    }
  } catch (error) {
    await deleteUploadedFilesWhenError(uploadedFiles);
    next(error);
  }
};

const balanceHistoriesSeo = async (req, res, next) => {
  try {

    const settings = await getSettingsData();

    // Prepare metadata for headers
    const logo_img = settings.header_logo_path && fileExists(settings.header_logo_path) ? `${req.appBaseUrl}/uploads/${settings.header_logo_path}` : `${req.appBaseUrl}/uploads/backend/images/settings/header_logo_15477661460.png`;

    const header_data = {
      author: 'localxlist.org',
      title: `Recharge History | Localxlist`,
      description: `Recharge History | Localxlist`,
      keywords: "Recharge History | Localxlist",
      favicon: settings.favicon && fileExists(settings.favicon) ? `${req.appBaseUrl}/uploads/${settings.favicon}` : '',
      image: logo_img,

      ogType: "website",
      ogTitle: `Recharge History | Localxlist`,
      ogSiteName: "localxlist.org",
      ogUrl: "https://localxlist.org/",
      ogDescription: `Recharge History | Localxlist`,
      ogImage: logo_img,
      ogImageHeight: "377",

      twitterCard: "summary_large_image",
      twitterSite: "localxlist",
      twitterCreator: "localxlist",
      twitterTitle: `Recharge History | Localxlist`,
      twitterDescription: `Recharge History | Localxlist`,
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

const balanceHistories = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { page = 1 } = query;


    // Validate if the user object is available
    if (!user || !user.id || !user.username) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Pagination and fetching
    const perPageLimit = LIMIT.MY_BALANCE_HISTORIES || 10;
    const offset = (page - 1) * perPageLimit;

    // Fetch total count for pagination
    const totalRecordCount = await executeQuery(`SELECT COUNT(id) AS total_count FROM manual_payment_request WHERE member_id = ?;`, [user.id]);
    const totalRecords = totalRecordCount[0]?.total_count || 0;
    const totalPages = Math.ceil(totalRecords / perPageLimit);

    // Parameterized query to prevent SQL injection  
    const balanceHistories = await getTableRecord(`SELECT id, created_date, method_name, payment_amount, description, pstatus, reason, approved_date, transaction_id FROM manual_payment_request WHERE member_id = ? LIMIT ? OFFSET ?;`, [user.id, perPageLimit, offset]);

    balanceHistories.map((item, index) => {
      item.srNo = offset + (index + 1);
      item.formattedCreatedDate = formattedDate(item.created_date, 'yyyy-MMM-dd hh:mm:ss a');
      item.formattedApprovedDate = formattedDate(item.approved_date, 'yyyy-MMM-dd hh:mm:ss a');
    });

    // Send response
    const responseData = {
      list: balanceHistories,
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

const invoiceHistories = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { page = 1 } = query;

    // Validate if the user object is available
    if (!user || !user.id || !user.username) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Pagination and fetching
    const perPageLimit = LIMIT.MY_INVOICE_HISTORIES || 10;
    const offset = (page - 1) * perPageLimit;

    // Fetch total count for pagination
    const totalRecordCount = await executeQuery(`SELECT COUNT(id) AS total_count FROM invoices WHERE member_id = ? AND status = ?;`, [user.id, 'new']);
    const totalRecords = totalRecordCount[0]?.total_count || 0;
    const totalPages = Math.ceil(totalRecords / perPageLimit);

    const invoices = await getTableRecord(`SELECT * FROM invoices WHERE member_id = ? AND status = ? LIMIT ? OFFSET ?;`, [user.id, 'new', perPageLimit, offset]);

    invoices.map((item, index) => {
      item.srNo = offset + (index + 1);
      item.formattedDate = formattedDate(item.date_time, 'yyyy-MM-dd');
    });

    // Send response
    const responseData = {
      list: invoices,
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

const notifications = async (req, res, next) => {
  try {
    const { user, query } = req;
    const { page = 1 } = query;

    // Validate if the user object is available
    if (!user || !user.id) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Pagination and fetching
    const perPageLimit = LIMIT.MY_NOTIFICATIONS || 10;
    const offset = (page - 1) * perPageLimit;

    // Fetch total count for pagination
    const totalRecordCount = await executeQuery(`SELECT COUNT(id) AS total_count FROM user_notifications WHERE member_id = ?;`, [user.id]);
    const totalRecords = totalRecordCount[0]?.total_count || 0;
    const totalPages = Math.ceil(totalRecords / perPageLimit);

    // Parameterized query to prevent SQL injection
    const q = `SELECT * FROM user_notifications WHERE member_id = ? ORDER BY id DESC LIMIT ? OFFSET ?`;
    const params = [user.id, perPageLimit, offset];
    const notifications = await getTableRecord(q, params);

    const settings = await getSettingsData();
    const favicon = settings.favicon && fileExists(settings.favicon) ? `${req.appBaseUrl}/uploads/${settings.favicon}` : '';

    notifications.map((item, index) => {
      item.srNo = offset + (index + 1);
      item.relativeTime = getRelativeTime(item?.created_date);
      item.image = favicon;
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

const readNotification = async (req, res, next) => {
  try {
    const { user } = req;
    const { id } = req.body;

    // Validate if the user object is available
    if (!user || !user.id || !user.username) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Check if required parameters are provided
    if (!id) {
      return res.status(400).json(createErrorResponse("Missing required parameters."));
    }

    // Check Notification Details
    const record = await getTableRecord(`SELECT id FROM user_notifications WHERE id = ? AND member_id = ?`, [id, user.id], true);
    if (!record) {
      return res.status(400).json(createErrorResponse(message = "Notification Not Found.", data = null, code = "NOTIFICATION_NOT_FOUND"));
    }

    const setRecord = {
      read_yn: "Y"
    };

    const affectedRows = await updateRecord('user_notifications', setRecord, { member_id: user.id, id: record.id });
    const notificationCount = await executeQuery(`SELECT COUNT(id) AS total_unread_count FROM user_notifications WHERE member_id = ? AND read_yn = ?;`, [user.id, 'N']);
    const totalUnreadNotificationCount = notificationCount[0]?.total_unread_count || 0;


    // Update the code to the database
    res.json(createSuccessResponse('Data updated successfully.', { id: record.id, totalUnreadNotificationCount }, "NOTIFICATION_UPDATED"));

  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const postAddSeo = async (req, res, next) => {
  try {

    const settings = await getSettingsData();

    // Prepare metadata for headers
    const logo_img = settings.header_logo_path && fileExists(settings.header_logo_path) ? `${req.appBaseUrl}/uploads/${settings.header_logo_path}` : `${req.appBaseUrl}/uploads/backend/images/settings/header_logo_15477661460.png`;

    const header_data = {
      author: 'localxlist.org',
      title: `Make a post | Localxlist`,
      description: `Make a post | Localxlist`,
      keywords: "Make a post | Localxlist",
      favicon: settings.favicon && fileExists(settings.favicon) ? `${req.appBaseUrl}/uploads/${settings.favicon}` : '',
      image: logo_img,

      ogType: "website",
      ogTitle: `Make a post | Localxlist`,
      ogSiteName: "localxlist.org",
      ogUrl: "https://localxlist.org/",
      ogDescription: `Make a post | Localxlist`,
      ogImage: logo_img,
      ogImageHeight: "377",

      twitterCard: "summary_large_image",
      twitterSite: "localxlist",
      twitterCreator: "localxlist",
      twitterTitle: `Make a post | Localxlist`,
      twitterDescription: `Make a post | Localxlist`,
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

const postAddFetchCountries = async (req, res, next) => {
  try {
    const { user } = req;

    // Validate if the user object is available
    if (!user || !user.id || !user.username) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Fetch the countries
    const countries = await getTableRecord(`SELECT id, country AS name FROM country;`, []);

    // Get images older than 10 minutes with status 0
    const tenMinutesAgo = new Date(Date.now() - 10 * 60000); // 10 minutes ago
    const postImgs = await getTableRecord(
      `SELECT id, path FROM post_img_table WHERE status = ? AND date < ?;`,
      [0, tenMinutesAgo]
    );

    // Prepare an array of promises for deletions
    const deletePromises = postImgs.map(async (image) => {
      try {
        // Delete the image from the database
        await deleteRecord('post_img_table', { id: image.id });

        // Delete the old post picture if it exists
        const imagePath = image.path ? path.join(global.uploadsBaseDir, image.path) : null;
        if (imagePath && fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      } catch (deleteError) {
        console.error(`Error deleting image with ID ${image.id}:`, deleteError);
      }
    });

    // Wait for all delete operations to complete
    await Promise.all(deletePromises);

    // Send successful response with countries
    res.json(createSuccessResponse('Data retrieved successfully.', countries));

  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const postAddFetchCities = async (req, res, next) => {
  try {
    const { user, params } = req;

    const { countryId } = params;

    // Validate if the user object is available
    if (!user || !user.id || !user.username) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Check if required parameters are provided
    if (!countryId) {
      return res.status(400).json(createErrorResponse("Missing required parameters."));
    }

    // Fetch the cities
    const cities = await getTableRecord(`SELECT id, city AS name FROM city WHERE country = ?;`, [countryId]);

    // Send successful response with countries
    res.json(createSuccessResponse('Data retrieved successfully.', cities));

  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const postAddFetchSubCities = async (req, res, next) => {
  try {
    const { user, params } = req;

    const { countryId, cityId } = params;

    // Validate if the user object is available
    if (!user || !user.id || !user.username) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Check if required parameters are provided
    if (!countryId || !cityId) {
      return res.status(400).json(createErrorResponse("Missing required parameters."));
    }

    // Fetch the subCities
    const subCities = await getTableRecord(`SELECT id, subcity AS name FROM subcity WHERE country = ? AND city = ?;`, [countryId, cityId]);

    // Send successful response with countries
    res.json(createSuccessResponse('Data retrieved successfully.', subCities));

  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const postAddFetchCategories = async (req, res, next) => {
  try {
    const { user } = req;

    // Validate if the user object is available
    if (!user || !user.id || !user.username) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Fetch the categories
    const categories = await getTableRecord(`SELECT id, category AS name FROM category;`, []);

    // Send successful response with categories
    res.json(createSuccessResponse('Data retrieved successfully.', categories));

  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const postAddFetchSubCategories = async (req, res, next) => {
  try {
    const { user, params } = req;

    const { categoryId } = params;

    // Validate if the user object is available
    if (!user || !user.id || !user.username) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Check if required parameters are provided
    if (!categoryId) {
      return res.status(400).json(createErrorResponse("Missing required parameters."));
    }

    // Fetch the subcategories
    const subcategories = await getTableRecord(`SELECT id, subcategory AS name FROM subcategory WHERE category = ?;`, [categoryId]);

    // Send successful response with countries
    res.json(createSuccessResponse('Data retrieved successfully.', subcategories));

  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const postAddGetOtherData = async (req, res, next) => {
  try {
    const settings = await getSettingsData();

    const { user } = req;

    // Validate if the user object is available
    if (!user || !user.id || !user.username) {
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    const currency = settings?.currency || '';
    const chargeForPerPost = settings?.charged_for_per_post || '';
    const byDefaultAdShowingFor = settings?.by_default_ad_showing_for || '';

    // Fetch the balance
    const balanceData = await getTableRecord(`SELECT balance FROM balance WHERE username = ?;`, [user.username], true);
    const balance = balanceData?.balance || 0;
    const total_balance = balance > 0 ? `${currency || ''} ${balance || 0}` : `${currency || ''} 0.00`;

    // Fetch the feature_ads
    const feature_ads = await getTableRecord(`SELECT * FROM featured_ad;`);
    const mappedFeatureAds = feature_ads.map((ad) => ({
      value: ad?.id || '',
      label: `${ad?.days || 0} days (${currency}${ad?.amount || 0})`,
    }));

    // Fetch the extended_ads
    const extended_ads = await getTableRecord(`SELECT * FROM extended_ad;`);
    const mappedExtendedAds = extended_ads.map((ad) => ({
      value: ad?.id || '',
      label: `${ad?.days || 0} days (${currency}${ad?.amount || 0})`,
    }));

    const notice = `<p>
                    You will be charged ${currency} ${chargeForPerPost} for making a post to this section.
                  </p>
                  <p>
                    This Ad will be displayed for <strong>${byDefaultAdShowingFor} Days</strong>. Buy
                    any Extented Package or Featured Plan from below to display
                    your ad longer.
                  </p>`;


    // Send successful response with countries
    res.json(createSuccessResponse('Data retrieved successfully.', {
      currency, balance, total_balance, featureAds: mappedFeatureAds, extendedAds: mappedExtendedAds, notice
    }));

  } catch (error) {
    next(error); // Pass the error to the error handler middleware
  }
};

const postAddSave = async (req, res, next) => {
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
    const { title, country_id, city_id, subcity_id, category_id, subcategory_id, extended_ad, featured_ad, location, post_code, description, email, phone, sex, age, sexual_orientation } = req.body;

    // if (!req.files || req.files.length === 0) {
    //   return res.status(400).json(createValidationErrorResponse("No files uploaded.", []));
    // }

    // Validate if the user object is available
    if (!user || !user.id || !user.username) {
      deleteUploadedFilesWhenError();
      return res.status(400).json(createErrorResponse('Invalid user data.'));
    }

    // Check Country, City, SubCity, Category, SubCategory
    const countryDetail = await getTableRecord('SELECT id FROM country WHERE id = ?;', [country_id], true);
    const cityDetail = await getTableRecord('SELECT id FROM city WHERE id = ? AND country = ?;', [city_id, country_id], true);
    const subCityDetail = await getTableRecord('SELECT id FROM subcity WHERE id = ? AND city = ?;', [subcity_id, city_id], true);
    const categoryDetail = await getTableRecord('SELECT id FROM category WHERE id = ?;', [category_id], true);
    const subCategoryDetail = await getTableRecord('SELECT id FROM subcategory WHERE id = ? AND category = ?;', [subcategory_id, category_id], true);

    if (!countryDetail) {
      deleteUploadedFilesWhenError();
      return res.status(400).json(createErrorResponse('Invalid country.'));
    }
    if (!cityDetail) {
      deleteUploadedFilesWhenError();
      return res.status(400).json(createErrorResponse('Invalid city.'));
    }
    if (!subCityDetail) {
      deleteUploadedFilesWhenError();
      return res.status(400).json(createErrorResponse('Invalid sub city.'));
    }
    if (!categoryDetail) {
      deleteUploadedFilesWhenError();
      return res.status(400).json(createErrorResponse('Invalid category.'));
    }
    if (!subCategoryDetail) {
      deleteUploadedFilesWhenError();
      return res.status(400).json(createErrorResponse('Invalid sub category.'));
    }


    const settings = await getSettingsData();
    const default_ad_displayed_for = settings?.by_default_ad_showing_for || '';

    // Check if required parameters are provided
    const requiredParams = [
      "title",
      "country_id",
      "city_id",
      "subcity_id",
      "category_id",
      "subcategory_id",
      // "extended_ad",
      // "featured_ad",
      "location",
      // "post_code",
      "description",
      "email",
      // "phone",
      "sex",
      "age",
      "sexual_orientation"
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
    const defaultAdDisplayedFor = parseInt(default_ad_displayed_for);
    let postDeleteDate = addDays(new Date(), defaultAdDisplayedFor); // Add default days
    postDeleteDate = format(postDeleteDate, "yyyy-MM-dd HH:mm:ss"); // Format the date

    // Read extend_ad value from extend ad table
    const extendAdId = extended_ad;
    const extendAd = await getTableRecord('SELECT amount, days FROM extended_ad WHERE id = ?;', [extendAdId], true);
    if (extendAd) {
      const extendDays = extendAd.days; // Get the additional days
      postDeleteDate = addDays(new Date(postDeleteDate), extendDays); // Add extend days
      postDeleteDate = format(postDeleteDate, "yyyy-MM-dd HH:mm:ss"); // Format the updated date
    }
    // ::::::::: Create post extended delete date ::::::::: 


    // ::::::::: Create post featured_end_date ::::::::: 
    const featuredAdId = featured_ad;
    const featuredAd = await getTableRecord('SELECT amount, days FROM featured_ad WHERE id = ?;', [featuredAdId], true);
    let featuredEndDate = "0000-00-00 00:00:00"; // Default value
    if (featuredAd) {
      const featuredDays = featuredAd.days; // Get the featured days
      featuredEndDate = addDays(new Date(), featuredDays); // Add featured days
      featuredEndDate = format(featuredEndDate, "yyyy-MM-dd HH:mm:ss"); // Format the end date
    }
    // ::::::::: Create post featured_end_date ::::::::: 

    // ::::::::: Check Existence of the Same Post ::::::::: 
    const postCheckCondition = {
      member_id: user?.id || '',
      title: sanitizeTitle,
      country_id,
      city_id,
      subcity_id,
      category_id,
      subcategory_id
    };
    // Construct the SQL query
    const queryParts = [];
    const queryValues = [];
    // Build the WHERE clause dynamically based on which properties are defined
    for (const [key, value] of Object.entries(postCheckCondition)) {
      if (value) {
        queryParts.push(`${key} = ?`);
        queryValues.push(value);
      }
    }
    // Create the final SQL query
    // const postFetch = await getTableRecord(`SELECT id FROM post WHERE ${queryParts.join(' AND ')}`, queryValues, true);
    // if (postFetch) {
    //   deleteUploadedFilesWhenError();
    //   return res.status(400).json(createErrorResponse("This Type Of Post Already Exist.Try With Another Post."));
    // }
    // ::::::::: Check Existence of the Same Post ::::::::: 


    // ::::::::: Check User Balance To Do Post ::::::::: 
    const featured_ad_charge = featuredAd?.amount || 0;
    const extend_ad_charge = extendAd?.amount || 0;
    const total_charge = parseFloat(charged_for_per_post || 0) + parseFloat(extend_ad_charge || 0) + parseFloat(featured_ad_charge || 0);
    const fee = parseFloat(extend_ad_charge || 0) + parseFloat(featured_ad_charge || 0);
    // Get User Balance and check can post or not
    const balanceDetail = await getTableRecord('SELECT id, balance FROM balance WHERE username = ?;', [user.username], true);
    const balance = balanceDetail?.balance || 0;
    if (charged_for_per_post && balance < total_charge) {
      deleteUploadedFilesWhenError();
      return res.status(400).json(createErrorResponse("Sorry Your Balance Is Not Sufficient For This Post.", {
        balance, total_charge, charged_for_per_post
      }));
    } else if (balance < fee && fee !== 0) {
      deleteUploadedFilesWhenError();
      return res.status(400).json(createErrorResponse("Sorry Your Balance Is Not Sufficient For This Post with features.", {
        balance, fee, charged_for_per_post
      }));
    }
    // ::::::::: Check User Balance To Do Post ::::::::: 


    // ::::::::: Check Last added post duration to saving this post ::::::::: 
    const lastPostDetail = await getTableRecord('SELECT id, date FROM post WHERE member_id = ? ORDER BY date DESC LIMIT 1;', [user.id], true);
    if (lastPostDetail) {
      const postDuration = settings?.post_duration || 0;
      const postDate = new Date(lastPostDetail.date).getTime(); // Convert post date to milliseconds
      const expirationTime = postDate + postDuration * 1000; // Add the duration (in milliseconds)
      const currentTime = Date.now(); // Get current time in milliseconds

      console.log({
        expirationTime,
        currentTime,
        cond: currentTime < expirationTime
      });

      // Check if the current time is less than the expiration time
      if (currentTime < expirationTime) {
        deleteUploadedFilesWhenError();
        // If within duration
        return res.status(400).json(createErrorResponse(`Warning! Please wait ${postDuration} seconds before creating a new post.`));
      }
    }
    // ::::::::: Check Last added post duration to saving this post ::::::::: 


    // :::::::::::: Handle file upload :::::::::::: 
    let imgId = '';
    // Check if there are files
    // console.log({filesM:req.files});

    if (req.files && req.files.length > 0) {
      imgId = await getUploadImageId(transaction);
      const insertPromises = req.files.map(async (file) => {
        let newImagePath = `${UPLOADED_PATH.POST}/${file.filename}`;
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
    // Create data object
    const postData = {
      date: new Date(), // Format: "Y-m-d H:i:s"
      member_id: user.id,
      title: sanitizeTitle,
      country_id: country_id,
      city_id: city_id,
      subcity_id: subcity_id,
      category_id: category_id,
      img_id: imgId,
      subcategory_id: subcategory_id,
      location: location,
      post_code: post_code,
      description: description,
      email: email,
      phone: phone,
      sex: sex,
      age: age,
      sexual_oriantation: sexual_orientation,
      extended_ad_id: extendAdId,
      post_delete_date: postDeleteDate,
      featured_ad_id: featuredAdId,
      featured_end_date: featuredEndDate,
      status: 1,
    };
    const postInsertedId = await insertRecord('post', postData, transaction);
    console.log(`Saved Post Id:${postInsertedId}`);

    // Update User Balance
    // const updatedBalance = parseFloat(balance)- parseFloat(total_charge);
    const updatedBalance = parseFloat((parseFloat(balance) - parseFloat(total_charge)).toFixed(2));
    const affectedRows = await updateRecord('balance', { "balance": updatedBalance }, { username: user.username }, transaction);
    console.log(`Updated Balance affectedRows:${affectedRows}`);

    // Add Transation Post
    const transactionPost = {
      member_id: user?.id || '',
      amount: total_charge,
      actual_post_rate: charged_for_per_post,
      post_id: postInsertedId,
      balance_aft_post: updatedBalance,
    };
    const transactionPostInsertedId = await insertRecord('transaction_posts', transactionPost, transaction);
    console.log(`Saved transaction Post Id:${transactionPostInsertedId}`);


    // Commit the transaction
    await commitTransaction(transaction);
    console.log(`All done!!`);
    res.json(createSuccessResponse('Post added successfully.', affectedRows, "POST_SAVED"));

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

module.exports = {
  // Dashboard
  dashboardSeo,
  dashboard,

  // Profile
  profileSeo,
  profile,

  notifications,
  readNotification,

  // Change Profile
  changeProfileSeo,
  changeProfile,
  verifyEmailUpdateVerificationCode,
  deleteAccountSeo,
  deleteAccount,

  // Change Password
  changePasswordSeo,
  changePassword,
  setUsername,

  // Post List
  postListSeo,
  postList,

  // Post View
  postViewSeo,
  postView,

  // Post Edit
  postEditSeo,
  postEdit,
  postEditUpdate,
  postDelete,

  postAddSeo,
  postAddFetchCountries,
  postAddFetchCities,
  postAddFetchSubCities,
  postAddFetchCategories,
  postAddFetchSubCategories,
  postAddGetOtherData,
  postAddSave,

  // Recharge Balance Histories
  balanceRechargeSeo,
  balanceRecharge,
  manualPaymentDetail,
  saveManualRechargeBalance,
  balanceHistoriesSeo,
  balanceHistories,
  invoiceHistories
};
