const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(express.json);
app.use(cors());

app.get("/", (req, res) => {
  res.send("Job Junction server is running");
});

app.listen(port, () => {
  console.log(`Job junction server is running on ${port}`);
});
