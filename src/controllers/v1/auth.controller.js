const path = require('path');
const { createSuccessResponse, createErrorResponse } = require('../../utils/responseUtils');
const { getHeaderMetaData } = require('../../utils/metaUtils');
const { generateRandomCode, hashPassword, fileExists } = require('../../utils/generalUtils');
const { getSettingsData, getTableRecord, insertRecord, getAlertMessage, updateRecord, saveMemberDefaultCredit, getEmailSMTPConfig, getPageMetaData } = require("../../services/common.service");
const { loadEmailTemplate, sendEmail } = require('../../utils/sendMail.Utils');
const { generateToken, generateAccessToken, generateRefreshToken, refreshAccessToken } = require('../../utils/jwt');
const { OAuth2Client } = require('google-auth-library');


const { COMMON_CONFIG, META_PAGES } = require('../../constants');
const APP_ENV = process.env.NODE_ENV || "development";
const { GOOGLE_CLIENT_ID } = COMMON_CONFIG[APP_ENV];

const signupSeo = async (req, res, next) => {
  try {

    const settings = await getSettingsData();

    let logo_img = 'backend/images/settings/header_logo_15477661460.png';
    if (settings?.header_logo_path && fileExists(settings.header_logo_path)) {
      logo_img = `${req.appBaseUrl}/uploads/${settings.header_logo_path}`;
    } else {
      logo_img = `${req.appBaseUrl}/uploads/${logo_img}`;
    }

    const site_name = settings?.site_name || 'localxlist';
    const pageMetaData = await getPageMetaData(META_PAGES.SIGNUP);
    // Generate headers using the metadata utility
    const header_data = {
      title: pageMetaData?.title || `Signup | ${site_name}`,
      description: pageMetaData?.description || `Signup | ${site_name}`,
      keywords: pageMetaData?.keywords || `Signup | ${site_name}`,
      robots: pageMetaData?.robots || "",

      ogTitle: pageMetaData?.og_title || `Signup | ${site_name}`,
      ogDescription: pageMetaData?.og_description || `Signup | ${site_name}`,
      ogImage: pageMetaData?.og_image || logo_img || '',
      ogImageHeight: pageMetaData?.og_image_height || '377',
      ogImageWidth: pageMetaData?.og_image_width || '',
      ogSiteName: pageMetaData?.og_site_name || 'localxlist.org',
      ogType: pageMetaData?.og_type || 'localxlist.org',
      ogUrl: pageMetaData?.og_url || 'https://localxlist.org/',

      twitterTitle: pageMetaData?.twitter_title || `Signup | ${site_name}`,
      twitterDescription: pageMetaData?.twitter_description || `Signup | ${site_name}`,
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

const signup = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    const settings = await getSettingsData();

    // Prepare logo for Email
    const logo_img = settings.header_logo_path && fileExists(settings.header_logo_path) ? `${req.appBaseUrl}/uploads/${settings.header_logo_path}` : `${req.appBaseUrl}/uploads/backend/images/settings/header_logo_15477661460.png`;


    const user = await getTableRecord(`SELECT id, username, email, verified FROM member WHERE username = ? OR email = ?`, [username, email], true);

    if (user) {
      //  check if user has not verified his account yet
      if (user.verified == 0) {
        return res.status(400).json(createErrorResponse(message = "You have not verified your account.", data = { userId: user?.id }, code = 'USER_NOT_VERIFIED'));
      }

      if (user.username == username) {
        return res.status(400).json(createErrorResponse(message = "This username is already taken.", data = null, code = 'USERNAME_ALREADY_EXIST'));
      }
      else if (user.email == email) {
        return res.status(400).json(createErrorResponse(message = "This email is already taken.", data = null, code = 'EMAIL_ALREADY_EXIST'));
      }
    }

    // Generate a confirmation code
    const confirmationCode = generateRandomCode();

    // Create new user data (you can save this to your database)
    const newUser = {
      date_time: new Date(),
      username,
      email,
      password: hashPassword(password), // Hash password before storing
      confirmation_code: confirmationCode,
      verified: 0,
    };

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

    // If Mail Success Then Save
    // Save the user to the database
    const insertedId = await insertRecord('member', newUser);

    res.json(createSuccessResponse('User registered successfully. Please check and verify your email.', { userId: insertedId }, code = "SIGNUP_SUCCESS"));

  } catch (error) {
    next(error);
  }
};

const loginSeo = async (req, res, next) => {
  try {

    const settings = await getSettingsData();

    let logo_img = 'backend/images/settings/header_logo_15477661460.png';
    if (settings?.header_logo_path && fileExists(settings.header_logo_path)) {
      logo_img = `${req.appBaseUrl}/uploads/${settings.header_logo_path}`;
    } else {
      logo_img = `${req.appBaseUrl}/uploads/${logo_img}`;
    }

    const site_name = settings?.site_name || 'localxlist';
    const pageMetaData = await getPageMetaData(META_PAGES.LOGIN);
    // Generate headers using the metadata utility
    const header_data = {
      title: pageMetaData?.title || `Login | ${site_name}`,
      description: pageMetaData?.description || `Login | ${site_name}`,
      keywords: pageMetaData?.keywords || `Login | ${site_name}`,
      robots: pageMetaData?.robots || "",

      ogTitle: pageMetaData?.og_title || `Login | ${site_name}`,
      ogDescription: pageMetaData?.og_description || `Login | ${site_name}`,
      ogImage: pageMetaData?.og_image || logo_img || '',
      ogImageHeight: pageMetaData?.og_image_height || '377',
      ogImageWidth: pageMetaData?.og_image_width || '',
      ogSiteName: pageMetaData?.og_site_name || 'localxlist.org',
      ogType: pageMetaData?.og_type || 'localxlist.org',
      ogUrl: pageMetaData?.og_url || 'https://localxlist.org/',

      twitterTitle: pageMetaData?.twitter_title || `Login | ${site_name}`,
      twitterDescription: pageMetaData?.twitter_description || `Login | ${site_name}`,
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

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const hashedPassword = hashPassword(password); // Hash password before storing
    const user = await getTableRecord(`SELECT id, username, email, verified, status, oauth_id, password FROM member WHERE email = ?;`, [email], true);

    if (!user) {
      return res.status(400).json(createErrorResponse(message = "Invalid email.", data = null, code = 'INALID_EMAIL'));
    }

    if (user.email && user.password === '' && user.oauth_id !== '') {
      return res.status(400).json(createErrorResponse(message = "You haven't set a password yet. Please log in using Google.", data = null, code = 'PASSWORD_NOT_SET'));
    }

    if (user.email && user.password !== hashedPassword) {
      return res.status(400).json(createErrorResponse(message = "Invalid email or password.", data = null, code = 'INALID_LOGIN_CREDENTIAL'));
    }

    if (user && user?.status !== 1) {
      return res.status(400).json(createErrorResponse(message = "Account is deactivated.", data = null, code = 'ACCOUNT_STATUS_DEACTIVATED'));
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

const getLoginAlertMsg = async (req, res, next) => {
  try {
    const alertMessageDetail = await getAlertMessage('LOGIN');
    res.json(createSuccessResponse("Data retrieved successfully.", alertMessageDetail?.msg || ""));
  } catch (error) {
    next(error);
  }
};


const googleLoginAuth = async (req, res, next) => {
  try {
    const { idToken } = req.body;
    const settings = await getSettingsData();

    const client = new OAuth2Client(GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID,
    });
    const { email, name, picture, given_name, family_name, sub, exp } = ticket.getPayload();

    //   {
    //     "iss": "https://accounts.google.com",
    //     "azp": "652338500262-0q36gp2e5s2pf5ihl0pa964ofm3l6tal.apps.googleusercontent.com",
    //     "aud": "652338500262-0q36gp2e5s2pf5ihl0pa964ofm3l6tal.apps.googleusercontent.com",
    //     "sub": "103541959226538808919",
    //     "email": "dignizanttest@gmail.com",
    //     "email_verified": true,
    //     "nbf": 1733230987,
    //     "name": "Dignizant Test",
    //     "picture": "https://lh3.googleusercontent.com/a/ACg8ocJZw_BXLaIdsLpi7veAT_zYNuz23asiRl7MeoNWApfAECYIOw=s96-c",
    //     "given_name": "Dignizant",
    //     "family_name": "Test",
    //     "iat": 1733231287,
    //     "exp": 1733234887,
    //     "jti": "b1d3fc0920908e21f8e67de949310facfede0a92"
    // }


    const user = await getTableRecord(`SELECT id, username, email, verified, status FROM member WHERE email = ?;`, [email], true);

    if (user && user?.status !== 1) {
      return res.status(400).json(createErrorResponse(message = "Account is deactivated.", data = null, code = 'ACCOUNT_STATUS_DEACTIVATED'));
    }

    let jwtUser = {
      id: '',
      username: '',
      email: '',
    };

    if (user) {
      const userData = {
        name: `${given_name} ${family_name}`,
        path: picture,
        verified: 1,
        oauth_id: sub,
        date_time: new Date(),
      };
      // Update Data
      updateRecord('member', userData, { id: user?.id });

      jwtUser = {
        id: user?.id,
        username: user?.username,
        email: user?.email,
      };
    }
    else {
      const userData = {
        name: `${given_name} ${family_name}`,
        username: '',
        email,
        password: '',
        path: picture,
        verified: 1,
        oauth_id: sub,
        status: 1,
        date_time: new Date(),
      };

      // Insert Data
      const insertedId = await insertRecord('member', userData);

      jwtUser = {
        id: insertedId,
        username: email,
        email: email,
      };

      // Save Member Credit Data
      const creditData = {
        username: email,
        date: new Date(),
        balance: settings?.member_default_cradit || 0
      };
      saveMemberDefaultCredit(creditData);
    }

    // Generate JWT Token
    const accessToken = generateAccessToken(jwtUser);
    const refreshToken = generateRefreshToken(jwtUser);

    // Respond with success and token
    res.json(
      createSuccessResponse(
        message = "You have logged-in through google successfully.", data = { token: accessToken, refreshToken, id: jwtUser?.id }, code = "LOGIN_SUCCESS")
    );

  } catch (error) {
    next(error);
  }
};


const signupVerificationSeo = async (req, res, next) => {
  try {

    const settings = await getSettingsData();

    let logo_img = 'backend/images/settings/header_logo_15477661460.png';
    if (settings?.header_logo_path && fileExists(settings.header_logo_path)) {
      logo_img = `${req.appBaseUrl}/uploads/${settings.header_logo_path}`;
    } else {
      logo_img = `${req.appBaseUrl}/uploads/${logo_img}`;
    }

    const site_name = settings?.site_name || 'localxlist';
    const pageMetaData = await getPageMetaData(META_PAGES.SIGNUP_VERIFICATION);
    // Generate headers using the metadata utility
    const header_data = {
      title: pageMetaData?.title || `Sign Up Verification | ${site_name}`,
      description: pageMetaData?.description || `Sign Up Verification | ${site_name}`,
      keywords: pageMetaData?.keywords || `Sign Up Verification | ${site_name}`,
      robots: pageMetaData?.robots || "",

      ogTitle: pageMetaData?.og_title || `Sign Up Verification | ${site_name}`,
      ogDescription: pageMetaData?.og_description || `Sign Up Verification | ${site_name}`,
      ogImage: pageMetaData?.og_image || logo_img || '',
      ogImageHeight: pageMetaData?.og_image_height || '377',
      ogImageWidth: pageMetaData?.og_image_width || '',
      ogSiteName: pageMetaData?.og_site_name || 'localxlist.org',
      ogType: pageMetaData?.og_type || 'localxlist.org',
      ogUrl: pageMetaData?.og_url || 'https://localxlist.org/',

      twitterTitle: pageMetaData?.twitter_title || `Sign Up Verification | ${site_name}`,
      twitterDescription: pageMetaData?.twitter_description || `Sign Up Verification | ${site_name}`,
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

const signupSendVerificationCode = async (req, res, next) => {
  try {
    const { userId } = req.body;
    const settings = await getSettingsData();

    // Prepare logo for Email
    const logo_img = settings.header_logo_path && fileExists(settings.header_logo_path) ? `${req.appBaseUrl}/uploads/${settings.header_logo_path}` : `${req.appBaseUrl}/uploads/backend/images/settings/header_logo_15477661460.png`;

    const user = await getTableRecord(`SELECT id, username, email, verified FROM member WHERE id = ?`, [userId], true);
    if (!user) {
      return res.status(400).json(createErrorResponse(message = "Invalid email.", data = null, code = ''));
    }

    // Generate a confirmation code
    const confirmationCode = generateRandomCode();

    // Create new user data (you can save this to your database)
    const newUser = {
      date_time: new Date(),
      confirmation_code: confirmationCode,
    };

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
      to: user?.email,
      subject: 'Verification Code | Localxlist',
      html: emailContent,
    };
    const sentMail = await sendEmail(emailOptions);
    logger.info({ sentMail });

    // If Mail Success Then Save
    // Update the code to the database
    const affectedRows = await updateRecord('member', newUser, { id: userId });

    res.json(createSuccessResponse('Verification code sent successfully. Please check and verify your email.'));

  } catch (error) {
    next(error);
  }
};

const signupVerifyVerificationCode = async (req, res, next) => {
  try {
    const { confirmation_code, userId } = req.body;
    const settings = await getSettingsData();


    const user = await getTableRecord(`SELECT id, username, email, verified FROM member WHERE id = ? AND confirmation_code = ?`, [userId, confirmation_code], true);

    if (!user) {
      return res.status(400).json(createErrorResponse(message = "Invalid confirmation code.", data = null, code = ''));
    }

    // Change Status and Verified
    const updateMemberData = {
      status: 1,
      verified: 1,
      confirmation_code: ''
    };
    const affectedRows = await updateRecord('member', updateMemberData, { id: userId, confirmation_code });

    // Save Member Credit Data
    const creditData = {
      username: user?.username,
      date: new Date(),
      balance: settings?.member_default_cradit || 0
    };
    saveMemberDefaultCredit(creditData);
    res.json(createSuccessResponse('Your Registration Successfully Completed, Now You Can Login, Thank You.', data = "", code = "SIGNUP_VERIFICATION_SUCCESS"));

  } catch (error) {
    next(error);
  }
};

const forgotVerificationSeo = async (req, res, next) => {
  try {

    const settings = await getSettingsData();

    let logo_img = 'backend/images/settings/header_logo_15477661460.png';
    if (settings?.header_logo_path && fileExists(settings.header_logo_path)) {
      logo_img = `${req.appBaseUrl}/uploads/${settings.header_logo_path}`;
    } else {
      logo_img = `${req.appBaseUrl}/uploads/${logo_img}`;
    }

    const site_name = settings?.site_name || 'localxlist';
    const pageMetaData = await getPageMetaData(META_PAGES.FORGOT_VERIFICATION);
    // Generate headers using the metadata utility
    const header_data = {
      title: pageMetaData?.title || `Forgot Verification Code? | ${site_name}`,
      description: pageMetaData?.description || `Forgot Verification Code? | ${site_name}`,
      keywords: pageMetaData?.keywords || `Forgot Verification Code? | ${site_name}`,
      robots: pageMetaData?.robots || "",
      ogTitle: pageMetaData?.og_title || `Forgot Verification Code? | ${site_name}`,
      ogDescription: pageMetaData?.og_description || `Forgot Verification Code? | ${site_name}`,
      ogImage: pageMetaData?.og_image || logo_img || '',
      ogImageHeight: pageMetaData?.og_image_height || '377',
      ogImageWidth: pageMetaData?.og_image_width || '',
      ogSiteName: pageMetaData?.og_site_name || 'localxlist.org',
      ogType: pageMetaData?.og_type || 'localxlist.org',
      ogUrl: pageMetaData?.og_url || 'https://localxlist.org/',

      twitterTitle: pageMetaData?.twitter_title || `Forgot Verification Code? | ${site_name}`,
      twitterDescription: pageMetaData?.twitter_description || `Forgot Verification Code? | ${site_name}`,
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

const forgotVerificationSendVerificationCode = async (req, res, next) => {
  try {
    const { username } = req.body;
    const settings = await getSettingsData();

    const user = await getTableRecord(`SELECT id, username, email, verified FROM member WHERE (username = ? OR email = ?) AND verified = 0 AND status = 0`, [username, username], true);

    if (!user) {
      return res.status(400).json(createErrorResponse(message = "User not found with this username or email for verification.", data = null, code = 'USER_NOT_FOUND'));
    }

    // Send Mail to Found Account ======
    // Generate a confirmation code
    const confirmationCode = generateRandomCode();

    // Create new user data (you can save this to your database)
    const newUser = {
      date_time: new Date(),
      confirmation_code: confirmationCode,
    };

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
      to: user?.email,
      subject: 'Verification Code | Localxlist',
      html: emailContent,
    };
    const sentMail = await sendEmail(emailOptions);
    logger.info({ sentMail });

    // If Mail Success Then Save
    // Update the code to the database
    const affectedRows = await updateRecord('member', newUser, { id: user?.id });

    res.json(createSuccessResponse('Verification code sent successfully. Please check and verify your email.', { userId: user?.id }, code = "VERIFICATION_CODE_SENT_SUCCESS"));

  } catch (error) {
    next(error);
  }
};

const forgotPasswordSeo = async (req, res, next) => {
  try {

    const settings = await getSettingsData();

    let logo_img = 'backend/images/settings/header_logo_15477661460.png';
    if (settings?.header_logo_path && fileExists(settings.header_logo_path)) {
      logo_img = `${req.appBaseUrl}/uploads/${settings.header_logo_path}`;
    } else {
      logo_img = `${req.appBaseUrl}/uploads/${logo_img}`;
    }

    const site_name = settings?.site_name || 'localxlist';
    const pageMetaData = await getPageMetaData(META_PAGES.FORGOT_PASSWORD);
    // Generate headers using the metadata utility
    const header_data = {
      title: pageMetaData?.title || `Forgot Password? | ${site_name}`,
      description: pageMetaData?.description || `Forgot Password? | ${site_name}`,
      keywords: pageMetaData?.keywords || `Forgot Password? | ${site_name}`,
      robots: pageMetaData?.robots || "",
      ogTitle: pageMetaData?.og_title || `Forgot Password? | ${site_name}`,
      ogDescription: pageMetaData?.og_description || `Forgot Password? | ${site_name}`,
      ogImage: pageMetaData?.og_image || logo_img || '',
      ogImageHeight: pageMetaData?.og_image_height || '377',
      ogImageWidth: pageMetaData?.og_image_width || '',
      ogSiteName: pageMetaData?.og_site_name || 'localxlist.org',
      ogType: pageMetaData?.og_type || 'localxlist.org',
      ogUrl: pageMetaData?.og_url || 'https://localxlist.org/',

      twitterTitle: pageMetaData?.twitter_title || `Forgot Password? | ${site_name}`,
      twitterDescription: pageMetaData?.twitter_description || `Forgot Password? | ${site_name}`,
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

const sendResetPasswordVerificationCode = async (req, res, next) => {
  try {
    const { username } = req.body;
    const settings = await getSettingsData();
    const SMTPConfig = await getEmailSMTPConfig();

    // Prepare metadata for headers
    const logo_img = settings.header_logo_path && fileExists(settings.header_logo_path) ? `${req.appBaseUrl}/uploads/${settings.header_logo_path}` : `${req.appBaseUrl}/uploads/backend/images/settings/header_logo_15477661460.png`;

    const user = await getTableRecord(`SELECT id, username, email, verified FROM member WHERE username = ? OR email = ?`, [username, username], true);

    if (!user) {
      return res.status(400).json(createErrorResponse("Your username/email is invalid.", null, 'USER_NOT_FOUND'));
    }

    // Send Mail to Found Account ======
    // Generate a confirmation code
    const confirmationCode = generateRandomCode();

    // Create new user data (you can save this to your database)
    const newUser = {
      date_time: new Date(),
      confirmation_code: confirmationCode,
    };

    // ===================== Send the verification email: Start ===================== 
    // Prepare placeholders
    const placeholders = {
      // LOGO_URL: "https://localxlist.com/backend/images/settings/header_logo_15854785210.png",
      LOGO_URL: logo_img,
      VERIFICATION_CODE: confirmationCode,
    };

    // Load Verification Email Template
    const templatePath = path.join(__dirname, '../../email_templates/forgotPasswordVerificationMailTemplate.html');
    const emailContent = loadEmailTemplate(templatePath, placeholders);

    const emailOptions = {
      to: user?.email,
      subject: 'Reset Password Code | Localxlist',
      html: emailContent,
      from: `${SMTPConfig?.email_from} <${SMTPConfig.smtp_user}>`
    };

    // Custom Email Config
    const customConfig = SMTPConfig ? {
      service: SMTPConfig?.protocol,
      host: SMTPConfig?.smtp_host,
      port: SMTPConfig?.smtp_port,
      secure: true,
      auth: {
        user: SMTPConfig?.smtp_user,
        pass: SMTPConfig?.smtp_pass,
      },
    } : null;
    const sentMail = await sendEmail(emailOptions, customConfig);
    logger.info({ logo_img, sentMail, customConfig, emailOptions });
    // ===================== Send the verification email: End ===================== 

    // If Mail Success Then Save
    // Update the code to the database
    const affectedRows = await updateRecord('member', newUser, { id: user?.id });

    res.json(createSuccessResponse('Reset password code sent successfully. Please check and verify your account.', { userId: user?.id }, code = "VERIFICATION_CODE_SENT_SUCCESS"));

  } catch (error) {
    next(error);
  }
};

const resetPasswordSeo = async (req, res, next) => {
  try {

    const settings = await getSettingsData();

    let logo_img = 'backend/images/settings/header_logo_15477661460.png';
    if (settings?.header_logo_path && fileExists(settings.header_logo_path)) {
      logo_img = `${req.appBaseUrl}/uploads/${settings.header_logo_path}`;
    } else {
      logo_img = `${req.appBaseUrl}/uploads/${logo_img}`;
    }

    const site_name = settings?.site_name || 'localxlist';
    const pageMetaData = await getPageMetaData(META_PAGES.RESET_PASSWORD);
    // Generate headers using the metadata utility
    const header_data = {
      title: pageMetaData?.title || `Reset Password | ${site_name}`,
      description: pageMetaData?.description || `Reset Password | ${site_name}`,
      keywords: pageMetaData?.keywords || `Reset Password | ${site_name}`,
      robots: pageMetaData?.robots || "",
      ogTitle: pageMetaData?.og_title || `Reset Password | ${site_name}`,
      ogDescription: pageMetaData?.og_description || `Reset Password | ${site_name}`,
      ogImage: pageMetaData?.og_image || logo_img || '',
      ogImageHeight: pageMetaData?.og_image_height || '377',
      ogImageWidth: pageMetaData?.og_image_width || '',
      ogSiteName: pageMetaData?.og_site_name || 'localxlist.org',
      ogType: pageMetaData?.og_type || 'localxlist.org',
      ogUrl: pageMetaData?.og_url || 'https://localxlist.org/',

      twitterTitle: pageMetaData?.twitter_title || `Reset Password | ${site_name}`,
      twitterDescription: pageMetaData?.twitter_description || `Reset Password | ${site_name}`,
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

const resetPasswordWithVerification = async (req, res, next) => {
  try {
    const { reset_password_code, new_password } = req.body;

    const user = await getTableRecord(`SELECT id, username, email FROM member WHERE confirmation_code = ? AND status = ?`, [reset_password_code, 1], true);

    if (!user) {
      return res.status(400).json(createErrorResponse(message = "Invalid reset password code.", data = null, code = ''));
    }

    // Change Status and Verified
    const updateMemberData = {
      password: hashPassword(new_password), // Hash password before storing
    };
    const affectedRows = await updateRecord('member', updateMemberData, { id: user?.id });

    res.json(createSuccessResponse('Your new password has been set successfully.', data = "", code = "RESET_PASSWORD_SUCCESS"));

  } catch (error) {
    next(error);
  }
};

const refreshToken = async (req, res, next) => {
  try {
    const { token: refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json(createErrorResponse("Refresh token is required.", "INVALID_REFRESH_TOKEN"));
    }

    // Verify the refresh token
    let newAccessToken;
    try {
      newAccessToken = refreshAccessToken(refreshToken); // Call utility function to generate new access token
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json(createErrorResponse("Invalid refresh token.", null, code = "INVALID_REFRESH_TOKEN"));
      } else if (error.name === 'TokenExpiredError') {
        return res.status(401).json(createErrorResponse("Refresh token has expired.", null, code = "EXPIRED_REFRESH_TOKEN"));
      } else {
        return res.status(500).json(createErrorResponse("An error occurred while refreshing the token."));
      }
    }

    // Respond with the new access token
    res.json(createSuccessResponse("Token has been refreshed successfully.", {
      token: newAccessToken,
    }));
  } catch (error) {
    next(error); // Pass unexpected errors to the global error handler
  }
};


module.exports = {
  signupSeo,
  signup,
  getLoginAlertMsg,
  loginSeo,
  login,
  googleLoginAuth,
  signupSendVerificationCode,
  signupVerificationSeo,
  signupVerifyVerificationCode,
  forgotVerificationSeo,
  forgotPasswordSeo,
  forgotVerificationSendVerificationCode,
  sendResetPasswordVerificationCode,
  resetPasswordSeo,
  resetPasswordWithVerification,
  refreshToken
};
