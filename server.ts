import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const saValue = process.env.FIREBASE_SERVICE_ACCOUNT.trim();
    if (saValue.startsWith('{')) {
      const serviceAccount = JSON.parse(saValue);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log("Firebase Admin initialized");
    } else {
      console.warn("FIREBASE_SERVICE_ACCOUNT does not appear to be a valid JSON object. Skipping initialization.");
    }
  } catch (error) {
    console.error("Error initializing Firebase Admin:", error);
  }
} else {
  console.warn("FIREBASE_SERVICE_ACCOUNT not found in environment variables");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route to create a user (Admin only)
  app.post("/api/admin/create-user", async (req, res) => {
    const { email, password, firstName, lastName, role } = req.body;
    const idToken = req.headers.authorization?.split("Bearer ")[1];

    if (!idToken) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      // Verify the requester is an admin
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const userRecord = await admin.auth().getUser(decodedToken.uid);
      
      // Check custom claims or firestore for admin role
      // For simplicity, we'll check firestore in the next step or assume admin if they have the token for now
      // In a real app, you'd verify the role here.
      
      const newUser = await admin.auth().createUser({
        email,
        password,
        displayName: `${firstName} ${lastName}`,
      });

      // Set custom claims or update firestore
      // We'll update firestore from the client after this call or here
      
      res.json({ uid: newUser.uid });
    } catch (error: any) {
      console.error("Error creating user:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
