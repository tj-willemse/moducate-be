/**
 * Trigger function that runs when a user document is updated
 */

const functions = require('firebase-functions');
const { admin } = require('../config/firebase');

/**
 * When a user document is updated in Firestore,
 * update the custom claims if the role has changed
 */
const onUserUpdate = functions.firestore
  .onDocumentUpdated('users/{userId}', async (event) => {
    const change = {
      before: event.data.before,
      after: event.data.after
    };
    const context = event;
    try {
      const userId = context.params.userId;
      const beforeData = change.before.data();
      const afterData = change.after.data();
      
      // Check if role has changed
      if (beforeData.role !== afterData.role) {
        console.log(`User role changed for ${userId}: ${beforeData.role} -> ${afterData.role}`);
        
        const validRoles = ['admin', 'moderator', 'lecturer'];
        
        // Create claims object with all roles set to false by default
        const customClaims = {};
        validRoles.forEach(role => {
          customClaims[role] = role === afterData.role;
        });
        
        console.log(`Updating custom claims for user ${userId}:`, customClaims);
        
        // Set custom claims for the user
        await admin.auth().setCustomUserClaims(userId, customClaims);
        
        // Update the customClaims field in the user document
        // We don't update the document directly to avoid triggering this function again
        await admin.firestore().collection('users').doc(userId).update({
          customClaims,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`Custom claims updated successfully for user ${userId}`);
      }
      
      return null;
    } catch (error) {
      console.error('Error in onUserUpdate trigger:', error);
      return null;
    }
  });

module.exports = onUserUpdate;