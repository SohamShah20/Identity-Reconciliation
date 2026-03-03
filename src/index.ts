import dotenv from "dotenv";
import express from "express";
import { prisma } from "./config/prisma";
import identifyRoutes from "./routes/identify.routes";

dotenv.config();

prisma.$connect()
  .then(() => console.log("Database connected"))
  .catch(err => console.error("DB connection error:", err));

const app = express();

app.use(express.json());

app.get("/", (_req, res) => {
  res.status(200).send(`
    <html>
      <head>
        <title>Identity Reconciliation API</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 40px;
            max-width: 800px;
            margin: auto;
            background-color: #f4f4f4;
          }
          h1 { color: #333; }
          code {
            background: #eaeaea;
            padding: 4px 6px;
            border-radius: 4px;
          }
          pre {
            background: #eaeaea;
            padding: 12px;
            border-radius: 6px;
            overflow-x: auto;
          }
        </style>
      </head>
      <body>
        <h1>Identity Reconciliation API</h1>
        <p>This service performs graph-based identity resolution using email and phone numbers.</p>

        <h2>Endpoint</h2>
        <p><code>POST https://identity-reconciliation-epws.onrender.com/identify</code></p>

        <h2>Request Format</h2>
        <pre>{
  "email": "string (optional)",
  "phoneNumber": "string (optional)"
}</pre>

        <p>At least one of <code>email</code> or <code>phoneNumber</code> must be provided.</p>
        <p>Content-Type must be <code>application/json</code>.</p>

        <h2>Example</h2>
        <pre>POST /identify
{
  "email": "mcfly@hillvalley.edu",
  "phoneNumber": "123456"
}</pre>

        <p>Status: Running</p>
      </body>
    </html>
  `);
});

app.use("/", identifyRoutes);

app.use(
  (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({
      message: err.message || "Internal Server Error",
    });
  }
);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});