// server.js
require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const FormData = require('form-data');
const multer = require('multer');
const upload = multer();
const path = require('path');

const app = express();
const REMOVE_BG_KEY = process.env.REMOVE_BG_API_KEY || '';

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// very simple CORS for dev
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

app.post('/remove-bg', upload.single('image'), async (req, res) => {
  try {
    if (!REMOVE_BG_KEY) {
      return res.status(500).json({ success: false, message: 'Server missing REMOVE_BG_API_KEY' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const form = new FormData();
    form.append('image_file', req.file.buffer, {
      filename: req.file.originalname || 'upload.png'
    });
    form.append('size', 'auto');

    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: { 'X-Api-Key': REMOVE_BG_KEY },
      body: form
    });

    if (!response.ok) {
      const txt = await response.text();
      return res.status(response.status).json({ success: false, message: 'remove.bg failed', detail: txt });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    const dataUrl = `data:image/png;base64,${base64}`;

    res.json({ success: true, image: dataUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error', detail: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
