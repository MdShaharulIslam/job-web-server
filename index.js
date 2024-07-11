const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: "http://localhost:5173", // Update this with your frontend URL if necessary
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// MongoDB URI and Client Setup
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.lcvsatz.mongodb.net/jobJunctionDB?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// JWT Middleware
const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: "Unauthorized access" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "Unauthorized access" });
    }
    req.user = decoded;
    next();
  });
};

// MongoDB Operations
async function run() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const jobsCollection = client.db("jobJunctionDB").collection("jobs");
    const bidsCollection = client.db("jobJunctionDB").collection("applyed");

    // JWT API
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1hr",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production', // Ensure this is set to true in production
          sameSite: "none",
        })
        .send({ success: true });
    });

    app.post("/logout", async (req, res) => {
      res.clearCookie("token").send({ success: true });
    });

    // Jobs Collection Operations
    app.get("/jobs", async (req, res) => {
      try {
        const query = req.query?.email ? { email: req.query.email } : {};
        const cursor = jobsCollection.find(query).sort({ title: 1 });
        const result = await cursor.toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching jobs:", error);
        res.status(500).send({ message: "Internal server error" });
      }
    });

    app.get("/jobs/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await jobsCollection.findOne(query);
        res.send(result);
      } catch (error) {
        console.error("Error fetching job by ID:", error);
        res.status(500).send({ message: "Internal server error" });
      }
    });

    app.post("/jobs", async (req, res) => {
      try {
        const jobInformation = req.body;
        const result = await jobsCollection.insertOne(jobInformation);
        res.send(result);
      } catch (error) {
        console.error("Error inserting job:", error);
        res.status(500).send({ message: "Internal server error" });
      }
    });

    app.put("/jobs/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updateJobRequest = req.body;
        const updateJobInfo = {
          $set: {
            title: updateJobRequest.title,
            deadline: updateJobRequest.deadline,
            category: updateJobRequest.category,
            minPrice: updateJobRequest.minPrice,
            maxPrice: updateJobRequest.maxPrice,
            desc: updateJobRequest.desc,
          },
        };
        const result = await jobsCollection.updateOne(filter, updateJobInfo);
        res.send(result);
      } catch (error) {
        console.error("Error updating job:", error);
        res.status(500).send({ message: "Internal server error" });
      }
    });

    app.patch("/jobs", async (req, res) => {
      try {
        const { email, title } = req.query;
        const filter = { bidReqEmail: email, title: title };
        const updateReq = req.body;
        const updateDoc = {
          $set: {
            status: updateReq.status,
          },
        };
        const result = await jobsCollection.updateOne(filter, updateDoc);
        res.send(result);
      } catch (error) {
        console.error("Error patching job:", error);
        res.status(500).send({ message: "Internal server error" });
      }
    });

    app.patch("/jobs/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updateReq = req.body;
        const updateJob = {
          $set: {
            bidReqEmail: updateReq.bidReqEmail,
            bidReqPrice: updateReq.bidReqPrice,
            bidReq: updateReq.bidReq,
            status: updateReq.status,
          },
        };
        const result = await jobsCollection.updateOne(filter, updateJob);
        res.send(result);
      } catch (error) {
        console.error("Error patching job by ID:", error);
        res.status(500).send({ message: "Internal server error" });
      }
    });

    app.delete("/jobs/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await jobsCollection.deleteOne(query);
        res.send(result);
      } catch (error) {
        console.error("Error deleting job:", error);
        res.status(500).send({ message: "Internal server error" });
      }
    });

    // Bids Collection Operations
    app.get("/applyed", verifyToken, async (req, res) => {
      try {
        if (req.query.email !== req.user.email) {
          return res.status(403).send({ message: "Forbidden access" });
        }

        const query = req.query?.email ? { email: req.query.email } : {};
        const result = await bidsCollection.find(query).sort({ title: 1 }).toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching applied bids:", error);
        res.status(500).send({ message: "Internal server error" });
      }
    });

    app.post("/applyed", async (req, res) => {
      try {
        const bidJob = req.body;
        const result = await bidsCollection.insertOne(bidJob);
        res.send(result);
      } catch (error) {
        console.error("Error inserting applied bid:", error);
        res.status(500).send({ message: "Internal server error" });
      }
    });

    app.patch("/applyed", async (req, res) => {
      try {
        const { email, title } = req.query;
        const filter = { email: email, title: title };
        const updateReq = req.body;
        const updateDoc = {
          $set: {
            status: updateReq.status,
          },
        };
        const result = await bidsCollection.updateOne(filter, updateDoc);
        res.send(result);
      } catch (error) {
        console.error("Error patching applied bid:", error);
        res.status(500).send({ message: "Internal server error" });
      }
    });

    // Ping MongoDB to confirm connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } catch (error) {
    console.error("Error connecting to MongoDB", error);
  } finally {
    // Optionally, you can close the client connection here
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Job Junction server is running");
});

app.listen(port, () => {
  console.log(`Job Junction server is running on ${port}`);
});
