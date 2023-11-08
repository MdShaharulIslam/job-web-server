const express = require("express");
const cors = require("cors");
var jwt = require("jsonwebtoken");
var cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId, Long } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.m6cowle.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Middleware
const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.user = decoded;
    next();
  });
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const jobsCollection = client.db("jobJunctionDB").collection("jobs");
    const bidsCollection = client.db("jobJunctionDB").collection("bids");

    // jwt api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1hr",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: false,
        })
        .send({ success: true });
    });

    app.post("/logout", async (req, res) => {
      const user = req.body;
      res.clearCookie("token", { maxAge: 0 }).send({ success: true });
    });

    /// service api

    // jobs collection operations

    app.get("/jobs", verifyToken, async (req, res) => {
      try {
        if (!req?.query?.email) {
          const cursor = jobsCollection.find();
          const result = await cursor.toArray();
          res.send(result);
          return;
        }

        if (req.query?.email !== req.user?.email) {
          return res.status(403).send({ message: "forbidden access" });
        }

        let query = {};
        if (req.query?.email) {
          query = { email: req.query.email };
        }
        // const query = { email: req?.query?.email };
        const cursor = jobsCollection.find(query).sort({ title: 1 });
        const result = await cursor.toArray();
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    app.get("/jobs/:id", async (req, res) => {
      try {
        const id = req?.params?.id;
        const query = { _id: new ObjectId(id) };
        const result = await jobsCollection.findOne(query);
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    app.post("/jobs", async (req, res) => {
      try {
        const jobInformation = req.body;
        const result = await jobsCollection.insertOne(jobInformation);
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    app.put("/jobs/:id", async (req, res) => {
      const id = req?.params?.id;
      // console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updateJobRequest = req?.body;
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
    });

    app.patch("/jobs/:id", async (req, res) => {
      try {
        const id = req?.params.id;
        const filter = { _id: new ObjectId(id) };
        const updateReq = req.body;
        // const options = { upsert: true };
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
        console.log(error);
      }
    });

    app.delete("/jobs/:id", async (req, res) => {
      try {
        const id = req?.params;
        const query = { _id: new ObjectId(id) };
        const result = await jobsCollection.deleteOne(query);
        res.send(result);
      } catch (error) {
        console.log(console.error());
      }
    });

    // bidsCollectionDB operation
    app.get("/bids", verifyToken, async (req, res) => {
      try {
        if (req.query?.email !== req.user?.email) {
          return res.status(403).send({ message: "forbidden access" });
        }

        let query = {};
        if (req.query?.email) {
          query = { email: req.query.email };
        }
        const result = await bidsCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    app.post("/bids", async (req, res) => {
      try {
        const bitJob = req.body;
        const result = await bidsCollection.insertOne(bitJob);
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    app.patch("/bids/:id", async (req, res) => {
      try {
        const id = req.params.id;

        const filter = { _id: new ObjectId(id) };
        const updateReq = req.body;
        console.log(updateReq);
        const updateDoc = {
          $set: {
            status: updateReq.status,
          },
        };
        const result = await bidsCollection.updateOne(filter, updateDoc);
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Job Junction server is running");
});

app.listen(port, () => {
  console.log(`Job junction server is running on ${port}`);
});
