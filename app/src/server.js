const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const { Client } = require("minio");
const jwt = require("jsonwebtoken");

const {
  MINIO_ENDPOINT,
  MINIO_PORT,
  MINIO_ACCESS_KEY,
  MINIO_SECRET_KEY,
  MINIO_BUCKET
} = process.env;

const app = express();

app.use(express.static(path.join(__dirname, "..", "public")));
app.use(bodyParser.json());

const minioClient = new Client({
  endPoint: MINIO_ENDPOINT,
  port: parseInt(MINIO_PORT, 10),
  useSSL: false,
  accessKey: MINIO_ACCESS_KEY,
  secretKey: MINIO_SECRET_KEY,
});

const requireAuth = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    return res.status(401).json({ error: "No authorization header provided" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Invalid Authorization format" });
  }

  const decoded = jwt.decode(token, { complete: true });
  if (!decoded) {
    return res.status(401).json({ error: "Invalid token" });
  }

  req.user = decoded.payload;
  next();
};

app.get("/health", (req, res) => {
  res.json({ status: "OK", message: "App is running" });
});

app.post("/upload", requireAuth, async (req, res) => {
  try {
    const { name } = req.query;
    if (!name) {
      return res.status(400).json({ error: "Missing 'name' query parameter" });
    }

    const { file } = req.body;
    if (!file) {
      return res.status(400).json({ error: "Missing file data in request body" });
    }

    const fileBuffer = Buffer.from(file, "base64");
    await minioClient.putObject(MINIO_BUCKET, name, fileBuffer);
    return res.json({ message: `File '${name}' uploaded successfully!` });
  } catch (err) {
    console.error("Error uploading file:", err);
    return res.status(500).json({ error: "Error uploading file" });
  }
});

app.get("/download/:file_id", requireAuth, async (req, res) => {
  try {
    const { file_id } = req.params;
    const fileStream = await minioClient.getObject(MINIO_BUCKET, file_id);
    fileStream.on("error", (err) => {
      console.error("File stream error:", err);
      return res.status(404).json({ error: "File not found" });
    });

    res.setHeader("Content-Disposition", `attachment; filename="${file_id}"`);
    fileStream.pipe(res);
  } catch (err) {
    console.error("Error downloading file:", err);
    return res.status(404).json({ error: "File not found" });
  }
});

app.put("/update/:file_id", requireAuth, async (req, res) => {
  try {
    const { file_id } = req.params;
    const { file } = req.body;
    if (!file) {
      return res.status(400).json({ error: "Missing file data" });
    }
    const fileBuffer = Buffer.from(file, "base64");
    await minioClient.putObject(MINIO_BUCKET, file_id, fileBuffer);
    return res.json({ message: `File '${file_id}' updated successfully!` });
  } catch (err) {
    console.error("Error updating file:", err);
    return res.status(500).json({ error: "Error updating file" });
  }
});

app.delete("/delete/:file_id", requireAuth, async (req, res) => {
  try {
    const { file_id } = req.params;
    await minioClient.removeObject(MINIO_BUCKET, file_id);
    return res.json({ message: `File '${file_id}' deleted successfully!` });
  } catch (err) {
    console.error("Error deleting file:", err);
    return res.status(500).json({ error: "Error deleting file" });
  }
});

app.get("/files", requireAuth, async (req, res) => {
  try {
    const objectsStream = minioClient.listObjects(MINIO_BUCKET, "", true);
    let objects = [];

    objectsStream.on("data", (obj) => {
      objects.push(obj.name);
    });

    objectsStream.on("end", () => {
      return res.json({ files: objects });
    });

    objectsStream.on("error", (err) => {
      console.error("Error listing objects:", err);
      return res.status(500).json({ error: "Error listing objects" });
    });
  } catch (err) {
    console.error("Error listing files:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});

