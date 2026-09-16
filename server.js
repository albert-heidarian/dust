const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 3005;

// Function to download file from live dust.tt website
function downloadFileFromLive(url, localPath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    protocol.get(url, (response) => {
      if (response.statusCode === 200) {
        // Ensure directory exists
        const dir = path.dirname(localPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        
        const fileStream = fs.createWriteStream(localPath);
        response.pipe(fileStream);
        
        fileStream.on('finish', () => {
          fileStream.close();
          console.log(`Downloaded: ${url} -> ${localPath}`);
          resolve();
        });
        
        fileStream.on('error', (err) => {
          fs.unlink(localPath, () => {}); // Delete partial file
          reject(err);
        });
      } else {
        reject(new Error(`Failed to download: ${response.statusCode}`));
      }
    }).on('error', reject);
  });
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from dust.tt directory
app.use(express.static(path.join(__dirname, 'dust.tt')));

// Handle Next.js image optimization requests by redirecting to original images
app.get('/_next/image', async (req, res) => {
  const url = req.query.url;
  if (url) {
    // Remove leading slash and serve the original file
    const filePath = path.join(__dirname, 'dust.tt', url.replace(/^\//, ''));
    
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      // File doesn't exist, try to download from live dust.tt
      console.log(`Image not found locally: ${filePath}`);
      
      const liveUrl = `https://dust.tt${url}`;
      
      try {
        // Download the file from live site
        await downloadFileFromLive(liveUrl, filePath);
        
        // Serve the downloaded file
        res.sendFile(filePath);
      } catch (error) {
        console.error(`Failed to download from live site: ${error.message}`);
        
        // Fallback: try to find similar files in the directory
        const dirname = path.dirname(filePath);
        
        try {
          if (fs.existsSync(dirname)) {
            const files = fs.readdirSync(dirname);
            const similarImage = files.find(f => 
              f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.svg') || f.endsWith('.gif')
            );
            
            if (similarImage) {
              console.log(`Serving similar image: ${similarImage}`);
              res.sendFile(path.join(dirname, similarImage));
              return;
            }
          }
        } catch (err) {
          console.error(`Error finding similar images: ${err.message}`);
        }
        
        // Final fallback: return transparent PNG
        const transparentPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
        res.set('Content-Type', 'image/png');
        res.send(transparentPng);
      }
    }
  } else {
    res.status(400).send('Bad request');
  }
});

// Basic API endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

app.get('/api/data', (req, res) => {
  // Example endpoint - you can modify this to serve data from D:\dust\main
  res.json({
    message: 'Data endpoint',
    timestamp: new Date().toISOString()
  });
});

// API endpoint to get offline data
app.get('/api/offline-data', (req, res) => {
  const fs = require('fs');
  const dataPath = path.join(__dirname, 'offline-data.json');
  
  try {
    if (fs.existsSync(dataPath)) {
      const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
      res.json(data);
    } else {
      res.json({ message: 'No offline data found', data: [] });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to read offline data' });
  }
});

// POST endpoint to save data
app.post('/api/data', (req, res) => {
  const fs = require('fs');
  const dataPath = path.join(__dirname, 'offline-data.json');
  
  try {
    const newData = req.body;
    
    // Read existing data
    let existingData = {};
    if (fs.existsSync(dataPath)) {
      existingData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    }
    
    // Merge or update data (simple implementation)
    const updatedData = { ...existingData, ...newData, lastUpdated: new Date().toISOString() };
    
    // Write back to file
    fs.writeFileSync(dataPath, JSON.stringify(updatedData, null, 2));
    
    res.json({ success: true, message: 'Data saved successfully', data: updatedData });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save data', details: error.message });
  }
});

// Serve the main index.html for all other routes (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dust.tt', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Serving static files from: ${path.join(__dirname, 'dust.tt')}`);
});