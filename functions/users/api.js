/**
 * User API endpoints
 */

const functions = require('firebase-functions');
const cors = require('cors')({ origin: true });
const { admin } = require('../config/firebase');
const { getDocById, queryDocs, updateDoc } = require('../utils/db');

/**
 * Get user profile by ID
 */
const getUserProfile = functions.https.onCall(async (data, context) => {
  try {
    // Check if the user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'You must be logged in to get a user profile.'
      );
    }

    const userId = data.userId || context.auth.uid;
    const user = await getDocById('users', userId);
    
    // Remove sensitive information
    delete user.password;
    
    return { success: true, user };
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Get all users with optional role filter (admin only)
 */
const getUsers = functions.https.onCall(async (data, context) => {
  try {
    // Check if the user is authenticated and is an admin
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'You must be logged in to get users.'
      );
    }

    // Get user claims to check role
    const { admin: isAdmin } = context.auth.token;
    
    if (!isAdmin) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Only admins can view all users.'
      );
    }

    // Apply role filter if provided
    const conditions = [];
    if (data.role) {
      conditions.push({ field: 'role', operator: '==', value: data.role });
    }
    
    // Filter by approval status if provided
    if (data.approved !== undefined) {
      conditions.push({ field: 'approved', operator: '==', value: data.approved });
    }

    const users = await queryDocs('users', conditions);
    
    // Remove sensitive information
    users.forEach(user => {
      delete user.password;
    });
    
    return { success: true, users };
  } catch (error) {
    console.error('Error getting users:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Approve or reject a user registration (admin only)
 */
const approveUser = functions.https.onCall(async (data, context) => {
  try {
    // Check if the user is authenticated and is an admin
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'You must be logged in to approve users.'
      );
    }

    // Get user claims to check role
    const { admin: isAdmin } = context.auth.token;
    
    if (!isAdmin) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Only admins can approve users.'
      );
    }

    const { userId, approved } = data;
    
    if (!userId || approved === undefined) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'User ID and approval status are required.'
      );
    }

    // Update user approval status in Firestore
    await updateDoc('users', userId, { 
      approved,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // If approved, set the custom claims to activate the account
    if (approved) {
      const user = await getDocById('users', userId);
      const role = user.role || 'lecturer'; // Default to lecturer if no role specified
      
      const customClaims = {
        admin: role === 'admin',
        moderator: role === 'moderator',
        lecturer: role === 'lecturer',
        approved: true
      };
      
      await admin.auth().setCustomUserClaims(userId, customClaims);
    }
    
    return { 
      success: true, 
      message: approved ? 'User approved successfully' : 'User rejected successfully'
    };
  } catch (error) {
    console.error('Error approving/rejecting user:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Update user role (admin only)
 */
const updateUserRole = functions.https.onCall(async (data, context) => {
  try {
    // Check if the user is authenticated and is an admin
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'You must be logged in to update user roles.'
      );
    }

    // Get user claims to check role
    const { admin: isAdmin } = context.auth.token;
    
    if (!isAdmin) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Only admins can update user roles.'
      );
    }

    const { userId, role } = data;
    
    if (!userId || !role) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'User ID and role are required.'
      );
    }

    // Valid roles
    const validRoles = ['admin', 'moderator', 'lecturer'];
    if (!validRoles.includes(role)) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        `Role must be one of: ${validRoles.join(', ')}`
      );
    }

    // Update user role in Firestore
    await updateDoc('users', userId, { 
      role,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Update custom claims
    const customClaims = {};
    validRoles.forEach(r => {
      customClaims[r] = r === role;
    });
    
    await admin.auth().setCustomUserClaims(userId, customClaims);
    
    return { 
      success: true, 
      message: `User role updated to ${role} successfully` 
    };
  } catch (error) {
    console.error('Error updating user role:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Create the first admin user (only works when no admin exists)
 */
const createFirstAdmin = functions.https.onCall(async (data, context) => {
  try {
    console.log('createFirstAdmin called with data:', data);
    
    // Check if data is null or undefined
    if (!data) {
      console.error('Data is null or undefined');
      throw new functions.https.HttpsError(
        'invalid-argument',
        'No data provided'
      );
    }
    
    const { email, password, displayName } = data;
    console.log('Extracted values:', { email: !!email, password: !!password, displayName: !!displayName });
    
    if (!email || !password || !displayName) {
      console.error('Missing required fields:', { email: !!email, password: !!password, displayName: !!displayName });
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Email, password, and display name are required.'
      );
    }

    // Check if any admin users already exist
    const adminUsers = await queryDocs('users', [{ field: 'role', operator: '==', value: 'admin' }]);
    
    if (adminUsers.length > 0) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'An admin user already exists. Cannot create the first admin.'
      );
    }

    // Create the user in Firebase Auth
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName,
      emailVerified: true
    });

    // Set admin custom claims
    const customClaims = {
      admin: true,
      moderator: false,
      lecturer: false,
      approved: true
    };
    
    await admin.auth().setCustomUserClaims(userRecord.uid, customClaims);

    // Create user document in Firestore
    await admin.firestore().collection('users').doc(userRecord.uid).set({
      displayName,
      email,
      role: 'admin',
      approved: true,
      active: true,
      customClaims,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { 
      success: true, 
      message: 'First admin user created successfully',
      userId: userRecord.uid
    };
  } catch (error) {
    console.error('Error creating first admin:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

module.exports = {
  getUserProfile,
  getUsers,
  approveUser,
  updateUserRole,
  createFirstAdmin
};