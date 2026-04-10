import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import ytdl from "@distube/ytdl-core";
import cors from "cors";
import axios from "axios";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Platform detection function
function detectPlatform(url: string): 'youtube' | 'facebook' | 'instagram' | 'tiktok' | 'unknown' {
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return 'youtube';
  }
  if (url.includes('facebook.com') || url.includes('fb.watch')) {
    return 'facebook';
  }
  if (url.includes('instagram.com')) {
    return 'instagram';
  }
  if (url.includes('tiktok.com')) {
    return 'tiktok';
  }
  return 'unknown';
}

// YouTube handlers
async function handleYouTubeInfo(videoUrl: string, res: any) {
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
    platform: 'youtube',
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
}

async function handleYouTubeDownload(videoUrl: string, itag: string, res: any) {
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
}

// Facebook handlers (basic implementation - would need proper Facebook downloader library)
async function handleFacebookInfo(videoUrl: string, res: any) {
  // For now, return basic info - in production, would use facebook-video-downloader or similar
  res.json({
    title: "Facebook Video",
    thumbnail: "",
    duration: 0,
    author: "Facebook User",
    platform: 'facebook',
    formats: [{
      quality: "HD",
      container: "mp4",
      url: videoUrl,
      hasVideo: true,
      hasAudio: true,
      size: "Unknown"
    }],
    note: "Facebook download requires additional setup"
  });
}

async function handleFacebookDownload(videoUrl: string, res: any) {
  res.status(501).send("Facebook download not yet implemented");
}

// Instagram handlers (basic implementation)
async function handleInstagramInfo(videoUrl: string, res: any) {
  res.json({
    title: "Instagram Video",
    thumbnail: "",
    duration: 0,
    author: "Instagram User",
    platform: 'instagram',
    formats: [{
      quality: "HD",
      container: "mp4",
      url: videoUrl,
      hasVideo: true,
      hasAudio: true,
      size: "Unknown"
    }],
    note: "Instagram download requires additional setup"
  });
}

async function handleInstagramDownload(videoUrl: string, res: any) {
  res.status(501).send("Instagram download not yet implemented");
}

// TikTok handlers (basic implementation)
async function handleTikTokInfo(videoUrl: string, res: any) {
  res.json({
    title: "TikTok Video",
    thumbnail: "",
    duration: 0,
    author: "TikTok User",
    platform: 'tiktok',
    formats: [{
      quality: "HD",
      container: "mp4",
      url: videoUrl,
      hasVideo: true,
      hasAudio: true,
      size: "Unknown"
    }],
    note: "TikTok download requires additional setup"
  });
}

async function handleTikTokDownload(videoUrl: string, res: any) {
  res.status(501).send("TikTok download not yet implemented");
}

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
      // Detect platform
      const platform = detectPlatform(videoUrl);
      
      switch (platform) {
        case 'youtube':
          return await handleYouTubeInfo(videoUrl, res);
        case 'facebook':
          return await handleFacebookInfo(videoUrl, res);
        case 'instagram':
          return await handleInstagramInfo(videoUrl, res);
        case 'tiktok':
          return await handleTikTokInfo(videoUrl, res);
        default:
          return res.status(400).json({ error: "Unsupported platform. Currently supported: YouTube, Facebook, Instagram, TikTok" });
      }
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
      const platform = detectPlatform(videoUrl);
      
      switch (platform) {
        case 'youtube':
          return await handleYouTubeDownload(videoUrl, itag, res);
        case 'facebook':
          return await handleFacebookDownload(videoUrl, res);
        case 'instagram':
          return await handleInstagramDownload(videoUrl, res);
        case 'tiktok':
          return await handleTikTokDownload(videoUrl, res);
        default:
          return res.status(400).send("Unsupported platform");
      }
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
