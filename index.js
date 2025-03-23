import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

// Get directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Please check your .env file.');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Test the Supabase connection
async function testConnection() {
  try {
    // Test the connection by making a simple auth query
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      throw error;
    }
    
    console.log('Successfully connected to Supabase!');
    console.log('Connection established at:', new Date().toISOString());
    return true;
  } catch (error) {
    console.error('Failed to connect to Supabase:', error.message);
    return false;
  }
}

// API endpoint to insert data
app.post('/api/insert', async (req, res) => {
  try {
    const { tableName, data } = req.body;
    
    if (!tableName || !data) {
      return res.status(400).json({ error: 'Table name and data are required' });
    }
    
    const { data: result, error } = await supabase
      .from(tableName)
      .insert([data])
      .select();
      
    if (error) throw error;
    
    return res.status(200).json({ 
      success: true, 
      message: 'Data inserted successfully',
      data: result
    });
  } catch (error) {
    console.error('Error inserting data:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to insert data',
      error: error.message
    });
  }
});

// Serve the main HTML page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, async () => {
  const connected = await testConnection();
  console.log(`Server running on http://localhost:${PORT}`);
  if (connected) {
    console.log('Ready to accept data for insertion!');
  } else {
    console.log('Warning: Supabase connection failed. Check your credentials.');
  }
});
