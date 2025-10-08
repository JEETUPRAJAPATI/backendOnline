const chalk = require('chalk');
const { format, formatDistanceToNow, formatDistanceToNowStrict } = require('date-fns');
const DOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const crypto = require('crypto');
const axios = require('axios');

const fs = require('fs');
const path = require('path');
// Set up DOMPurify with JSDOM
const window = new JSDOM('').window;
const purify = DOMPurify(window);
const xss = require('xss');

// Define a custom morgan format using chalk for key-value pairs
// Helper functions (move outside)
function getMethodEmoji(method) {
  const emojis = {
    'GET': '📥',
    'POST': '📤',
    'PUT': '✏️',
    'DELETE': '🗑️',
    'PATCH': '🩹',
    'OPTIONS': '⚙️'
  };
  return emojis[method.toUpperCase()] || '❓';
}

function getStatusColor(status) {
  if (status >= 500) return 'red';
  if (status >= 400) return 'magenta';
  if (status >= 300) return 'cyan';
  if (status >= 200) return 'green';
  return 'gray';
}

const customMorganFormat = (tokens, req, res) => {
  // Get protocol (http/https) - accounts for proxies
  const protocol = req.protocol;

  // Get host from headers (more reliable than req.hostname with proxies)
  const host = req.get('host');

  // Construct full URL
  const fullUrl = `${protocol}://${host}${req.originalUrl}`;
  const remoteIp = req.ip || req.connection.remoteAddress;
  // const remoteUser = req.headers['authorization'] || '-';
  const remoteUser = req.headers['authorization']
    ? `${req.headers['authorization'].substring(0, 15)}...`
    : '-';
  const date = new Date().toISOString();
  const method = req.method;
  const url = req.originalUrl;
  const status = res.statusCode;
  const responseTime = tokens['response-time'](req, res);
  const referrer = req.get('Referrer') || '-';
  const userAgent = req.get('User-Agent') || '-';

  const formattedLog = [
    `${chalk.bold.green('🌐 URL →')} ${chalk.underline.cyan(fullUrl)}`,  // Use fullUrl here
    `${chalk.bold.magenta('👤 User →')} ${chalk.red.bold(remoteUser || 'Anonymous')}`,
    `${chalk.bold.blue('📡 IP →')} ${chalk.blueBright(remoteIp)}`,
    `${chalk.bold.yellow(`${getMethodEmoji(method)} ${method.toUpperCase()} →`)} ${chalk.yellowBright(url)}`,
    `${chalk.bold[getStatusColor(status)](`📊 Status →`)} ${chalk.bold[getStatusColor(status)](status)}`,
    `${chalk.bold.gray('⏱️  Time →')} ${chalk.greenBright(`${responseTime}ms`)}`,
    `${chalk.bold.white('🔗 Referrer →')} ${chalk.gray(referrer || 'Direct')}`,
    `${chalk.bold.gray('🖥️  Agent →')} ${chalk.gray(userAgent?.slice(0, 30) + (userAgent?.length > 30 ? '...' : ''))}`,
    `${chalk.bold.cyan('📅 Date →')} ${chalk.green(date)}`
  ].join('\n');

  return `${chalk.gray('┌───')}\n${formattedLog}\n${chalk.gray('└───')}`;
};
const ucwords = (str) => {
  return str
    .toLowerCase() // Convert the entire string to lowercase first (optional)
    .replace(/\b\w/g, (match) => match.toUpperCase()); // Capitalize the first letter of each word
}

const formattedDate = (dateString, formatString) => dateString ? format(new Date(dateString), formatString) : dateString;


const getRelativeTime = (dateString) => dateString ? formatDistanceToNowStrict(new Date(dateString), { addSuffix: true }) : dateString

// XSS sanitize utility function
const sanitizeXSSInput1 = (input) => {
  if (input && typeof input === 'string') {
    return xss(purify.sanitize(input)); // sanitize with DOMPurify then escape with xss
  }
  return input; // Return as is if input is not a string
};

// XSS sanitize utility function
const sanitizeXSSInput = (input, config) => {
  const ALLOWED_ATTR = config?.EDITOR_ALLOWED_ATTR || [];
  const XSS_OPTIONS = config?.XSS_OPTIONS || {};

  if (input && typeof input === 'string') {
    // var xss_options = {
    //   whiteList: {
    //     h1: ["style", "title", "class"],
    //     a: ["href", "title", "target", "rel"],
    //   },
    // };

    // Sanitize input using DOMPurify to remove dangerous elements like <script>
    let sanitizedInput;
    if (ALLOWED_ATTR.length > 0) {
      sanitizedInput = xss(purify.sanitize(input, {
        ALLOWED_ATTR: ALLOWED_ATTR, // Explicitly allow 'target'
      }), XSS_OPTIONS);

      console.log({ input, ALLOWED_ATTR, XSS_OPTIONS, sanitizedInput });

    } else {
      sanitizedInput = xss(purify.sanitize(input), XSS_OPTIONS);
    }

    // Additional custom check: Remove any remaining <script> tags just to be safe
    sanitizedInput = sanitizedInput.replace(/<script.*?>.*?<\/script>/gi, '');  // Remove <script> tags

    // Optionally, we can strip out inline event handlers (e.g., onclick="alert('XSS')")
    sanitizedInput = sanitizedInput.replace(/on\w+="[^"]*"/g, '');  // Remove inline event handlers

    // Strip out any potential JavaScript function calls like alert(), prompt(), etc.
    sanitizedInput = sanitizedInput.replace(/(alert|prompt|confirm|eval)\([^\)]*\)/gi, '');  // Remove JavaScript functions

    return sanitizedInput;
  }
  return input; // Return the input as is if it's not a string
};

