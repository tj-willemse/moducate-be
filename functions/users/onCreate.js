/**
 * Trigger function that runs when a new user is created
 */

const functions = require('firebase-functions');
const { admin } = require('../config/firebase');

/**
 * When a new user document is created in Firestore,
 * mark them as pending approval (except for admins)
 */
const onUserCreate = functions.firestore
  .onDocumentCreated('users/{userId}', async (event) => {
    const snapshot = event.data;
    const context = event;
    try {
      const userId = context.params.userId;
      const userData = snapshot.data();
      
      console.log(`New user created: ${userId}`, userData);
      
      // Check if the user is an admin (admins are auto-approved)
      const isAdmin = userData.role === 'admin';
      
      // Set initial approval status
      // Admins are automatically approved, others need admin approval
      const approved = isAdmin;
      
      // Create claims object with all roles set to false by default
      const validRoles = ['admin', 'moderator', 'lecturer'];
      const customClaims = {};
      validRoles.forEach(role => {
        customClaims[role] = role === userData.role;
      });
      
      // Only admins get their claims set immediately
      // Other users will get their claims set when approved
      if (isAdmin) {
        customClaims.approved = true;
        console.log(`Setting admin claims for user ${userId}:`, customClaims);
        await admin.auth().setCustomUserClaims(userId, customClaims);
      } else {
        console.log(`User ${userId} created with role ${userData.role}, waiting for admin approval`);
      }
      
      // Update the user's metadata
      await admin.firestore().collection('users').doc(userId).update({
        approved,
        customClaims: isAdmin ? customClaims : null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      return null;
    } catch (error) {
      console.error('Error in onUserCreate trigger:', error);
      return null;
    }
  });

module.exports = onUserCreate;