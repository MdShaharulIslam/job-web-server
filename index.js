const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
// Updated CORS configuration to allow credentials and specific origins
const corsOptions = {
  origin: ['http://localhost:5173', 'https://jobjunction-e3f0d.firebaseapp.com'], // Add your frontend URL
  credentials: true, // Allow cookies and credentials
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// MongoDB URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.lcvsatz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// JWT Middleware for token verification
const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: "Unauthorized access. No token provided." });
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "Unauthorized access. Invalid token." });
    }
    req.user = decoded; 
    next();
  });
};

async function run() {
  try {
    console.log("Connected to MongoDB");

    const jobsCollection = client.db("jobJunctionDB").collection("jobs");
    const bidsCollection = client.db("jobJunctionDB").collection("applyed");

    // JWT API: Generate JWT Token
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "1hr" });
      
      // Set token in secure cookie
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: true, // ensures cookies are only sent over HTTPS
          sameSite: "none",
        })
        .send({ success: true });
    });

    // Logout route to clear token
    app.post("/logout", (req, res) => {
      res.clearCookie("token").send({ success: true, message: "Logged out successfully." });
    });

    // Get all jobs or jobs by email (optional)
    app.get("/jobs", async (req, res) => {
      try {
        const query = req.query?.email ? { email: req.query.email } : {};
        const cursor = jobsCollection.find(query).sort({ title: 1 });
        const result = await cursor.toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching jobs:", error);
        res.status(500).send({ message: "Error fetching jobs." });
      }
    });

    // Get job by ID
    app.get("/jobs/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const job = await jobsCollection.findOne(query);
        res.send(job);
      } catch (error) {
        console.error("Error fetching job by ID:", error);
        res.status(500).send({ message: "Error fetching job by ID." });
      }
    });

    // Create a new job
    app.post("/jobs", async (req, res) => {
      try {
        const newJob = req.body;
        const result = await jobsCollection.insertOne(newJob);
        res.send(result);
      } catch (error) {
        console.error("Error posting job:", error);
        res.status(500).send({ message: "Error posting job." });
      }
    });

    // Update a job by ID
    app.put("/jobs/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const update = req.body;

        const updateDoc = {
          $set: {
            title: update.title,
            deadline: update.deadline,
            category: update.category,
            minPrice: update.minPrice,
            maxPrice: update.maxPrice,
            desc: update.desc,
          },
        };

        const result = await jobsCollection.updateOne(filter, updateDoc);
        res.send(result);
      } catch (error) {
        console.error("Error updating job:", error);
        res.status(500).send({ message: "Error updating job." });
      }
    });

    // Delete a job by ID
    app.delete("/jobs/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await jobsCollection.deleteOne(query);
        res.send(result);
      } catch (error) {
        console.error("Error deleting job:", error);
        res.status(500).send({ message: "Error deleting job." });
      }
    });

    // Apply for a job (Bid)
    app.post("/applyed", async (req, res) => {
      try {
        const application = req.body;
        const result = await bidsCollection.insertOne(application);
        res.send(result);
      } catch (error) {
        console.error("Error applying for job:", error);
        res.status(500).send({ message: "Error applying for job." });
      }
    });

    // Get applied jobs for authenticated user
    app.get("/applyed", verifyToken, async (req, res) => {
      try {
        const userEmail = req.user.email;
        if (req.query.email !== userEmail) {
          return res.status(403).send({ message: "Forbidden access." });
        }

        const query = { email: userEmail };
        const result = await bidsCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching applied jobs:", error);
        res.status(500).send({ message: "Error fetching applied jobs." });
      }
    });

    // Confirm MongoDB connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged MongoDB. Connection successful!");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1); 
  }
}

run().catch(console.dir);

// Root endpoint
app.get("/", (req, res) => {
  res.send("Job Junction server is running");
});

// Start server
app.listen(port, () => {
  console.log(`Job Junction server is running on port ${port}`);
});
