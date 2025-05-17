/**
 * Script to create the first admin user for Moducate
 * Run with: node create-admin.js
 */

require('dotenv').config();
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK using environment variables
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    // The private key needs to be properly formatted with newlines
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  })
});

const db = admin.firestore();

// Admin user details
const adminUser = {
  email: 'tjaart717@gmail.com', // Using the email you provided in the form
  password: 'admin123', // You should change this to a secure password
  displayName: 'TJ Admin'
};

async function createAdminUser() {
  try {
    console.log('Checking if any admin users already exist...');
    
    // Check if any admin users already exist
    const adminSnapshot = await db.collection('users')
      .where('role', '==', 'admin')
      .get();
    
    if (!adminSnapshot.empty) {
      console.error('An admin user already exists. Cannot create another admin.');
      return;
    }
    
    console.log('No existing admin found. Creating new admin user...');
    
    // Create the user in Firebase Auth
    const userRecord = await admin.auth().createUser({
      email: adminUser.email,
      password: adminUser.password,
      displayName: adminUser.displayName,
      emailVerified: true
    });
    
    console.log('User created in Firebase Auth:', userRecord.uid);
    
    // Set admin custom claims
    const customClaims = {
      admin: true,
      moderator: false,
      lecturer: false,
      approved: true
    };
    
    await admin.auth().setCustomUserClaims(userRecord.uid, customClaims);
    console.log('Custom claims set for admin user');
    
    // Create user document in Firestore
    await db.collection('users').doc(userRecord.uid).set({
      displayName: adminUser.displayName,
      email: adminUser.email,
      role: 'admin',
      approved: true,
      active: true,
      customClaims,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('Admin user document created in Firestore');
    console.log('Admin user created successfully!');
    console.log('User ID:', userRecord.uid);
    console.log('Email:', adminUser.email);
    console.log('Display Name:', adminUser.displayName);
    
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    // Exit the process
    process.exit(0);
  }
}

createAdminUser();
