/**
 * Generates standard header metadata for any page.
 * @param {Object} settings - Site settings from the database.
 * @param {Object} notice - Home page notice or any page-specific notice content.
 * @returns {Object} Metadata headers object.
 */
const getHeaderMetaData = (headProps) => ({
  title: headProps?.title || '',
  description: headProps?.description || '',
  keywords: headProps?.keywords || '',
  robots: headProps?.robots || '',
  ogTitle: headProps?.ogTitle || '',
  ogDescription: headProps?.ogDescription || '',
  ogImage: headProps?.ogImage || '',
  ogImageHeight: headProps?.ogImageHeight || '',
  ogImageWidth: headProps?.ogImageWidth || '',
  ogSiteName: headProps?.ogSiteName || '',
  ogType: headProps?.ogType || '',
  ogUrl: headProps?.ogUrl || '',
  twitterTitle: headProps?.twitterTitle || '',
  twitterDescription: headProps?.twitterDescription || '',
  twitterUrl: headProps?.twitterUrl || '',
  twitterSite: headProps?.twitterSite || '',
  twitterCard: headProps?.twitterCard || '',
  twitterCreator: headProps?.twitterCreator || '',
  twitterImage: headProps?.twitterImage || '',
  image: headProps?.image || '',
  url: headProps?.url || '',
  canonical: headProps?.canonical || '',
  favicon: headProps?.favicon || '',
  author: headProps?.author || '',
  generator: headProps?.generator || '',
  pageHeading: headProps?.pageHeading || '',
  fbAppId: headProps?.fbAppId || '',
  yandexVerificationId: headProps?.yandexVerificationId || '',
  googleAnalyticsId: headProps?.googleAnalyticsId || '',
});

module.exports = { getHeaderMetaData };
