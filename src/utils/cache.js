// cache.js
const NodeCache = require('node-cache');

// Create a new instance of NodeCache (no default TTL here)
const cache = new NodeCache();

// Helper function to generate a unique cache key based on the filter or where condition
function generateCacheKey(baseKey, condition = {}) {
    return `${baseKey}_${JSON.stringify(condition)}`;
}

// Function to set data into cache with customizable TTL, default 60 seconds
async function setCache(key, value, condition = {}, ttl = 60) {
    const cacheKey = generateCacheKey(key, condition);
    const success = cache.set(cacheKey, value, ttl); // Use TTL as a third parameter
    if (success) {
        logger.success(`Cache set for key: ${cacheKey} with TTL: ${ttl} seconds`);
    } else {
        logger.error(`Failed to set cache for key: ${cacheKey}`);
    }
}

// Function to get data from cache
async function getCache(key, condition = {}) {
    const cacheKey = generateCacheKey(key, condition);
    const data = cache.get(cacheKey);
    if (data !== undefined) {
        logger.success(`Cache get hit for key: ${cacheKey}`);
        return data; // Return the cached data
    } else {
        logger.warn(`Cache miss for key: ${cacheKey}`);
        return null; // Return null if cache miss
    }
}

// Function to delete a specific cache by key
async function deleteCache(key, condition = {}) {
    const cacheKey = generateCacheKey(key, condition);
    const success = cache.del(cacheKey);
    if (success) {
        logger.success(`Cache deleted for key: ${cacheKey}`);
    } else {
        logger.warn(`Cache not found for key: ${cacheKey}`);
    }
}

// Function to delete all cache
async function deleteAllCache() {
    cache.flushAll();
    console.log('All cache deleted');
}

// Example usage for a specific query (like fetching posts)
// async function fetchPostsWithCache(whereCondition, ttl = 60) {
//     // Try to fetch from cache first
//     const cachedPosts = await getCache('posts', whereCondition);
//     if (cachedPosts) {
//         return cachedPosts; // If cached data exists, return it
//     }

//     // If not cached, fetch the data from DB (simulating a DB fetch)
//     const posts = await fetchPostsFromDB(whereCondition); // This would be your DB call

//     // Store the fetched posts in cache with custom TTL
//     await setCache('posts', posts, whereCondition, ttl);

//     return posts;
// }

// // Simulated DB fetch (for illustration purposes)
// async function fetchPostsFromDB(whereCondition) {
//     console.log('Fetching posts from DB...');
//     // Simulate DB query and return some posts
//     return [
//         { id: 1, title: 'Post 1', content: 'Content 1', date: '2025-04-01' },
//         { id: 2, title: 'Post 2', content: 'Content 2', date: '2025-04-01' },
//         { id: 3, title: 'Post 3', content: 'Content 3', date: '2025-04-01' }
//     ];
// }

module.exports = {
    setCache,
    getCache,
    deleteCache,
    deleteAllCache,
    // fetchPostsWithCache
};
