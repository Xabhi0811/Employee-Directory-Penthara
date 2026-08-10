/**
 * Drop Old Text Index Script
 * Run this once to remove the conflicting text index
 * 
 * Usage: node scripts/drop-old-text-index.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/employee-directory';

async function dropOldTextIndex() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Get the employees collection
    const db = mongoose.connection.db;
    const collection = db.collection('employees');

    // List all indexes
    console.log('\n📋 Current indexes:');
    const indexes = await collection.indexes();
    indexes.forEach(index => {
      console.log(`  - ${index.name}`);
    });

    // Drop the old text index
    const oldIndexName = 'name_text_department_text';
    
    try {
      console.log(`\n🗑️  Dropping old text index: ${oldIndexName}...`);
      await collection.dropIndex(oldIndexName);
      console.log(`✅ Successfully dropped index: ${oldIndexName}`);
    } catch (error) {
      if (error.code === 27 || error.codeName === 'IndexNotFound') {
        console.log(`ℹ️  Index ${oldIndexName} does not exist (already dropped or never created)`);
      } else {
        throw error;
      }
    }

    // List indexes after dropping
    console.log('\n📋 Indexes after cleanup:');
    const indexesAfter = await collection.indexes();
    indexesAfter.forEach(index => {
      console.log(`  - ${index.name}`);
    });

    console.log('\n✅ Migration complete!');
    console.log('ℹ️  The new index "employee_text_search" will be created automatically on next server start.');

  } catch (error) {
    console.error('\n❌ Error during migration:', error.message);
    process.exit(1);
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log('\n👋 Connection closed');
    process.exit(0);
  }
}

// Run the migration
dropOldTextIndex();
