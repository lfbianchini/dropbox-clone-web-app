const express = require("express");
const multer = require('multer');
const cors = require('cors');
const { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
require('dotenv').config();

const app = express();
app.use(cors());
const upload = multer();

// Create S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

app.post('/upload', upload.single('file'), async function(req, res) {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  const params = {
    Bucket: 'dropbox-clone-bucket-app',
    Key: `${Date.now()}-${req.file.originalname}`,
    Body: req.file.buffer,
    ContentType: req.file.mimetype
  };

  try {
    const command = new PutObjectCommand(params);
    const data = await s3Client.send(command);
    res.send({ message: 'File uploaded successfully', location: `https://${params.Bucket}.s3.amazonaws.com/${params.Key}` });
  } catch (err) {
    console.error("Error", err);
    res.status(500).send('Error uploading to S3');
  }
});

app.get('/files', async function(req, res) {
  const params = {
    Bucket: 'dropbox-clone-bucket-app',
  };

  try {
    const command = new ListObjectsV2Command(params);
    const data = await s3Client.send(command);

    const files = data.Contents.map(file => ({
      key: file.Key,
      size: file.Size,
      lastModified: file.LastModified,
      url: `https://${params.Bucket}.s3.amazonaws.com/${file.Key}`
    }));

    res.json(files);
  } catch (err) {
    console.error("Error", err);
    res.status(500).send('Error retrieving files from S3');
  }
});

app.get('/share/:fileId', async function(req, res) {
  const fileId = req.params.fileId;

  const params = {
    Bucket: 'dropbox-clone-bucket-app',
    Key: fileId 
  };

  try {
    const command = new GetObjectCommand(params);
    
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    res.json({ downloadUrl: signedUrl });
  } catch (err) {
    console.error("Error", err);
    res.status(500).send('Error generating download link');
  }
});

const port = 3000;
app.listen(port, function () {
  console.log(`Example app listening on port ${port}!`);
});
