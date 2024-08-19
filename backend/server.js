const express = require("express");
const multer = require('multer');
const cors = require('cors');
const { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
const upload = multer();

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const pool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: Number(process.env.PG_PORT),
});

// Middleware to verify JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    
    // Fetch the username from the database using the user id
    pool.query('SELECT username FROM users WHERE id = $1', [user.id], (error, results) => {
      if (error) {
        return res.sendStatus(500);
      }
      if (results.rows.length > 0) {
        req.user = { ...user, username: results.rows[0].username };
        next();
      } else {
        return res.sendStatus(404);
      }
    });
  });
}

app.post('/upload', authenticateToken, upload.single('file'), async function(req, res) {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  try {
    // Get username from database
    const userResult = await pool.query('SELECT username FROM users WHERE id = $1', [req.user.id]);
    const username = userResult.rows[0].username;

    const params = {
      Bucket: 'dropbox-clone-bucket-app',
      Key: `users/${username}/${Date.now()}-${req.file.originalname}`,
      Body: req.file.buffer,
      ContentType: req.file.mimetype
    };

    const command = new PutObjectCommand(params);
    const data = await s3Client.send(command);
    res.send({ message: 'File uploaded successfully', location: `https://${params.Bucket}.s3.amazonaws.com/${params.Key}` });
  } catch (err) {
    console.error("Error", err);
    res.status(500).send('Error uploading to S3');
  }
});

app.post('/register', async (req, res) => {
  const { username, password } = req.body;

  try {
    // Check if user already exists
    const userCheck = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert user into database
    const query = 'INSERT INTO users(username, password) VALUES($1, $2) RETURNING id';
    const values = [username, hashedPassword];
    const result = await pool.query(query, values);

    // Create and send JWT
    const token = jwt.sign({ id: result.rows[0].id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.status(201).json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    // Check if user exists
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Create and send JWT
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/files', authenticateToken, async function(req, res) {
  try {
    console.log('Authenticated user:', req.user); // Log the user object

    const username = req.user.username;
    console.log('Username:', username); // Log the username

    const params = {
      Bucket: 'dropbox-clone-bucket-app',
      Prefix: `users/${username}/`
    };

    console.log('S3 params:', params); // Log the S3 params

    const command = new ListObjectsV2Command(params);
    const data = await s3Client.send(command);

    console.log('S3 response:', JSON.stringify(data, null, 2)); // Pretty print the S3 response

    if (!data.Contents) {
      console.log('No files found for user:', username);
      return res.json([]);
    }

    const files = data.Contents.map(file => ({
      key: file.Key,
      size: file.Size,
      lastModified: file.LastModified,
      url: `https://${params.Bucket}.s3.amazonaws.com/${file.Key}`
    }));

    res.json(files);
  } catch (err) {
    console.error("Error in /files route:", JSON.stringify(err, null, 2));
    res.status(500).send('Error retrieving files from S3');
  }
});

app.get('/share/users/:username/:filename', authenticateToken, async function(req, res) {
  const { username, filename } = req.params;

  // Ensure the requesting user matches the username in the path
  if (req.user.username !== username) {
    return res.status(403).send('Unauthorized');
  }

  try {
    const params = {
      Bucket: 'dropbox-clone-bucket-app',
      Key: `users/${username}/${filename}`
    };

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