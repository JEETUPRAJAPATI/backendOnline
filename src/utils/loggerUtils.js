const chalk = require('chalk');

// Utility function to format messages (string or object)
const formatMessage = (message) => {
  return typeof message === 'object' 
    ? JSON.stringify(message, null, 2) // Pretty-print the object
    : message;
};


// Simple log with default color (white)
const log = (message) => {
  console.log(chalk.white(formatMessage(message)));
};

// Error log with red color and bold style
const error = (message) => {
  console.error(chalk.red.bold(`Error: ${formatMessage(message)}`));
};

// Success log with green color and bold style
const success = (message) => {
  console.log(chalk.green.bold(`Success: ${formatMessage(message)}`));
};

// Info log with blue color
const info = (message) => {
  console.log(chalk.blue(`Info: ${formatMessage(message)}`));
};

// Warning log with yellow color
const warn = (message) => {
  console.warn(chalk.yellow(`Warning: ${formatMessage(message)}`));
};

// Debug log with magenta color
const debug = (message) => {
  console.log(chalk.magenta(`Debug: ${formatMessage(message)}`));
};

// Customizable log with dynamic color and style
const custom = (message, color = 'white', styles = []) => {
  let styledMessage = chalk[color] ? chalk[color](formatMessage(message)) : chalk.white(formatMessage(message));

  // Apply each style from the styles array
  styles.forEach((style) => {
    if (chalk[style]) {
      styledMessage = chalk[style](styledMessage);
    } else {
      console.warn(`Warning: Unsupported style "${style}"`);
    }
  });

  console.log(styledMessage);
};

// Custom log with RGB color and optional styles
const customRGB = (message, rgb = [255, 255, 255], styles = []) => {
  let styledMessage = chalk.rgb(...rgb)(formatMessage(message));

  styles.forEach((style) => {
    if (chalk[style]) {
      styledMessage = chalk[style](styledMessage);
    } else {
      console.warn(`Warning: Unsupported style "${style}"`);
    }
  });

  console.log(styledMessage);
};

// Custom log with hex color and optional styles
const customHex = (message, hexColor = '#FFFFFF', styles = []) => {
  let styledMessage = chalk.hex(hexColor)(formatMessage(message));

  styles.forEach((style) => {
    if (chalk[style]) {
      styledMessage = chalk[style](styledMessage);
    } else {
      console.warn(`Warning: Unsupported style "${style}"`);
    }
  });

  console.log(styledMessage);
};

// Export all functions for global use
module.exports = {
  log,
  error,
  success,
  info,
  warn,
  debug,
  custom,
  customRGB,
  customHex,
};


// logger.log('This is a default log');
// logger.error('This is an error message');
// logger.success('This is a success message');
// logger.info('This is an info message');
// logger.warn('This is a warning message');
// logger.debug('This is a debug message');
// logger.custom('Custom message with color and styles', 'cyan', ['bold', 'underline']);
// logger.customRGB('Custom RGB message', [123, 45, 67], ['italic', 'bold']);
// logger.customHex('Custom hex message', '#DEADED', ['strikethrough']);