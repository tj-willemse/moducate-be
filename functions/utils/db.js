/**
 * Database utility functions
 */

const { db } = require('../config/firebase');

/**
 * Get a document by ID from a specific collection
 * @param {string} collection - Collection name
 * @param {string} id - Document ID
 * @returns {Promise<Object>} - Document data
 */
const getDocById = async (collection, id) => {
  try {
    const doc = await db.collection(collection).doc(id).get();
    if (!doc.exists) {
      throw new Error(`Document not found in ${collection} with ID: ${id}`);
    }
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    console.error(`Error getting document from ${collection}:`, error);
    throw error;
  }
};

/**
 * Create a new document in a collection
 * @param {string} collection - Collection name
 * @param {string} id - Document ID (optional)
 * @param {Object} data - Document data
 * @returns {Promise<Object>} - Created document reference
 */
const createDoc = async (collection, data, id = null) => {
  try {
    let docRef;
    if (id) {
      docRef = db.collection(collection).doc(id);
      await docRef.set(data);
    } else {
      docRef = await db.collection(collection).add(data);
    }
    return docRef;
  } catch (error) {
    console.error(`Error creating document in ${collection}:`, error);
    throw error;
  }
};

/**
 * Update a document in a collection
 * @param {string} collection - Collection name
 * @param {string} id - Document ID
 * @param {Object} data - Document data to update
 * @returns {Promise<void>}
 */
const updateDoc = async (collection, id, data) => {
  try {
    const docRef = db.collection(collection).doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new Error(`Document not found in ${collection} with ID: ${id}`);
    }
    await docRef.update(data);
    return docRef;
  } catch (error) {
    console.error(`Error updating document in ${collection}:`, error);
    throw error;
  }
};

/**
 * Delete a document from a collection
 * @param {string} collection - Collection name
 * @param {string} id - Document ID
 * @returns {Promise<void>}
 */
const deleteDoc = async (collection, id) => {
  try {
    const docRef = db.collection(collection).doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new Error(`Document not found in ${collection} with ID: ${id}`);
    }
    await docRef.delete();
  } catch (error) {
    console.error(`Error deleting document from ${collection}:`, error);
    throw error;
  }
};

/**
 * Query documents from a collection
 * @param {string} collection - Collection name
 * @param {Array} conditions - Array of condition objects [{ field, operator, value }]
 * @returns {Promise<Array>} - Array of documents
 */
const queryDocs = async (collection, conditions = []) => {
  try {
    let query = db.collection(collection);
    
    conditions.forEach(condition => {
      query = query.where(condition.field, condition.operator, condition.value);
    });
    
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error(`Error querying documents from ${collection}:`, error);
    throw error;
  }
};

module.exports = {
  getDocById,
  createDoc,
  updateDoc,
  deleteDoc,
  queryDocs
};