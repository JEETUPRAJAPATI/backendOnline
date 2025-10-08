const fs = require('fs');

const { EMAIL_CONFIG } = require('../constants');
const nodemailer = require('nodemailer');

const APP_ENV = process.env.NODE_ENV || 'development';
const emailConfig = EMAIL_CONFIG['development'] || {};

/**
 * Load email template and replace placeholders with actual data.
 *
 * @param {string} templatePath - Path to the HTML template.
 * @param {Object} placeholders - Key-value pairs for placeholder replacements.
 * @returns {string} - Email content with replaced data.
 */
const loadEmailTemplate = (templatePath, placeholders) => {
  try {
    let template = fs.readFileSync(templatePath, 'utf-8');

    for (const [key, value] of Object.entries(placeholders)) {
      const regex = new RegExp(`{{${key}}}`, 'g'); // Match {{PLACEHOLDER}}
      template = template.replace(regex, value);
    }

    return template;
  } catch (error) {
    throw new Error(`Error loading email template: ${error.message}`);
  }
};



/**
 * Send an email with the specified options.
 *
 * @param {Object} options - Email options.
 * @param {string} options.to - Recipient email address.
 * @param {string} options.subject - Email subject.
 * @param {string} options.text - Plain text email content.
 * @param {string} options.html - HTML email content.
 * @param {string} [options.from] - Sender email address (optional).
 * @param {Object} [customConfig] - Custom email configuration (optional).
 * @returns {Promise<string>} - The response of the email sending.
 */
const sendEmail = async (options, customConfig) => {
  const config = customConfig || emailConfig;

  if (!config.auth || !config.auth.user || !config.auth.pass || !config.service) {
    throw new Error('Invalid email configuration.');
  }

  if (!options.to || !options.subject) {
    throw new Error('Recipient email address and subject are required.');
  }

  // Nodemailer configuration
  const transporter = nodemailer.createTransport({
    service: config.service,
    host: config.host,
    port: config.port || 587, // Default to TLS port
    secure: config.secure || false, // Use TLS
    tls: config.tls || { rejectUnauthorized: false },
    auth: {
      user: config.auth.user,
      pass: config.auth.pass,
    },
  });

  // Email options
  const mailOptions = {
    from: options.from || `Localxlist <${config.auth.user}>`,
    to: options.to,
    subject: options.subject,
    text: options.text || undefined,
    html: options.html || undefined,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.response);
    return info.response;
  } catch (error) {
    console.error('Error sending email:', error.message);
    throw new Error(error.message);
  }
};

module.exports = { loadEmailTemplate, sendEmail };
