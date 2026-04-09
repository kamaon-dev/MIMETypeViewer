import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

const uploadDir = path.join(__dirname, '..', 'download');
const customUploadDir = path.join(__dirname, '..', 'download_custom');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

if (!fs.existsSync(customUploadDir)) {
  fs.mkdirSync(customUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, customUploadDir);
  },
  filename: (req, file, cb) => {
    let fixedName = file.originalname;
    try {
      const buf = Buffer.from(file.originalname, 'latin1');
      fixedName = buf.toString('utf8');
    } catch (e) {
      fixedName = file.originalname;
    }
    console.log('Original:', file.originalname, '-> Fixed:', fixedName);
    cb(null, fixedName);
  }
});
const upload = multer({ storage });

app.use(cors());

app.use(express.json({ 
  limit: '50mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '50mb',
  parameterLimit: 100000
}));

app.use('/download', express.static(uploadDir));
app.use('/download_custom', express.static(customUploadDir));

app.get('/api/file', (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  const { type, filename } = req.query;
  
  if (filename) {
    const filePath = path.join(uploadDir, filename);
    if (fs.existsSync(filePath)) {
      const ext = path.extname(filename).slice(1).toLowerCase();
      const mimeTypes = {
        txt: 'text/plain', html: 'text/html', json: 'application/json', xml: 'application/xml',
        gif: 'image/gif', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', png: 'image/png'
      };
      const fileInfo = {
        mimeType: mimeTypes[ext] || 'application/octet-stream',
        extension: ext,
        filename: filename
      };
      return res.json(fileInfo);
    }
    const customFilePath = path.join(customUploadDir, filename);
    if (fs.existsSync(customFilePath)) {
      const ext = path.extname(filename).slice(1).toLowerCase();
      const mimeTypes = {
        txt: 'text/plain', html: 'text/html', json: 'application/json', xml: 'application/xml',
        gif: 'image/gif', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', png: 'image/png',
        pdf: 'application/pdf', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        zip: 'application/zip', rar: 'application/x-rar-compressed', '7z': 'application/x-7z-compressed',
        mp3: 'audio/mpeg', mp4: 'video/mp4', wav: 'audio/wav'
      };
      const fileInfo = {
        mimeType: mimeTypes[ext] || 'application/octet-stream',
        extension: ext,
        filename: filename
      };
      return res.json(fileInfo);
    }
  }
  
  const fileInfo = { mimeType: 'text/plain', data: 'Sample content', extension: 'txt' };
  
  switch (type) {
    case 'text':
      fileInfo.mimeType = 'text/plain';
      fileInfo.data = 'This is a plain text file content.\nYou can read it directly here.';
      fileInfo.extension = 'txt';
      break;
    case 'html':
      fileInfo.mimeType = 'text/html';
      fileInfo.data = '<html><body><h1>HTML Content</h1><p>This is HTML!</p></body></html>';
      fileInfo.extension = 'html';
      break;
    case 'json':
      fileInfo.mimeType = 'application/json';
      fileInfo.data = JSON.stringify({ message: 'Hello JSON', data: { a: 1, b: 2 } }, null, 2);
      fileInfo.extension = 'json';
      break;
    case 'xml':
      fileInfo.mimeType = 'application/xml';
      fileInfo.data = '<?xml version="1.0" encoding="UTF-8"?><root><item>XML Data</item></root>';
      fileInfo.extension = 'xml';
      break;
    case 'gif':
      fileInfo.mimeType = 'image/gif';
      fileInfo.data = 'sample.gif';
      fileInfo.filename = 'sample.gif';
      fileInfo.extension = 'gif';
      break;
    case 'jpeg':
      fileInfo.mimeType = 'image/jpeg';
      fileInfo.data = 'sample.jpg';
      fileInfo.filename = 'sample.jpg';
      fileInfo.extension = 'jpg';
      break;
    case 'webp':
      fileInfo.mimeType = 'image/webp';
      fileInfo.data = 'sample.webp';
      fileInfo.filename = 'sample.webp';
      fileInfo.extension = 'webp';
      break;
    case 'png':
      fileInfo.mimeType = 'image/png';
      fileInfo.data = 'sample.png';
      fileInfo.filename = 'sample.png';
      fileInfo.extension = 'png';
      break;
  }
  
  res.json(fileInfo);
});

app.get('/api/file/content', (req, res) => {
  const { filename } = req.query;
  
  if (filename) {
    let filePath = path.join(uploadDir, filename);
    if (fs.existsSync(filePath)) {
      return res.sendFile(filePath);
    }
    filePath = path.join(customUploadDir, filename);
    if (fs.existsSync(filePath)) {
      return res.sendFile(filePath);
    }
  }
  
  res.status(404).json({ error: 'File not found' });
});

app.get('/api/files', (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  fs.readdir(uploadDir, (err, files) => {
    if (err) return res.json([]);
    const fileList = files.map(f => {
      const ext = path.extname(f).slice(1).toLowerCase();
      return { filename: f, extension: ext };
    });
    res.json(fileList);
  });
});

app.get('/api/custom/files', (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  fs.readdir(customUploadDir, (err, files) => {
    if (err) return res.json([]);
    const fileList = files.map(f => {
      const ext = path.extname(f).slice(1).toLowerCase();
      return { filename: f, extension: ext };
    });
    res.json(fileList);
  });
});

app.post('/api/upload', upload.single('file'), (req, res) => {
  const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.json({ success: true, filename: originalName });
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});