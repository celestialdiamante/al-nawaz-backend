const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8080;

// Enable CORS
app.use(cors());

// Middleware for parsing JSON
app.use(bodyParser.json());

// Set up Multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
        if (!allowedMimeTypes.includes(file.mimetype)) {
            return cb(new Error('Invalid file type. Only JPEG, PNG, and WEBP are allowed.'));
        }
        cb(null, true);
    },
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

// API endpoint to save reviews
app.post('/api/reviews', upload.array('images', 3), (req, res) => {
    const { name, email, rating, review } = req.body;

    // Validate inputs
    if (!name || !email || !rating || !review) {
        return res.status(400).json({ error: 'All fields (name, email, rating, review) are required.' });
    }

    const imageFiles = req.files.map((file) => `/uploads/${file.filename}`);
    const reviewData = {
        name,
        email,
        rating: parseInt(rating, 10),
        review,
        images: imageFiles,
        date: new Date().toISOString(),
    };

    const dataPath = path.join(__dirname, 'reviews.json');

    // Save data to JSON file
    let reviews = [];
    if (fs.existsSync(dataPath)) {
        reviews = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    }
    reviews.push(reviewData);
    fs.writeFileSync(dataPath, JSON.stringify(reviews, null, 2));

    res.status(200).json({ message: 'Review saved successfully', review: reviewData });
});

// API endpoint to fetch reviews
app.get('/api/reviews', (req, res) => {
    const dataPath = path.join(__dirname, 'reviews.json');
    if (!fs.existsSync(dataPath)) {
        return res.status(200).json({ reviews: [] });
    }

    const reviews = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    res.status(200).json({ reviews });
});

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found.' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
