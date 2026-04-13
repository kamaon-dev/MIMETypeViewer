import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import fs from 'fs';
import { fileTypeFromBuffer } from 'file-type';

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

// MIME type mapping for file-type library results
const MIME_TYPES = {
  txt: 'text/plain', html: 'text/html', json: 'application/json', xml: 'application/xml',
  gif: 'image/gif', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', png: 'image/png',
  pdf: 'application/pdf', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  zip: 'application/zip', rar: 'application/x-rar-compressed', '7z': 'application/x-7z-compressed',
  mp3: 'audio/mpeg', mp4: 'video/mp4', wav: 'audio/wav', svg: 'image/svg+xml',
  bmp: 'image/bmp', ico: 'image/x-icon', tiff: 'image/tiff', tif: 'image/tiff',
  psd: 'image/vnd.adobe.photoshop', zip: 'application/zip'
};

// Magic bytes signatures for common file types (matching Linux `file` command detection)
const MAGIC_SIGNATURES = [
  // Images
  { magic: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], mime: 'image/png', ext: 'png' },
  { magic: [0xFF, 0xD8, 0xFF], mime: 'image/jpeg', ext: 'jpg' },
  { magic: [0x47, 0x49, 0x46, 0x38], mime: 'image/gif', ext: 'gif' },
  { magic: [0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50], mime: 'image/webp', ext: 'webp' },
  { magic: [0x42, 0x4D], mime: 'image/bmp', ext: 'bmp' },
  { magic: [0x00, 0x00, 0x01, 0x00], mime: 'image/x-icon', ext: 'ico' },
  { magic: [0x49, 0x49, 0x2A, 0x00], mime: 'image/tiff', ext: 'tif' },
  { magic: [0x4D, 0x4D, 0x00, 0x2A], mime: 'image/tiff', ext: 'tif' },
  // Documents
  { magic: [0x25, 0x50, 0x44, 0x46], mime: 'application/pdf', ext: 'pdf' },
  { magic: [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1], mime: 'application/msword', ext: 'doc' },
  // Archives
  { magic: [0x50, 0x4B, 0x03, 0x04], mime: 'application/zip', ext: 'zip' },
  { magic: [0x50, 0x4B, 0x05, 0x06], mime: 'application/zip', ext: 'zip' },
  { magic: [0x50, 0x4B, 0x07, 0x08], mime: 'application/zip', ext: 'zip' },
  { magic: [0x52, 0x61, 0x72, 0x21], mime: 'application/x-rar-compressed', ext: 'rar' },
  { magic: [0x37, 0x7A, 0xBC, 0xAF, 0x27, 0x1C], mime: 'application/x-7z-compressed', ext: '7z' },
  // Audio/Video
  { magic: [0x49, 0x44, 0x33], mime: 'audio/mpeg', ext: 'mp3' },
  { magic: [0xFF, 0xFB], mime: 'audio/mpeg', ext: 'mp3' },
  { magic: [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6F, 0x6D], mime: 'video/mp4', ext: 'mp4' },
  { magic: [0x00, 0x00, 0x00, 0x1C, 0x66, 0x74, 0x79, 0x70, 0x6D, 0x70, 0x34, 0x32], mime: 'video/mp4', ext: 'mp4' },
  { magic: [0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45], mime: 'audio/wav', ext: 'wav' },
  // Text-based
  { magic: [0xEF, 0xBB, 0xBF], mime: 'text/plain', ext: 'txt' }, // UTF-8 BOM
  { magic: [0xFF, 0xFE], mime: 'text/plain', ext: 'txt' }, // UTF-16 LE BOM
  { magic: [0xFE, 0xFF], mime: 'text/plain', ext: 'txt' }, // UTF-16 BE BOM
];