// Simulate the login_token function that returns a fixed admin email ID
function loginToken() {
  return 'muhibbullah611@gmail.com';  // Replace with the fixed admin email ID
}

// Function to hash the password
const hashPassword = (password) => {
  const token = loginToken();  // Get the fixed admin email
  const combinedString = password + token;  // Concatenate password with the token
  // Create MD5 hash using Node.js 'crypto' module
  const hash = crypto.createHash('md5').update(combinedString).digest('hex');
  return hash;  // Return the hashed password
}

// Function to verify Google Captcha
const verifyGoogleCaptcha = async (secretKey, captchaResponse, ip) => {
  try {
    // Sending request to the Google reCAPTCHA API
    const { data } = await axios.post(
      `https://www.google.com/recaptcha/api/siteverify`,
      null, {
      params: {
        secret: secretKey,
        response: captchaResponse,
        remoteip: ip
      }
    }
    );

    // Return the success status and other details from the response
    return data.success;  // This returns true/false based on the verification result
  } catch (error) {
    console.error("Error verifying reCAPTCHA:", error);
    throw new Error("Error verifying reCAPTCHA");
  }
};

const generateRandomCode = () => {
  return new Date().getTime(); // Current timestamp in milliseconds
};

/**
 * Check if a file exists in the given directory
 * @param {string} baseDir - The base directory path (absolute path)
 * @param {string} filePath - The relative path to the file
 * @returns {boolean} - Returns true if the file exists, otherwise false
 */
const fileExists = (filePath) => {
  const fullPath = path.join(global.uploadsBaseDir, filePath);
  return fs.existsSync(fullPath);
};

// A helper function to format totals for K, M, B, T
const formatTotal = (total) => {
  if (total >= 1000000000000) { // 1 trillion
    return (total / 1000000000000).toFixed(1) + 'T'; // e.g., 1.2T
  }
  if (total >= 1000000000) { // 1 billion
    return (total / 1000000000).toFixed(1) + 'B'; // e.g., 1.2B
  }
  if (total >= 1000000) { // 1 million
    return (total / 1000000).toFixed(1) + 'M'; // e.g., 1.2M
  }
  if (total >= 1000) { // 1 thousand
    return (total / 1000).toFixed(1) + 'K'; // e.g., 1.0K
  }
  return total.toString(); // Return the number as-is for less than 1000
};

const truncatedContent = (text, customLength = 100) => {
  return text.length > customLength
    ? text.slice(0, customLength) + '...'
    : text;
};

const slugify = (text) => {
  if (!text) return '';

  return text.toString()
    .normalize('NFKD')               // Normalize Unicode
    .toLowerCase()                   // Convert to lowercase
    .trim()                          // Trim whitespace
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars except -
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start
    .replace(/-+$/, '');            // Trim - from end
};

const calculateReadTime = (content, wordsPerMinute = 200, secondsPerImage = 10) => {
  // Strip HTML tags to get plain text
  const text = content.replace(/<[^>]+>/g, '').trim();

  // Count words (split by whitespace and filter out empty strings)
  const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;

  // Count images (match <img> tags)
  const imageCount = (content.match(/<img[^>]+>/g) || []).length;

  // Calculate total time in seconds
  const wordsPerSecond = wordsPerMinute / 60;
  const readingTimeSeconds = wordCount / wordsPerSecond; // Words divided by words per second
  const imageTimeSeconds = imageCount * secondsPerImage;
  const totalSeconds = readingTimeSeconds + imageTimeSeconds;

  // Format output based on total seconds
  if (totalSeconds < 60) {
    const seconds = Math.ceil(totalSeconds);
    return `${seconds} ${seconds === 1 ? 'second' : 'seconds'} read`;
  } else if (totalSeconds < 3600) {
    const minutes = Math.ceil(totalSeconds / 60);
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} read`;
  } else {
    const hours = Math.ceil(totalSeconds / 3600);
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} read`;
  }
};


module.exports = { customMorganFormat, ucwords, formattedDate, getRelativeTime, sanitizeXSSInput, hashPassword, verifyGoogleCaptcha, generateRandomCode, fileExists, formatTotal, truncatedContent, slugify, calculateReadTime };
