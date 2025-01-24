import express from "express"
import bodyParser from "body-parser"
import multer from "multer"
import cors from "cors"
import { put } from "@vercel/blob"
import { sql } from "@vercel/postgres"

const app = express()

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

    // Insert the review into Vercel Postgres
    const result = await sql`
      INSERT INTO reviews (name, email, rating, review, images, date)
      VALUES (${name}, ${email}, ${Number.parseInt(rating, 10)}, ${review}, ${JSON.stringify(imageFiles)}, ${new Date().toISOString()})
      RETURNING *;
    `

    res.status(200).json({ message: "Review saved successfully", review: result.rows[0] })
  } catch (error) {
    console.error("Error saving review:", error)
    res.status(500).json({ error: "An error occurred while saving the review" })
  }
})

// API endpoint to fetch reviews
app.get("/api/reviews", async (req, res) => {
  try {
    // Fetch all reviews from Vercel Postgres
    const result = await sql`SELECT * FROM reviews ORDER BY date DESC;`

    res.status(200).json({ reviews: result.rows })
  } catch (error) {
    console.error("Error fetching reviews:", error)
    res.status(500).json({ error: "An error occurred while fetching reviews" })
  }
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found." })
})

export default app