// Detect MIME type from file content (magic bytes)
async function detectMimeType(filePath) {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error('[DEBUG] File does not exist:', filePath);
      return 'application/octet-stream';
    }
    
    const stats = await fs.promises.stat(filePath);
    if (stats.size === 0) {
      console.error('[DEBUG] File is empty:', filePath);
      return 'application/octet-stream';
    }
    console.log('[DEBUG] File size:', stats.size);
    
    // First try file-type library
    const chunk = await fs.promises.readFile(filePath, { length: 4100 });
    console.log('[DEBUG] Read chunk size:', chunk.length);
    
    const result = await fileTypeFromBuffer(chunk);
    console.log('[DEBUG] file-type result:', result);
    
    if (result) {
      return MIME_TYPES[result.ext] || result.mime;
    }

    // Fallback: magic bytes detection
    for (const sig of MAGIC_SIGNATURES) {
      if (sig.magic.length > chunk.length) continue;
      let match = true;
      for (let i = 0; i < sig.magic.length; i++) {
        if (chunk[i] !== sig.magic[i]) {
          match = false;
          break;
        }
      }
      if (match) {
        console.log('[DEBUG] Magic bytes matched:', sig.mime);
        return sig.mime;
      }
    }
    
    // Log first bytes for debugging
    const firstBytes = Array.from(chunk.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' ');
    console.log('[DEBUG] First bytes (hex):', firstBytes);
    
  } catch (e) {
    console.error('[DEBUG] Error detecting file type:', e.message, e.stack);
  }
  return 'application/octet-stream';
}

// Get file info with MIME type detection
async function getFileInfo(filePath, filename) {
  const ext = path.extname(filename).slice(1).toLowerCase();
  console.log(`[DEBUG] getFileInfo called: filename=${filename}, ext=${ext}, filePath=${filePath}, exists=${fs.existsSync(filePath)}`);
  
  // Always detect from file content first (magic bytes) - more accurate
  const detectedMime = await detectMimeType(filePath);
  console.log(`[MIME Detection] ${filename}: ${detectedMime}`);
  
  if (detectedMime && detectedMime !== 'application/octet-stream') {
    // Use content-detected MIME type
    const detectedExt = detectedMime.split('/')[1]?.replace('x-icon', 'ico').replace('jpeg', 'jpg') || 'bin';
    return {
      mimeType: detectedMime,
      extension: ext || detectedExt,
      filename: filename
    };
  }
  
  // Fallback to extension-based detection
  if (ext) {
    const knownMimes = {
      txt: 'text/plain', html: 'text/html', json: 'application/json', xml: 'application/xml',
      gif: 'image/gif', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', png: 'image/png',
      pdf: 'application/pdf', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      zip: 'application/zip', rar: 'application/x-rar-compressed', '7z': 'application/x-7z-compressed',
      mp3: 'audio/mpeg', mp4: 'video/mp4', wav: 'audio/wav'
    };
    console.log(`[MIME Detection] ${filename} (fallback to extension): ${knownMimes[ext] || 'application/octet-stream'}`);
    return {
      mimeType: knownMimes[ext] || 'application/octet-stream',
      extension: ext,
      filename: filename
    };
  }
  
  console.log(`[MIME Detection] ${filename}: application/octet-stream (unknown)`);
  return {
    mimeType: 'application/octet-stream',
    extension: 'bin',
    filename: filename
  };
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

app.get('/api/file', async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  const { type, filename } = req.query;
  
  if (filename) {
    let filePath = path.join(uploadDir, filename);
    if (fs.existsSync(filePath)) {
      const fileInfo = await getFileInfo(filePath, filename);
      return res.json(fileInfo);
    }
    filePath = path.join(customUploadDir, filename);
    if (fs.existsSync(filePath)) {
      const fileInfo = await getFileInfo(filePath, filename);
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

app.get('/api/file/content', async (req, res) => {
  const { filename } = req.query;
  
  if (filename) {
    let filePath = path.join(uploadDir, filename);
    let found = false;
    
    if (fs.existsSync(filePath)) {
      found = true;
    } else {
      filePath = path.join(customUploadDir, filename);
      if (fs.existsSync(filePath)) {
        found = true;
      }
    }
    
    if (found) {
      // Detect actual MIME type from file content
      const detectedMime = await detectMimeType(filePath);
      console.log(`[FILE_CONTENT] ${filename}: ${detectedMime}`);
      
      res.setHeader('Content-Type', detectedMime);
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

app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
    const filePath = req.file.path;
    
    console.log(`[UPLOAD] File uploaded: ${originalName}`);
    console.log(`[UPLOAD] File path: ${filePath}`);
    
    // Detect and log MIME type of uploaded file
    const detectedMime = await detectMimeType(filePath);
    console.log(`[UPLOAD] MIME Type: ${detectedMime}`);
    
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.json({ success: true, filename: originalName, mimeType: detectedMime });
  } catch (error) {
    console.error('[UPLOAD] Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});