const db = require('../config/db.config');

/**
 * Executes a query with or without a transaction
 * @param {string} query - SQL query
 * @param {Array} params - Query parameters
 * @param {Object} transaction - Optional transaction connection
 */
const executeQuery = async (query, params, transaction = null) => {
  const start = Date.now();
  const formattedQuery = formatQuery(query, params); // Format the full query
  const uniqueLabel = `𑥕 Query Time: ${formattedQuery}... ${start}`; // Unique label
  // console.time(uniqueLabel);

  try {
    const connection = transaction || db.promise();
    const [result] = await connection.query(query, params);
    return result;
  } catch (error) {
    throw new Error(`Database query failed: ${error.message}`);
  } finally {
    const duration = Date.now() - start;
    // console.timeEnd(uniqueLabel);

    if (duration > 1000) {
      console.warn(`⚠️ Slow Query: ${formattedQuery} \n⏳ Took: ${duration}ms`);
    }
  }
};

/**
 * Starts a new transaction
 */
const startTransaction = async () => {
  const connection = await db.promise().getConnection();
  await connection.beginTransaction();
  return connection;
};

/**
 * Commits a transaction
 * @param {Object} transaction - Transaction connection
 */
const commitTransaction = async (transaction) => {
  await transaction.commit();
  transaction.release();
};

/**
 * Rollbacks a transaction
 * @param {Object} transaction - Transaction connection
 */
const rollbackTransaction = async (transaction) => {
  await transaction.rollback();
  transaction.release();
};

const formatQuery = (query, params) => {
  let i = 0;
  return query.replace(/\?/g, () => {
    const param = params[i++];
    if (typeof param === "string") return `'${param}'`; // Wrap strings in quotes
    if (param === null) return "NULL"; // Handle null values
    return param; // For numbers or other types
  });
};


module.exports = { executeQuery, startTransaction, commitTransaction, rollbackTransaction };
