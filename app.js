const express = require("express")
const bodyParser = require("body-parser")
const multer = require("multer")
const cors = require("cors")
const { put } = require("@vercel/blob")
const { MongoClient, ServerApiVersion } = require("mongodb")

const app = express()

// MongoDB connection string (replace with your actual connection string)
const uri = process.env.MONGODB_URI
const client = new MongoClient(uri, {
  serverApi: ServerApiVersion.v1,
  useNewUrlParser: true,
  useUnifiedTopology: true,
})

// Enable CORS
app.use(cors())

// Middleware for parsing JSON
app.use(bodyParser.json())

// Set up Multer for memory storage
const storage = multer.memoryStorage()
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"]
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error("Invalid file type. Only JPEG, PNG, and WEBP are allowed."))
    }
    cb(null, true)
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
})

// API endpoint to save reviews
app.post("/api/reviews", upload.array("images", 3), async (req, res) => {
  try {
    const { name, email, rating, review } = req.body

    // Validate inputs
    if (!name || !email || !rating || !review) {
      return res.status(400).json({ error: "All fields (name, email, rating, review) are required." })
    }

    const imageFiles = await Promise.all(
      req.files.map(async (file) => {
        const blob = await put(file.originalname, file.buffer, {
          access: "public",
        })
        return blob.url
      }),
    )

    const reviewData = {
      name,
      email,
      rating: Number.parseInt(rating, 10),
      review,
      images: imageFiles,
      date: new Date().toISOString(),
    }

    // Connect to MongoDB
    await client.connect()
    const database = client.db("reviewsDB")
    const reviews = database.collection("reviews")

    // Insert the review
    const result = await reviews.insertOne(reviewData)

    res.status(200).json({ message: "Review saved successfully", review: reviewData })
  } catch (error) {
    console.error("Error saving review:", error)
    res.status(500).json({ error: "An error occurred while saving the review" })
  } finally {
    await client.close()
  }
})

// API endpoint to fetch reviews
app.get("/api/reviews", async (req, res) => {
  try {
    // Connect to MongoDB
    await client.connect()
    const database = client.db("reviewsDB")
    const reviews = database.collection("reviews")

    // Fetch all reviews
    const allReviews = await reviews.find({}).toArray()

    res.status(200).json({ reviews: allReviews })
  } catch (error) {
    console.error("Error fetching reviews:", error)
    res.status(500).json({ error: "An error occurred while fetching reviews" })
  } finally {
    await client.close()
  }
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found." })
})



// // Start server
// app.listen(PORT, () => {
//     console.log(`Server running at http://localhost:${PORT}`);
// });
