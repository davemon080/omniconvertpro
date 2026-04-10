import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import ytdl from "@distube/ytdl-core";
import cors from "cors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Set COOP and COEP headers for ffmpeg.wasm
  app.use((req, res, next) => {
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
    next();
  });

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/video-info", async (req, res) => {
    const videoUrl = req.query.url as string;
    if (!videoUrl) {
      return res.status(400).json({ error: "URL is required" });
    }

    try {
      if (!ytdl.validateURL(videoUrl)) {
        return res.status(400).json({ error: "Invalid YouTube URL" });
      }

      const info = await ytdl.getInfo(videoUrl, {
        requestOptions: {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          }
        }
      });
      const formats = info.formats.filter(f => f.hasVideo && f.hasAudio);
      
      const details = {
        title: info.videoDetails.title,
        thumbnail: info.videoDetails.thumbnails[info.videoDetails.thumbnails.length - 1].url,
        duration: info.videoDetails.lengthSeconds,
        author: info.videoDetails.author.name,
        formats: formats.map(f => ({
          quality: f.qualityLabel,
          container: f.container,
          url: f.url,
          hasVideo: f.hasVideo,
          hasAudio: f.hasAudio,
          size: f.contentLength
        }))
      };

      res.json(details);
    } catch (error: any) {
      console.error("Error fetching video info:", error);
      const message = error.message || "Failed to fetch video information";
      res.status(500).json({ error: message });
    }
  });

  app.get("/api/download", async (req, res) => {
    const videoUrl = req.query.url as string;
    const itag = req.query.itag as string;

    if (!videoUrl) {
      return res.status(400).send("URL is required");
    }

    try {
      const info = await ytdl.getInfo(videoUrl, {
        requestOptions: {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          }
        }
      });
      const title = info.videoDetails.title.replace(/[^\w\s]/gi, '');
      
      res.header('Content-Disposition', `attachment; filename="${title}.mp4"`);
      ytdl(videoUrl, {
        quality: itag || 'highest'
      }).pipe(res);
    } catch (error) {
      console.error("Error downloading video:", error);
      res.status(500).send("Failed to download video");
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        host: '0.0.0.0',
        port: 3000
      },
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
