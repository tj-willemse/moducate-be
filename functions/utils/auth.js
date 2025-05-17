/**
 * Authentication utility functions
 */

const { admin } = require('../config/firebase');
const { getDocById, createDoc } = require('./db');

/**
 * Verify if a user has the required role and is approved
 * @param {string} userId - User ID
 * @param {string|Array} requiredRoles - Required role(s)
 * @returns {Promise<boolean>} - Whether the user has the required role and is approved
 */
const verifyUserRole = async (userId, requiredRoles) => {
  try {
    // Get user from Firestore
    const user = await getDocById('users', userId);
    
    // Convert requiredRoles to array if it's a string
    const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    
    // Check if user has any of the required roles and is approved
    // Admins are always considered approved
    const hasRole = roles.includes(user.role);
    const isApproved = user.approved === true || user.role === 'admin';
    
    return hasRole && isApproved;
  } catch (error) {
    console.error('Error verifying user role:', error);
    return false;
  }
};

/**
 * Check if a user is approved
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} - Whether the user is approved
 */
const isUserApproved = async (userId) => {
  try {
    // Get user from Firestore
    const user = await getDocById('users', userId);
    
    // Admins are always considered approved
    return user.approved === true || user.role === 'admin';
  } catch (error) {
    console.error('Error checking user approval status:', error);
    return false;
  }
};

/**
 * Create a new user in Firestore after they register with Firebase Auth
 * @param {string} userId - User ID from Firebase Auth
 * @param {Object} userData - User data
 * @returns {Promise<Object>} - Created user reference
 */
const createUserRecord = async (userId, userData) => {
  try {
    const { displayName, email, role } = userData;
    const userRole = role || 'lecturer'; // Default role is lecturer
    
    // Determine if user should be auto-approved (only admins are auto-approved)
    const isAdmin = userRole === 'admin';
    const approved = isAdmin;
    
    // Create user document in Firestore
    const userDoc = {
      displayName,
      email,
      role: userRole,
      approved, // Only admins are auto-approved
      active: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Save user to Firestore with the same ID as Firebase Auth
    return await createDoc('users', userDoc, userId);
  } catch (error) {
    console.error('Error creating user record:', error);
    throw error;
  }
};

/**
 * Get user by email
 * @param {string} email - User email
 * @returns {Promise<Object|null>} - User data or null if not found
 */
const getUserByEmail = async (email) => {
  try {
    const userRecord = await admin.auth().getUserByEmail(email);
    if (userRecord) {
      return await getDocById('users', userRecord.uid);
    }
    return null;
  } catch (error) {
    console.error('Error getting user by email:', error);
    return null;
  }
};

module.exports = {
  verifyUserRole,
  isUserApproved,
  createUserRecord,
  getUserByEmail
};
