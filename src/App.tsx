import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileUp, 
  FileVideo, 
  FileAudio, 
  FileImage, 
  FileText, 
  Download, 
  X, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Eye,
  FileSearch,
  Settings2,
  Zap,
  ShieldCheck,
  Sparkles,
  RefreshCcw,
  History as HistoryIcon,
  Trash2,
  Clock,
  Calendar as CalendarIcon,
  Menu,
  Search,
  Filter,
  Plus,
  Settings,
  Link as LinkIcon,
  Play,
  Youtube,
  Globe,
  Info,
  MoreVertical,
  Share2,
  Edit3,
  FileIcon,
  ImageIcon,
  VideoIcon,
  Music,
  FileType,
  Facebook,
  Instagram,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Save,
  Copy,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Toaster, toast } from 'sonner';
import confetti from 'canvas-confetti';
import { convertMedia, convertImage, convertDoc, type ConversionSettings } from '@/lib/converters';
import { cn } from '@/lib/utils';

type FileStatus = 'idle' | 'converting' | 'completed' | 'error';
type View = 'downloader' | 'converter' | 'history' | 'formats' | 'viewer' | 'pdf-viewer' | 'image-viewer' | 'document-viewer' | 'editor';

interface VideoFormat {
  quality: string;
  container: string;
  url: string;
  hasVideo: boolean;
  hasAudio: boolean;
  size?: string;
  itag?: number;
}

interface VideoInfo {
  title: string;
  thumbnail: string;
  duration: string;
  author: string;
  formats: VideoFormat[];
  platform?: 'youtube' | 'facebook' | 'instagram' | 'tiktok' | 'other';
}

interface FileItem {
  id: string;
  file: File;
  status: FileStatus;
  progress: number;
  outputFormat: string;
  customFileName: string;
  category: string;
  settings: ConversionSettings;
  resultBlob?: Blob;
  error?: string;
  preview?: string;
  availableFormats?: string[];
  detectedType?: string;
}

interface HistoryItem {
  id: string;
  fileName: string;
  originalSize: number;
  outputFormat: string;
  timestamp: number;
  category: string;
  url?: string;
  type?: 'video' | 'image' | 'pdf' | 'audio' | 'other';
  source: 'download' | 'conversion';
  thumbnail?: string;
  platform?: string;
}

interface ViewerData {
  url: string;
  type: string;
  name: string;
  file?: File;
  blob?: Blob;
  historyItem?: HistoryItem;
}

const SUPPORTED_FORMATS = {
  video: ['mp4', 'webm', 'mov', 'avi', 'mkv', 'flv', 'wmv', '3gp', 'm4v', 'mpg', 'mpeg'],
  audio: ['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a', 'wma', 'aiff', 'opus'],
  image: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'tiff', 'svg', 'ico', 'heic', 'heif'],
  document: ['docx', 'doc', 'pdf', 'txt', 'rtf', 'odt', 'xls', 'xlsx', 'ppt', 'pptx', 'csv'],
  archive: ['zip', 'rar', '7z', 'tar', 'gz']
};

const TARGET_FORMATS = {
  video: ['mp4', 'avi', 'mov', 'webm', 'mkv', 'flv'],
  audio: ['mp3', 'wav', 'ogg', 'aac', 'flac'],
  image: ['png', 'jpg', 'webp', 'gif', 'bmp', 'tiff'],
  document: ['pdf', 'docx', 'txt', 'rtf', 'odt'],
  archive: ['zip', '7z']
};

// Smart format detection and conversion suggestions
const FORMAT_SUGGESTIONS = {
  // Video formats
  'mp4': { category: 'video', targets: ['avi', 'mov', 'webm', 'mkv', 'gif'] },
  'webm': { category: 'video', targets: ['mp4', 'avi', 'mov', 'mkv'] },
  'mov': { category: 'video', targets: ['mp4', 'avi', 'webm', 'mkv'] },
  'avi': { category: 'video', targets: ['mp4', 'mov', 'webm', 'mkv'] },
  'mkv': { category: 'video', targets: ['mp4', 'avi', 'mov', 'webm'] },
  'flv': { category: 'video', targets: ['mp4', 'avi', 'mov', 'webm'] },
  'wmv': { category: 'video', targets: ['mp4', 'avi', 'mov'] },
  '3gp': { category: 'video', targets: ['mp4', 'avi', 'mov'] },
  'm4v': { category: 'video', targets: ['mp4', 'avi', 'mov'] },
  'mpg': { category: 'video', targets: ['mp4', 'avi', 'mov'] },
  'mpeg': { category: 'video', targets: ['mp4', 'avi', 'mov'] },

  // Audio formats
  'mp3': { category: 'audio', targets: ['wav', 'ogg', 'aac', 'flac'] },
  'wav': { category: 'audio', targets: ['mp3', 'ogg', 'aac', 'flac'] },
  'ogg': { category: 'audio', targets: ['mp3', 'wav', 'aac', 'flac'] },
  'aac': { category: 'audio', targets: ['mp3', 'wav', 'ogg', 'flac'] },
  'flac': { category: 'audio', targets: ['mp3', 'wav', 'ogg', 'aac'] },
  'm4a': { category: 'audio', targets: ['mp3', 'wav', 'ogg', 'flac'] },
  'wma': { category: 'audio', targets: ['mp3', 'wav', 'ogg'] },
  'aiff': { category: 'audio', targets: ['mp3', 'wav', 'ogg', 'flac'] },
  'opus': { category: 'audio', targets: ['mp3', 'wav', 'ogg', 'flac'] },

  // Image formats
  'png': { category: 'image', targets: ['jpg', 'webp', 'gif', 'bmp', 'tiff'] },
  'jpg': { category: 'image', targets: ['png', 'webp', 'gif', 'bmp', 'tiff'] },
  'jpeg': { category: 'image', targets: ['png', 'webp', 'gif', 'bmp', 'tiff'] },
  'webp': { category: 'image', targets: ['png', 'jpg', 'gif', 'bmp', 'tiff'] },
  'gif': { category: 'image', targets: ['png', 'jpg', 'webp', 'bmp'] },
  'bmp': { category: 'image', targets: ['png', 'jpg', 'webp', 'tiff'] },
  'tiff': { category: 'image', targets: ['png', 'jpg', 'webp', 'bmp'] },
  'svg': { category: 'image', targets: ['png', 'jpg', 'webp'] },
  'ico': { category: 'image', targets: ['png', 'jpg', 'webp'] },
  'heic': { category: 'image', targets: ['png', 'jpg', 'webp', 'tiff'] },
  'heif': { category: 'image', targets: ['png', 'jpg', 'webp', 'tiff'] },

  // Document formats
  'docx': { category: 'document', targets: ['pdf', 'txt', 'rtf', 'odt'] },
  'doc': { category: 'document', targets: ['pdf', 'docx', 'txt', 'rtf'] },
  'pdf': { category: 'document', targets: ['docx', 'txt', 'rtf', 'odt'] },
  'txt': { category: 'document', targets: ['pdf', 'docx', 'rtf', 'odt'] },
  'rtf': { category: 'document', targets: ['pdf', 'docx', 'txt', 'odt'] },
  'odt': { category: 'document', targets: ['pdf', 'docx', 'txt', 'rtf'] },
  'xls': { category: 'document', targets: ['xlsx', 'csv', 'pdf'] },
  'xlsx': { category: 'document', targets: ['xls', 'csv', 'pdf'] },
  'ppt': { category: 'document', targets: ['pptx', 'pdf'] },
  'pptx': { category: 'document', targets: ['ppt', 'pdf'] },
  'csv': { category: 'document', targets: ['xlsx', 'xls', 'pdf'] }
};

import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';

function SettingsModal({ item, onUpdate }: { item: FileItem, onUpdate: (id: string, s: Partial<ConversionSettings>) => void }) {
  const category = (item as any).category;
  
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="ghost" size="icon" className="text-white/40 hover:text-white h-10 w-10 md:h-9 md:w-9" />}>
        <Settings2 className="w-5 h-5 md:w-4 md:h-4" />
      </DialogTrigger>
      <DialogContent className="bg-[#111827] border-white/10 text-white w-[95vw] sm:max-w-[425px] rounded-2xl">
        <DialogHeader>
          <DialogTitle>Conversion Settings</DialogTitle>
          <DialogDescription className="text-white/40">
            Customize the output parameters for {item.file.name}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          {category === 'image' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label>Quality</Label>
                <span className="text-xs font-mono text-blue-500">{item.settings.quality}%</span>
              </div>
              <Slider 
                value={[item.settings.quality || 80]} 
                onValueChange={(v) => {
                  const val = Array.isArray(v) ? v[0] : v;
                  onUpdate(item.id, { quality: val });
                }}
                max={100} 
                step={1}
                className="py-4"
              />
            </div>
          )}

          {(category === 'video' || category === 'audio') && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Bitrate</Label>
                <Select 
                  value={item.settings.bitrate} 
                  onValueChange={(v) => onUpdate(item.id, { bitrate: v })}
                >
                  <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue placeholder="Select bitrate" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-white/10 text-white">
                    <SelectItem value="64k">64k (Low)</SelectItem>
                    <SelectItem value="128k">128k (Standard)</SelectItem>
                    <SelectItem value="192k">192k (High)</SelectItem>
                    <SelectItem value="320k">320k (Ultra)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {category === 'video' && (
                <div className="space-y-2">
                  <Label>Resolution</Label>
                  <Select 
                    value={item.settings.resolution} 
                    onValueChange={(v) => onUpdate(item.id, { resolution: v })}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10">
                      <SelectValue placeholder="Select resolution" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1a] border-white/10 text-white">
                      <SelectItem value="original">Original</SelectItem>
                      <SelectItem value="1920x1080">1080p (FHD)</SelectItem>
                      <SelectItem value="1280x720">720p (HD)</SelectItem>
                      <SelectItem value="854x480">480p (SD)</SelectItem>
                      <SelectItem value="640x360">360p</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {category === 'doc' && (
            <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-sm text-white/40">
              Document conversion uses optimal settings automatically for best quality.
            </div>
          )}
        </div>
        
        <DialogFooter>
          <DialogClose render={<Button type="button" className="bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600 text-white w-full sm:w-auto rounded-full text-sm font-semibold" />}>
            Apply
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function GlobalSettingsModal({ settings, onUpdate }: { settings: any, onUpdate: (s: any) => void }) {
  return (
    <Dialog>
      <DialogTrigger render={
        <motion.div whileTap={{ scale: 0.9 }}>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white/40 hover:text-white h-10 w-10 rounded-full"
          />
        </motion.div>
      }>
        <Settings className="w-5 h-5" />
      </DialogTrigger>
      <DialogContent className="bg-[#111827] border-white/10 text-white max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Settings className="w-6 h-6 text-blue-500" />
            Settings
          </DialogTitle>
          <DialogDescription className="text-white/40 text-sm">
            Customize your conversion preferences
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-6">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
            <div className="space-y-0.5">
              <p className="font-bold text-xs tracking-tight">Auto-Download</p>
              <p className="text-[10px] text-white/40">Save files after conversion</p>
            </div>
            <Button
              variant={settings.autoDownload ? "default" : "outline"}
              size="sm"
              onClick={() => onUpdate({ ...settings, autoDownload: !settings.autoDownload })}
              className={cn(
                "rounded-full px-4 h-8 text-xs font-semibold transition-all",
                settings.autoDownload ? "bg-blue-500 text-white border-none shadow-[0_0_15px_rgba(59,130,246,0.3)]" : "border-white/10 text-white/40"
              )}
            >
              {settings.autoDownload ? "Enabled" : "Disabled"}
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
            <div className="space-y-0.5">
              <p className="font-bold text-xs tracking-tight">Auto-Clear Queue</p>
              <p className="text-[10px] text-white/40">Remove items after completion</p>
            </div>
            <Button
              variant={settings.clearOnComplete ? "default" : "outline"}
              size="sm"
              onClick={() => onUpdate({ ...settings, clearOnComplete: !settings.clearOnComplete })}
              className={cn(
                "rounded-full px-4 h-8 text-xs font-semibold transition-all",
                settings.clearOnComplete ? "bg-blue-500 text-white border-none shadow-[0_0_15px_rgba(59,130,246,0.3)]" : "border-white/10 text-white/40"
              )}
            >
              {settings.clearOnComplete ? "Enabled" : "Disabled"}
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
            <div className="space-y-0.5">
              <p className="font-bold text-xs tracking-tight">Preserve Metadata</p>
              <p className="text-[10px] text-white/40">Keep original file properties</p>
            </div>
            <Button
              variant={settings.preserveMetadata ? "default" : "outline"}
              size="sm"
              onClick={() => onUpdate({ ...settings, preserveMetadata: !settings.preserveMetadata })}
              className={cn(
                "rounded-full px-4 h-8 text-xs font-semibold transition-all",
                settings.preserveMetadata ? "bg-blue-500 text-white border-none shadow-[0_0_15px_rgba(59,130,246,0.3)]" : "border-white/10 text-white/40"
              )}
            >
              {settings.preserveMetadata ? "Enabled" : "Disabled"}
            </Button>
          </div>
        </div>

        <DialogFooter>
          <DialogClose render={<Button className="bg-white/10 hover:bg-white/20 text-white w-full rounded-full text-sm font-semibold" />}>
            Close
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SuccessDialog({ message, open, onOpenChange }: { message: string, open: boolean, onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#111827] border-blue-500/20 text-white w-[95vw] sm:max-w-[400px] rounded-2xl">
        <DialogHeader>
          <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center mb-4">
            <CheckCircle2 className="w-6 h-6 text-green-500" />
          </div>
          <DialogTitle className="text-xl font-bold">Success</DialogTitle>
          <DialogDescription className="text-white/50 pt-2 text-sm">
            {message}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-6">
          <Button 
            onClick={() => onOpenChange(false)}
            className="w-full bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600 text-white rounded-full h-12 font-semibold transition-all hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]"
          >
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ErrorDialog({ error, open, onOpenChange }: { error: string, open: boolean, onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#111827] border-red-500/20 text-white w-[95vw] sm:max-w-[400px] rounded-2xl">
        <DialogHeader>
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center mb-4">
            <AlertCircle className="w-6 h-6 text-red-500" />
          </div>
          <DialogTitle className="text-xl font-bold">Something went wrong</DialogTitle>
          <DialogDescription className="text-white/50 pt-2">
            {error || "An unexpected error occurred while processing your request."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-6">
          <Button 
            onClick={() => onOpenChange(false)}
            className="w-full bg-white/10 hover:bg-white/20 text-white rounded-2xl h-12 font-bold"
          >
            Dismiss
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VideoDownloader() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchInfo = async () => {
    if (!url) return;
    setLoading(true);
    setVideoInfo(null);
    setError(null);
    try {
      const response = await fetch(`/api/video-info?url=${encodeURIComponent(url)}`);
      const data = await response.json();
      if (data.error) {
        setError(data.error);
      } else {
        setVideoInfo(data);
      }
    } catch (error) {
      setError("Failed to fetch video info. Please check the URL and try again.");
    } finally {
      setLoading(false);
    }
  };

  const startDownload = (itag?: number) => {
    setDownloading(true);
    const downloadUrl = `/api/download?url=${encodeURIComponent(url)}${itag ? `&itag=${itag}` : ''}`;
    
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', '');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Add to history
    if (videoInfo) {
      const selectedFormat = videoInfo.formats.find(f => f.itag === itag) || videoInfo.formats[0];
      (window as any).addToHistory({
        fileName: videoInfo.title,
        originalSize: selectedFormat.size ? parseInt(selectedFormat.size) : 0,
        outputFormat: selectedFormat.container || 'mp4',
        category: 'video',
        source: 'download',
        thumbnail: videoInfo.thumbnail,
        type: 'video',
        url: downloadUrl // Note: This is a server URL, not a Blob URL
      });
    }

    setSuccessMessage("Download started! Your file is being prepared.");
    setTimeout(() => setDownloading(false), 3000);
  };

  return (
    <div className="space-y-8">
      <div className="text-center mb-12">
        <Badge variant="outline" className="mb-4 border-blue-500/20 bg-blue-500/5 text-blue-400 px-3 py-1 font-mono uppercase tracking-widest">
          Video Downloader
        </Badge>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6 bg-gradient-to-b from-white to-blue-400 bg-clip-text text-transparent uppercase">
          Download Videos. <br /> Instantly.
        </h1>
        <p className="text-lg text-white/50 max-w-2xl mx-auto leading-relaxed text-sm uppercase tracking-widest">
          Paste a video URL from YouTube, Facebook, Instagram, or TikTok below to get started.
        </p>
      </div>

      <Card className="bg-white/5 border-white/10 backdrop-blur-xl overflow-hidden shadow-lg max-w-3xl mx-auto relative group/card rounded-2xl border border-white/5">
        {/* Animated border effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-transparent to-violet-500/20 opacity-0 group-hover/card:opacity-100 transition-opacity duration-1000 pointer-events-none" />
        
        <CardContent className="p-6 md:p-8 space-y-6 relative z-10">
          <div className="relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <LinkIcon className="w-5 h-5 text-white/20 group-focus-within:text-blue-500 transition-colors" />
            </div>
            <Input
              placeholder="Paste video URL from YouTube, Facebook, Instagram, or TikTok..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="pl-12 h-14 bg-white/5 border-white/10 focus:border-blue-500 rounded-full text-lg transition-all font-mono"
              onKeyDown={(e) => e.key === 'Enter' && fetchInfo()}
            />
            <Button 
              onClick={fetchInfo}
              disabled={loading || !url}
              className="absolute right-2 top-2 bottom-2 bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600 text-white rounded-full px-6 font-semibold transition-all hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Analyze"}
            </Button>
          </div>

          <AnimatePresence>
            {videoInfo && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6 pt-4"
              >
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="relative aspect-video w-full md:w-64 rounded-2xl overflow-hidden bg-black/40 border border-white/10 shrink-0 group">
                    <img 
                      src={videoInfo.thumbnail} 
                      alt={videoInfo.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="w-10 h-10 text-white fill-white" />
                    </div>
                    <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-bold font-mono">
                      {Math.floor(parseInt(videoInfo.duration) / 60)}:{(parseInt(videoInfo.duration) % 60).toString().padStart(2, '0')}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <h3 className="text-xl font-bold truncate leading-tight">{videoInfo.title}</h3>
                    <p className="text-white/40 text-sm flex items-center gap-2">
                      {videoInfo.platform === 'youtube' && <Youtube className="w-4 h-4 text-red-500" />}
                      {videoInfo.platform === 'facebook' && <Facebook className="w-4 h-4 text-blue-600" />}
                      {videoInfo.platform === 'instagram' && <Instagram className="w-4 h-4 text-pink-500" />}
                      {videoInfo.platform === 'tiktok' && <Music className="w-4 h-4 text-black" />}
                      {videoInfo.author}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-2">
                      <Badge variant="secondary" className="bg-white/5 text-white/60 border-white/5 capitalize">
                        <Globe className="w-3 h-3 mr-1" />
                        {videoInfo.platform || 'Unknown'}
                      </Badge>
                      <Badge variant="secondary" className="bg-white/5 text-white/60 border-white/5">
                        <Info className="w-3 h-3 mr-1" />
                        MP4
                      </Badge>
                      {videoInfo.note && (
                        <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Limited Support
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <Separator className="bg-white/5" />

                <div className="space-y-4">
                  <h4 className="text-sm font-bold uppercase tracking-widest text-white/30">Available Resolutions</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {videoInfo.formats.map((format, idx) => (
                      <Button
                        key={idx}
                        variant="outline"
                        className="h-auto py-3 px-4 justify-between border-white/10 hover:border-blue-500/50 hover:bg-blue-500/5 rounded-full group transition-all"
                        onClick={() => startDownload(format.itag)}
                      >
                        <div className="text-left">
                          <p className="font-bold text-sm">{format.quality || 'Unknown Quality'}</p>
                          <p className="text-[10px] text-white/30 uppercase font-mono">
                            {format.container} • {format.size ? (parseInt(format.size) / (1024 * 1024)).toFixed(1) + ' MB' : 'Variable Size'}
                          </p>
                        </div>
                        <Download className="w-4 h-4 text-white/20 group-hover:text-blue-500 transition-colors" />
                      </Button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      <ErrorDialog 
        error={error || ""} 
        open={!!error} 
        onOpenChange={(o) => !o && setError(null)} 
      />

      <SuccessDialog
        message={successMessage || ""}
        open={!!successMessage}
        onOpenChange={(o) => !o && setSuccessMessage(null)}
      />

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mt-16 md:mt-24">
        {[
          {
            icon: <Zap className="w-6 h-6 text-blue-500" />,
            title: "Fast",
            desc: "Optimized downloads for maximum speed across all video qualities."
          },
          {
            icon: <ShieldCheck className="w-6 h-6 text-violet-500" />,
            title: "Private",
            desc: "No tracking, no logs. All downloads are processed securely."
          },
          {
            icon: <RefreshCcw className="w-6 h-6 text-green-500" />,
            title: "All Resolutions",
            desc: "Download from 360p to 4K Ultra HD where available."
          }
        ].map((feature, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/[0.08] transition-all group"
          >
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              {feature.icon}
            </div>
            <h3 className="text-xl font-bold mb-3 uppercase tracking-tight">{feature.title}</h3>
            <p className="text-white/40 leading-relaxed text-sm">{feature.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function AssetViewer({ data, onBack }: { data: { url: string, type: string, name: string }, onBack: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between mb-8">
        <Button variant="ghost" onClick={onBack} className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-full">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div className="text-right">
          <h2 className="text-xl font-bold truncate max-w-md">{data.name}</h2>
          <Badge variant="outline" className="border-blue-500/30 text-blue-400 uppercase font-mono text-[10px]">
            {data.type} Preview
          </Badge>
        </div>
      </div>

      <Card className="bg-black/40 border-white/10 overflow-hidden backdrop-blur-xl shadow-lg min-h-[60vh] flex items-center justify-center relative rounded-2xl">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5 pointer-events-none" />
        
        {data.type === 'image' && (
          <img src={data.url} alt={data.name} className="max-w-full max-h-[70vh] object-contain relative z-10" referrerPolicy="no-referrer" />
        )}
        {data.type === 'video' && (
          <video src={data.url} controls className="w-full max-h-[70vh] relative z-10" />
        )}
        {data.type === 'audio' && (
          <div className="flex flex-col items-center gap-6 p-12 relative z-10">
            <div className="w-24 h-24 rounded-full bg-purple-500/20 flex items-center justify-center animate-pulse">
              <FileAudio className="w-12 h-12 text-purple-500" />
            </div>
            <audio src={data.url} controls className="w-full max-w-md" />
          </div>
        )}
        {data.type === 'pdf' && (
          <iframe src={data.url} className="w-full h-[70vh] border-none relative z-10" title={data.name} />
        )}
        {data.type === 'other' && (
          <div className="text-center p-12 relative z-10">
            <FileText className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <p className="text-white/40">Preview not available for this file type.</p>
            <Button asChild className="mt-4 bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600 text-white rounded-full font-semibold hover:shadow-[0_0_15px_rgba(59,130,246,0.3)]">
              <a href={data.url} download={data.name}>Download to View</a>
            </Button>
          </div>
        )}
      </Card>
    </motion.div>
  );
}

export default function App() {
  const [view, setView] = useState<View>('downloader');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    const saved = localStorage.getItem('omni-convert-history');
    return saved ? JSON.parse(saved) : [];
  });
  const [isDragging, setIsDragging] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [globalSuccess, setGlobalSuccess] = useState<string | null>(null);
  const [viewerData, setViewerData] = useState<ViewerData | null>(null);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<HistoryItem | null>(null);
  const [showHistoryMenu, setShowHistoryMenu] = useState(false);
  
  // Global Settings
  const [settings, setGlobalSettings] = useState(() => {
    const saved = localStorage.getItem('omni-convert-settings');
    return saved ? JSON.parse(saved) : {
      autoDownload: false,
      clearOnComplete: false,
      preserveMetadata: true
    };
  });

  useEffect(() => {
    localStorage.setItem('omni-convert-settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('omni-convert-history', JSON.stringify(history));
  }, [history]);
  
  // History Filtering State
  const [searchQuery, setSearchQuery] = useState('');
  const [formatFilter, setFormatFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileType = (ext: string): any => {
    ext = ext.toLowerCase();
    if (SUPPORTED_FORMATS.video.includes(ext)) return 'video';
    if (SUPPORTED_FORMATS.audio.includes(ext)) return 'audio';
    if (SUPPORTED_FORMATS.image.includes(ext)) return 'image';
    if (ext === 'pdf') return 'pdf';
    return 'other';
  };

  const addToHistory = (item: FileItem | any) => {
    const historyItem: HistoryItem = {
      id: Math.random().toString(36).substring(7),
      fileName: item.customFileName ? `${item.customFileName}.${item.outputFormat}` : item.fileName,
      originalSize: item.file ? item.file.size : item.originalSize,
      outputFormat: item.outputFormat,
      timestamp: Date.now(),
      category: item.category,
      url: item.resultBlob ? URL.createObjectURL(item.resultBlob) : item.url,
      type: item.outputFormat ? getFileType(item.outputFormat) : item.type,
      source: item.source || 'conversion',
      thumbnail: item.thumbnail
    };
    setHistory(prev => [historyItem, ...prev].slice(0, 50));
  };

  // Expose to window for VideoDownloader
  useEffect(() => {
    (window as any).addToHistory = addToHistory;
  }, [history]);

  const filteredHistory = history.filter(item => {
    const matchesSearch = item.fileName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFormat = formatFilter === 'all' || item.outputFormat === formatFilter;
    
    let matchesDate = true;
    if (dateFilter !== 'all') {
      const now = new Date();
      const itemDate = new Date(item.timestamp);
      if (dateFilter === 'today') {
        matchesDate = itemDate.toDateString() === now.toDateString();
      } else if (dateFilter === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        matchesDate = itemDate >= weekAgo;
      } else if (dateFilter === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        matchesDate = itemDate >= monthAgo;
      }
    }
    
    return matchesSearch && matchesFormat && matchesDate;
  });

  const uniqueFormats = Array.from(new Set(history.map(item => item.outputFormat))).sort() as string[];

  const addFiles = useCallback(async (newFiles: FileList | File[]) => {
    const items: FileItem[] = await Promise.all(Array.from(newFiles).map(async (file) => {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const mimeType = file.type;

      // Smart file type detection
      let detectedType = 'other';
      let category: keyof typeof TARGET_FORMATS = 'image';
      let availableFormats: string[] = [];

      // Check by extension first, then by MIME type
      if (SUPPORTED_FORMATS.video.includes(ext) || mimeType.startsWith('video/')) {
        detectedType = 'video';
        category = 'video';
        availableFormats = FORMAT_SUGGESTIONS[ext]?.targets || TARGET_FORMATS.video;
      } else if (SUPPORTED_FORMATS.audio.includes(ext) || mimeType.startsWith('audio/')) {
        detectedType = 'audio';
        category = 'audio';
        availableFormats = FORMAT_SUGGESTIONS[ext]?.targets || TARGET_FORMATS.audio;
      } else if (SUPPORTED_FORMATS.image.includes(ext) || mimeType.startsWith('image/')) {
        detectedType = 'image';
        category = 'image';
        availableFormats = FORMAT_SUGGESTIONS[ext]?.targets || TARGET_FORMATS.image;
      } else if (SUPPORTED_FORMATS.document.includes(ext) ||
                 mimeType.includes('word') ||
                 mimeType.includes('text') ||
                 mimeType.includes('pdf') ||
                 mimeType.includes('spreadsheet') ||
                 mimeType.includes('presentation')) {
        detectedType = 'document';
        category = 'document';
        availableFormats = FORMAT_SUGGESTIONS[ext]?.targets || TARGET_FORMATS.document;
      } else if (SUPPORTED_FORMATS.archive.includes(ext)) {
        detectedType = 'archive';
        category = 'archive';
        availableFormats = TARGET_FORMATS.archive;
      }

      const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.'));

      // Generate preview for images and PDFs
      let preview: string | undefined;
      if (detectedType === 'image' && mimeType.startsWith('image/')) {
        preview = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        });
      } else if (detectedType === 'document' && ext === 'pdf') {
        // For PDFs, we'll generate a preview later when viewing
        preview = 'pdf-preview';
      }

      return {
        id: Math.random().toString(36).substring(7),
        file,
        status: 'idle',
        progress: 0,
        outputFormat: availableFormats[0] || TARGET_FORMATS[category]?.[0] || ext,
        customFileName: nameWithoutExt,
        category,
        detectedType,
        availableFormats,
        preview,
        settings: {
          quality: 80,
          bitrate: '128k',
          resolution: 'original'
        }
      } as FileItem;
    }));

    // Add new files to the top
    setFiles(prev => [...items, ...prev]);
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      addFiles(e.dataTransfer.files);
    }
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const updateOutputFormat = (id: string, format: string) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, outputFormat: format } : f));
  };

  const updateCustomFileName = (id: string, name: string) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, customFileName: name } : f));
  };

  const updateSettings = (id: string, settings: Partial<ConversionSettings>) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, settings: { ...f.settings, ...settings } } : f));
  };

  const clearHistory = () => {
    setHistory([]);
    toast.success('History cleared');
  };

  const clearCompleted = () => {
    setFiles(prev => prev.filter(f => f.status !== 'completed'));
    toast.success('Cleared completed files');
  };

  const convertFile = async (item: FileItem) => {
    setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'converting', progress: 0 } : f));

    try {
      let blob: Blob;
      const category = (item as any).category;

      if (category === 'video' || category === 'audio') {
        blob = await convertMedia(item.file, item.outputFormat, item.settings, (p) => {
          setFiles(prev => prev.map(f => f.id === item.id ? { ...f, progress: p } : f));
        });
      } else if (category === 'image') {
        blob = await convertImage(item.file, item.outputFormat, item.settings, (p) => {
          setFiles(prev => prev.map(f => f.id === item.id ? { ...f, progress: p } : f));
        });
      } else if (category === 'doc') {
        blob = await convertDoc(item.file, item.outputFormat, (p) => {
          setFiles(prev => prev.map(f => f.id === item.id ? { ...f, progress: p } : f));
        });
      } else {
        throw new Error('Unsupported category');
      }

      setFiles(prev => prev.map(f => f.id === item.id ? { 
        ...f, 
        status: 'completed', 
        progress: 100, 
        resultBlob: blob 
      } : f));
      
      addToHistory(item);
      
      if (settings.autoDownload) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${item.customFileName}.${item.outputFormat}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      if (settings.clearOnComplete) {
        setTimeout(() => {
          removeFile(item.id);
        }, 2000);
      }
      
      setGlobalSuccess(`Converted ${item.file.name} successfully!`);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (err) {
      console.error(err);
      setFiles(prev => prev.map(f => f.id === item.id ? { 
        ...f, 
        status: 'error', 
        error: err instanceof Error ? err.message : 'Conversion failed' 
      } : f));
      toast.error(`Failed to convert ${item.file.name}`);
      setGlobalError(`Failed to convert ${item.file.name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const downloadFile = (item: FileItem) => {
    if (!item.resultBlob) return;
    const url = URL.createObjectURL(item.resultBlob);
    const a = document.createElement('a');
    a.href = url;
    const fileName = item.customFileName || item.file.name.substring(0, item.file.name.lastIndexOf('.'));
    a.download = `${fileName}.${item.outputFormat}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getFileIcon = (fileName: string, category: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    
    const iconMap: Record<string, { icon: React.ReactNode, color: string, bg: string }> = {
      avi: { icon: <FileVideo />, color: 'text-blue-500', bg: 'bg-blue-600/10' },
      mp4: { icon: <FileVideo />, color: 'text-blue-400', bg: 'bg-blue-500/10' },
      mov: { icon: <FileVideo />, color: 'text-violet-400', bg: 'bg-violet-500/10' },
      webm: { icon: <FileVideo />, color: 'text-green-400', bg: 'bg-green-500/10' },
      mp3: { icon: <FileAudio />, color: 'text-violet-400', bg: 'bg-violet-500/10' },
      wav: { icon: <FileAudio />, color: 'text-blue-400', bg: 'bg-blue-500/10' },
      ogg: { icon: <FileAudio />, color: 'text-green-400', bg: 'bg-green-500/10' },
      png: { icon: <FileImage />, color: 'text-violet-400', bg: 'bg-violet-500/10' },
      jpg: { icon: <FileImage />, color: 'text-blue-400', bg: 'bg-blue-500/10' },
      jpeg: { icon: <FileImage />, color: 'text-blue-400', bg: 'bg-blue-500/10' },
      webp: { icon: <FileImage />, color: 'text-green-400', bg: 'bg-green-500/10' },
      gif: { icon: <FileImage />, color: 'text-blue-500', bg: 'bg-blue-600/10' },
      docx: { icon: <FileText />, color: 'text-blue-500', bg: 'bg-blue-600/10' },
      pdf: { icon: <FileText />, color: 'text-red-500', bg: 'bg-red-600/10' },
      txt: { icon: <FileText />, color: 'text-white/40', bg: 'bg-white/5' },
    };

    const config = iconMap[ext] || { 
      icon: category === 'video' ? <FileVideo /> : 
            category === 'audio' ? <FileAudio /> : 
            category === 'image' ? <FileImage /> : 
            category === 'doc' ? <FileText /> : <FileUp />,
      color: 'text-gray-400',
      bg: 'bg-white/5'
    };

    return (
      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center relative group/icon overflow-hidden shrink-0", config.bg)}>
        {React.cloneElement(config.icon as React.ReactElement, { 
          className: cn("w-6 h-6 transition-transform duration-300 group-hover/icon:scale-110", config.color) 
        })}
        <div className="absolute bottom-0 inset-x-0 bg-black/40 backdrop-blur-sm py-0.5 flex justify-center">
          <span className="text-[8px] font-bold uppercase tracking-tighter text-white/70">{ext}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-[#0B0F1A] text-white font-sans selection:bg-blue-500/30 flex flex-col overflow-hidden">
      <Toaster position="top-center" theme="dark" />
      
      <ErrorDialog 
        error={globalError || ""} 
        open={!!globalError} 
        onOpenChange={(o) => !o && setGlobalError(null)} 
      />

      <SuccessDialog
        message={globalSuccess || ""}
        open={!!globalSuccess}
        onOpenChange={(o) => !o && setGlobalSuccess(null)}
      />

      {/* Background Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.15, 0.1],
            x: [0, 50, 0],
            y: [0, 30, 0]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-blue-500/20 blur-[120px] rounded-full" 
        />
        <motion.div 
          animate={{ 
            scale: [1.2, 1, 1.2],
            opacity: [0.1, 0.15, 0.1],
            x: [0, -50, 0],
            y: [0, -30, 0]
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] bg-violet-500/20 blur-[120px] rounded-full" 
        />
      </div>

      <header className="relative z-30 border-b border-white/5 bg-black/40 backdrop-blur-xl shrink-0">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 md:h-20 flex items-center justify-between">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setView('converter')}>
            <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-blue-500 to-violet-500 rounded-lg md:rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.3)]">
              <RefreshCcw className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <span className="text-lg md:text-xl font-bold tracking-tight">OmniConvert <span className="bg-gradient-to-r from-blue-500 to-violet-500 bg-clip-text text-transparent">Pro</span></span>
          </div>
          
          <nav className="hidden md:flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/5">
            <motion.div whileTap={{ scale: 0.95 }}>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setView('downloader')}
                className={cn(
                  "rounded-lg px-4 transition-all text-sm font-medium",
                  view === 'downloader' ? "bg-blue-500/20 text-blue-200" : "text-white/40 hover:text-white"
                )}
              >
                <Download className="w-4 h-4 mr-2" />
                Downloader
              </Button>
            </motion.div>
            <motion.div whileTap={{ scale: 0.95 }}>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setView('converter')}
                className={cn(
                  "rounded-lg px-4 transition-all text-sm font-medium",
                  view === 'converter' ? "bg-blue-500/20 text-blue-200" : "text-white/40 hover:text-white"
                )}
              >
                <Zap className="w-4 h-4 mr-2" />
                Converter
              </Button>
            </motion.div>
            <motion.div whileTap={{ scale: 0.95 }}>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setView('history')}
                className={cn(
                  "rounded-lg px-4 transition-all text-sm font-medium",
                  view === 'history' ? "bg-blue-500/20 text-blue-200" : "text-white/40 hover:text-white"
                )}
              >
                <HistoryIcon className="w-4 h-4 mr-2" />
                History
                {history.length > 0 && (
                  <Badge className="ml-2 bg-blue-500 text-white border-none h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                    {history.length}
                  </Badge>
                )}
              </Button>
            </motion.div>
            <motion.div whileTap={{ scale: 0.95 }}>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setView('formats')}
                className={cn(
                  "rounded-lg px-4 transition-all text-sm font-medium",
                  view === 'formats' ? "bg-blue-500/20 text-blue-200" : "text-white/40 hover:text-white"
                )}
              >
                <Settings2 className="w-4 h-4 mr-2" />
                Formats
              </Button>
            </motion.div>
          </nav>

          <div className="flex items-center gap-2">
            <GlobalSettingsModal settings={settings} onUpdate={setGlobalSettings} />
            <Button variant="outline" className="border-white/10 hover:bg-white/5 hidden sm:flex rounded-full text-sm font-medium">
              Sign In
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 overflow-y-auto scrollbar-hide pb-20 md:pb-0">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-12">
          <AnimatePresence mode="wait">
            {view === 'downloader' ? (
              <motion.div
                key="downloader"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <VideoDownloader />
              </motion.div>
            ) : view === 'viewer' && viewerData ? (
              <AssetViewer 
                data={viewerData} 
                onBack={() => setView('history')} 
              />
            ) : view === 'converter' ? (
              <motion.div
                key="converter"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
              <div className="text-center mb-16 relative">
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-64 h-64 bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />
                <Badge variant="outline" className="mb-4 border-blue-500/20 bg-blue-500/5 text-blue-400 px-3 py-1 font-mono tracking-widest uppercase">
                  File Converter
                </Badge>
                <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6 bg-gradient-to-b from-white to-blue-400 bg-clip-text text-transparent uppercase">
                  Convert Files. <br /> Instantly.
                </h1>
                <div className="flex items-center justify-center gap-4 text-xs font-mono text-blue-500/50 uppercase tracking-[0.3em]">
                  <span className="animate-pulse">● Local Processing</span>
                  <Separator orientation="vertical" className="h-4 bg-blue-500/20" />
                  <span>Multiple Formats</span>
                </div>
              </div>

              <Card className="bg-white/5 border-white/10 backdrop-blur-xl overflow-hidden shadow-lg relative group/card rounded-2xl">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-violet-500/5 opacity-0 group-hover/card:opacity-100 transition-opacity duration-1000 pointer-events-none" />
                <CardContent className="p-0">
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={onDrop}
                    className={cn(
                      "relative p-12 md:p-20 border-2 border-dashed transition-all duration-500 flex flex-col items-center justify-center gap-6 cursor-pointer group overflow-hidden",
                      isDragging ? "border-blue-500 bg-blue-500/10 scale-[0.99]" : "border-white/10 hover:border-white/20 hover:bg-white/[0.02]"
                    )}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {/* Background Decorative Elements */}
                    <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
                      <div className="absolute top-10 left-10 w-32 h-32 bg-blue-500/20 blur-3xl rounded-full animate-pulse" />
                      <div className="absolute bottom-10 right-10 w-32 h-32 bg-violet-500/20 blur-3xl rounded-full animate-pulse delay-700" />
                    </div>

                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      multiple 
                      onChange={(e) => e.target.files && addFiles(e.target.files)}
                    />
                    
                    <motion.div 
                      animate={isDragging ? { scale: 1.2, rotate: 10 } : { scale: 1, rotate: 0 }}
                      className="w-20 h-20 rounded-2xl bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-500 relative z-10 border border-blue-500/20"
                    >
                      <FileUp className="w-10 h-10 text-blue-500" />
                    </motion.div>

                    <div className="text-center relative z-10">
                      <h2 className="text-2xl md:text-3xl font-bold mb-2 tracking-tight uppercase">Upload Files</h2>
                      <p className="text-white/40 max-w-xs mx-auto leading-relaxed">
                        Drag and drop your files here. Support for <span className="text-blue-400">Video, Audio, Images, and Documents</span>.
                      </p>
                    </div>

                    <div className="flex items-center gap-4 mt-4 relative z-10">
                      <div className="flex -space-x-2">
                        {[FileVideo, FileAudio, FileImage, FileText].map((Icon, i) => (
                          <div key={i} className="w-10 h-10 rounded-full bg-[#111827] border-2 border-blue-500/20 flex items-center justify-center shadow-xl">
                            <Icon className="w-4 h-4 text-blue-500/40" />
                          </div>
                        ))}
                      </div>
                      <span className="text-[10px] font-mono tracking-widest text-blue-500/30">All formats supported</span>
                    </div>

                    {/* Dragging Overlay */}
                    <AnimatePresence>
                      {isDragging && (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 bg-blue-500/10 backdrop-blur-sm flex items-center justify-center z-20 pointer-events-none"
                        >
                          <div className="flex flex-col items-center gap-4">
                            <div className="w-24 h-24 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
                            <span className="text-blue-500 font-bold text-xl uppercase tracking-tighter font-mono">Uploading...</span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <AnimatePresence>
                    {files.length === 0 && (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="grid grid-cols-1 md:grid-cols-3 gap-6 p-8 bg-black/40 border-t border-white/5"
                      >
                        {[
                          {
                            title: "Local Processing",
                            desc: "Files never leave your device. All conversion happens in your browser.",
                            icon: <ShieldCheck className="w-5 h-5 text-blue-500" />
                          },
                          {
                            title: "Fast Conversion",
                            desc: "Convert multiple files simultaneously for maximum efficiency.",
                            icon: <Zap className="w-5 h-5 text-violet-500" />
                          },
                          {
                            title: "Premium Quality",
                            desc: "Maintain quality with professional-grade encoding.",
                            icon: <Sparkles className="w-5 h-5 text-green-500" />
                          }
                        ].map((feature, i) => (
                          <div key={i} className="space-y-2 group/feat">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 rounded-lg bg-white/5 group-hover/feat:bg-purple-500/10 transition-colors">
                                {feature.icon}
                              </div>
                              <h4 className="font-bold text-sm uppercase tracking-tight">{feature.title}</h4>
                            </div>
                            <p className="text-xs text-white/30 leading-relaxed">{feature.desc}</p>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {files.length > 0 && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-white/10"
                      >
                        <div className="p-6 space-y-4">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-white/30">Queue ({files.length})</h3>
                            {files.some(f => f.status === 'completed') && (
                              <Dialog>
                                <DialogTrigger render={
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="text-xs text-purple-500 hover:text-purple-400 hover:bg-purple-500/10 h-7 px-2"
                                  >
                                    <Trash2 className="w-3 h-3 mr-1.5" />
                                    Clear Completed
                                  </Button>
                                } />
                                <DialogContent className="bg-[#1a1a1a] border-white/10 text-white w-[95vw] sm:max-w-[400px] rounded-2xl">
                                  <DialogHeader>
                                    <DialogTitle>Clear Completed Files?</DialogTitle>
                                    <DialogDescription className="text-white/50">
                                      This will remove all successfully converted files from your queue. This action cannot be undone.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <DialogFooter className="flex gap-2 mt-4">
                                    <DialogClose render={<Button variant="ghost" className="flex-1" />}>
                                      Cancel
                                    </DialogClose>
                                    <DialogClose render={<Button onClick={clearCompleted} className="bg-red-500 hover:bg-red-600 text-white flex-1" />}>
                                      Clear All
                                    </DialogClose>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            )}
                          </div>
                          {files.map((item) => (
                            <motion.div
                              key={item.id}
                              layout
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.9 }}
                              className="bg-white/5 rounded-2xl border border-white/5 p-3 md:p-4 flex flex-col md:flex-row items-center gap-4 md:gap-6"
                            >
                              <div className="flex items-center gap-3 md:gap-4 w-full md:w-auto flex-1 min-w-0">
                                <div className="shrink-0 relative">
                                  {getFileIcon(item.file.name, (item as any).category)}
                                  {(item as any).preview && (item as any).preview !== 'pdf-preview' && (
                                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border border-white/20"></div>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  {item.status === 'idle' ? (
                                    <div className="flex items-center gap-2 group/input">
                                      <input
                                        type="text"
                                        value={item.customFileName}
                                        onChange={(e) => updateCustomFileName(item.id, e.target.value)}
                                        className="bg-transparent border-b border-white/10 focus:border-purple-500 outline-none w-full font-medium transition-colors py-0.5 text-sm"
                                        placeholder="Filename"
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                      <span className="text-white/20 text-[10px] font-mono">.{item.outputFormat}</span>
                                    </div>
                                  ) : (
                                    <p className="font-medium truncate text-sm">
                                      {item.customFileName}.{item.outputFormat}
                                    </p>
                                  )}
                                  <p className="text-[10px] text-white/40 uppercase tracking-wider font-mono mt-0.5 truncate">
                                    {(item.file.size / (1024 * 1024)).toFixed(2)} MB • {item.file.name}
                                  </p>
                                  {(item as any).detectedType && (
                                    <p className="text-[9px] text-purple-400/60 uppercase tracking-wider font-mono mt-0.5">
                                      Detected: {(item as any).detectedType}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 md:gap-4 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-white/5 pt-2 md:pt-0">
                                <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/5">
                                  <span className="text-[10px] font-bold text-white/20 px-1.5 uppercase">Convert To</span>
                                  <select 
                                    value={item.outputFormat}
                                    onChange={(e) => updateOutputFormat(item.id, e.target.value)}
                                    disabled={item.status !== 'idle'}
                                    className="bg-transparent text-xs font-bold focus:outline-none cursor-pointer pr-1"
                                  >
                                    {(item as any).availableFormats?.map((fmt: string) => (
                                      <option key={fmt} value={fmt} className="bg-[#1a1a1a]">{fmt.toUpperCase()}</option>
                                    )) || TARGET_FORMATS[(item as any).category as keyof typeof TARGET_FORMATS].map(fmt => (
                                      <option key={fmt} value={fmt} className="bg-[#1a1a1a]">{fmt.toUpperCase()}</option>
                                    ))}
                                  </select>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  {item.status === 'idle' && (
                                    <>
                                      <SettingsModal item={item} onUpdate={updateSettings} />
                                      <motion.div whileTap={{ scale: 0.95 }}>
                                        <Button 
                                          size="sm" 
                                          className="bg-purple-500 hover:bg-purple-600 text-white font-bold h-8 rounded-xl px-4 text-xs"
                                          onClick={() => convertFile(item)}
                                        >
                                          Convert
                                        </Button>
                                      </motion.div>
                                    </>
                                  )}
                                  {item.status === 'converting' && (
                                    <div className="flex flex-col gap-1.5 min-w-[140px]">
                                      <div className="flex justify-between items-center text-[10px] uppercase tracking-widest font-bold text-blue-500/70">
                                        <span>Converting</span>
                                        <span>{Math.round(item.progress)}%</span>
                                      </div>
                                      <Progress value={item.progress} className="h-1.5 bg-white/5" />
                                    </div>
                                  )}
                                  {item.status === 'completed' && (
                                    <motion.div whileTap={{ scale: 0.95 }}>
                                      <Button 
                                        size="sm" 
                                        variant="outline" 
                                        className="border-blue-500/50 text-blue-500 hover:bg-blue-500/10 h-8 rounded-full text-xs px-3 font-semibold"
                                        onClick={() => downloadFile(item)}
                                      >
                                        <Download className="w-3.5 h-3.5 mr-1.5" />
                                        Download
                                      </Button>
                                    </motion.div>
                                  )}
                                  {item.status === 'error' && (
                                    <div className="flex flex-col items-end gap-1">
                                      <Badge variant="destructive" className="flex items-center gap-1 text-[9px] h-5 px-1.5">
                                        <AlertCircle className="w-3 h-3" />
                                        Error
                                      </Badge>
                                      {item.error && (
                                        <p className="text-[9px] text-red-400/80 max-w-[120px] text-right leading-tight truncate">
                                          {item.error}
                                        </p>
                                      )}
                                    </div>
                                  )}
                                  
                                  {/* Three-dot menu */}
                                  <div className="relative">
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <motion.div whileTap={{ scale: 0.9 }}>
                                          <Button 
                                            size="icon" 
                                            variant="ghost" 
                                            className="text-white/20 hover:text-white/60 h-8 w-8 rounded-full"
                                          >
                                            <MoreVertical className="w-4 h-4" />
                                          </Button>
                                        </motion.div>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent className="w-48 bg-black/90 border-white/10">
                                        <DropdownMenuItem 
                                          className="text-white/80 hover:bg-white/10 cursor-pointer"
                                          onClick={() => {
                                            // Open viewer for supported types
                                            if ((item as any).detectedType === 'image' || (item as any).detectedType === 'document') {
                                              setViewerData({
                                                file: item.file,
                                                type: (item as any).detectedType,
                                                preview: (item as any).preview
                                              });
                                              setCurrentView('viewer');
                                            }
                                          }}
                                        >
                                          <Eye className="w-4 h-4 mr-2" />
                                          View File
                                        </DropdownMenuItem>
                                        <DropdownMenuItem 
                                          className="text-white/80 hover:bg-white/10 cursor-pointer"
                                          onClick={() => {
                                            // Share functionality
                                            if (navigator.share && item.status === 'completed') {
                                              navigator.share({
                                                title: item.customFileName,
                                                files: [item.outputBlob as File]
                                              });
                                            }
                                          }}
                                        >
                                          <Share2 className="w-4 h-4 mr-2" />
                                          Share
                                        </DropdownMenuItem>
                                        <DropdownMenuItem 
                                          className="text-white/80 hover:bg-white/10 cursor-pointer"
                                          onClick={() => {
                                            // Duplicate file
                                            const duplicatedItem = { ...item, id: Math.random().toString(36).substring(7) };
                                            setFiles(prev => [duplicatedItem, ...prev]);
                                          }}
                                        >
                                          <Copy className="w-4 h-4 mr-2" />
                                          Duplicate
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator className="bg-white/10" />
                                        <DropdownMenuItem 
                                          className="text-red-400 hover:bg-red-500/10 cursor-pointer"
                                          onClick={() => removeFile(item.id)}
                                        >
                                          <Trash2 className="w-4 h-4 mr-2" />
                                          Remove
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>

              {/* Features Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mt-16 md:mt-24">
                {[
                  {
                    icon: <ShieldCheck className="w-6 h-6 text-purple-500" />,
                    title: "Neural Privacy",
                    desc: "All processing occurs within your local browser environment. No data ever leaves your device."
                  },
                  {
                    icon: <Zap className="w-6 h-6 text-indigo-500" />,
                    title: "Quantum Speed",
                    desc: "Optimized multi-threaded processing for near-instantaneous asset synchronization."
                  },
                  {
                    icon: <Settings2 className="w-6 h-6 text-fuchsia-500" />,
                    title: "Pro Protocols",
                    desc: "Advanced format selection and high-quality output for all your professional needs."
                  }
                ].map((feature, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/[0.07] transition-colors"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-6">
                      {feature.icon}
                    </div>
                    <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                    <p className="text-white/40 leading-relaxed">{feature.desc}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : view === 'history' ? (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-4xl font-bold tracking-tight mb-2 uppercase">Neural History</h2>
                  <p className="text-white/40 font-mono text-xs uppercase tracking-widest">Accessing local data streams...</p>
                </div>
                {history.length > 0 && (
                  <Button 
                    variant="outline" 
                    className="border-purple-500/20 text-purple-400 hover:bg-purple-500/10 rounded-xl"
                    onClick={clearHistory}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Purge History
                  </Button>
                )}
              </div>

              {/* Search and Filters */}
              {history.length > 0 && (
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    <input
                      type="text"
                      placeholder="Search files..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-full py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                  <div className="flex gap-3">
                    <div className="relative flex-1 md:flex-none">
                      <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
                      <select
                        value={formatFilter}
                        onChange={(e) => setFormatFilter(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-full py-2.5 pl-9 pr-8 text-sm focus:outline-none focus:border-blue-500 transition-colors appearance-none cursor-pointer uppercase font-mono"
                      >
                        <option value="all">All Formats</option>
                        {uniqueFormats.map(fmt => (
                          <option key={fmt} value={fmt}>{fmt.toUpperCase()}</option>
                        ))}
                      </select>
                    </div>
                    <div className="relative flex-1 md:flex-none">
                      <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
                      <select
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-full py-2.5 pl-9 pr-8 text-sm focus:outline-none focus:border-blue-500 transition-colors appearance-none cursor-pointer"
                      >
                        <option value="all">All Time</option>
                        <option value="today">Today</option>
                        <option value="week">This Week</option>
                        <option value="month">This Month</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {history.length === 0 ? (
                <Card className="bg-white/5 border-white/10 border-dashed p-20 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6">
                    <Clock className="w-8 h-8 text-white/20" />
                  </div>
                  <h3 className="text-xl font-medium mb-2">No history yet</h3>
                  <p className="text-white/40 mb-8 max-w-xs">Start converting files to see them listed here for quick reference.</p>
                  <Button onClick={() => setView('converter')} className="bg-purple-500 hover:bg-purple-600 text-white rounded-xl">
                    Go to Terminal
                  </Button>
                </Card>
              ) : filteredHistory.length === 0 ? (
                <Card className="bg-white/5 border-white/10 border-dashed p-20 flex flex-col items-center justify-center text-center rounded-3xl">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6">
                    <FileSearch className="w-8 h-8 text-white/20" />
                  </div>
                  <h3 className="text-xl font-medium mb-2 uppercase">No logs found</h3>
                  <p className="text-white/40 max-w-xs">Adjust your search parameters to locate the asset.</p>
                  <Button 
                    variant="link" 
                    onClick={() => {
                      setSearchQuery('');
                      setFormatFilter('all');
                      setDateFilter('all');
                    }}
                    className="text-purple-500 mt-4"
                  >
                    Reset Neural Filters
                  </Button>
                </Card>
              ) : (
                <div className="space-y-3">
                  {filteredHistory.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="group bg-white/5 hover:bg-white/[0.08] rounded-2xl border border-white/5 p-3 md:p-4 flex items-center justify-between transition-all active:scale-[0.98] relative overflow-hidden"
                    >
                      <div className="absolute inset-y-0 left-0 w-1 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      
                      <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                        <div className="shrink-0">
                          {getFileIcon(item.fileName, item.category)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="font-medium truncate text-sm">{item.fileName}</p>
                            <ArrowRight className="w-3 h-3 text-white/20 shrink-0" />
                            <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[9px] px-1.5 h-4 uppercase font-bold">
                              {item.outputFormat}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-[10px] text-white/30 font-mono">
                            <span className="flex items-center gap-1">
                              <CalendarIcon className="w-2.5 h-2.5" />
                              {new Date(item.timestamp).toLocaleDateString()}
                            </span>
                            <span>{(item.originalSize / (1024 * 1024)).toFixed(2)} MB</span>
                            {item.source === 'download' && (
                              <Badge variant="outline" className="text-[8px] h-3 px-1 border-indigo-500/30 text-indigo-400">DL</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        {item.url && (
                          <motion.div whileTap={{ scale: 0.9 }}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-purple-400 hover:text-purple-300 h-8 w-8 rounded-full"
                              onClick={() => {
                                setViewerData({ url: item.url!, type: item.type || 'other', name: item.fileName });
                                setView('viewer');
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </motion.div>
                        )}
                        <motion.div whileTap={{ scale: 0.9 }}>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-white/20 hover:text-red-400 h-8 w-8 rounded-full"
                            onClick={(e) => {
                              e.stopPropagation();
                              const newHistory = history.filter(h => h.id !== item.id);
                              setHistory(newHistory);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </motion.div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="formats"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="space-y-12"
            >
              <div className="text-center max-w-2xl mx-auto">
                <h2 className="text-4xl font-bold tracking-tight mb-4">Supported Formats</h2>
                <p className="text-white/40">
                  OmniConvert Pro supports a wide range of file formats. All processing happens locally in your browser.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  {
                    title: "Video",
                    icon: <FileVideo className="w-6 h-6 text-blue-400" />,
                    inputs: SUPPORTED_FORMATS.video,
                    outputs: TARGET_FORMATS.video,
                    color: "from-blue-500/20 to-transparent"
                  },
                  {
                    title: "Audio",
                    icon: <FileAudio className="w-6 h-6 text-violet-400" />,
                    inputs: SUPPORTED_FORMATS.audio,
                    outputs: TARGET_FORMATS.audio,
                    color: "from-violet-500/20 to-transparent"
                  },
                  {
                    title: "Image",
                    icon: <FileImage className="w-6 h-6 text-green-400" />,
                    inputs: SUPPORTED_FORMATS.image,
                    outputs: TARGET_FORMATS.image,
                    color: "from-green-500/20 to-transparent"
                  },
                  {
                    title: "Document",
                    icon: <FileText className="w-6 h-6 text-blue-500" />,
                    inputs: SUPPORTED_FORMATS.doc,
                    outputs: TARGET_FORMATS.doc,
                    color: "from-blue-500/20 to-transparent"
                  }
                ].map((cat, i) => (
                  <Card key={i} className="bg-white/5 border-white/10 overflow-hidden group">
                    <div className={cn("h-1 bg-gradient-to-r", cat.color)} />
                    <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                      <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                        {cat.icon}
                      </div>
                      <CardTitle>{cat.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div>
                        <p className="text-[10px] uppercase tracking-widest font-bold text-white/30 mb-3">Input Formats</p>
                        <div className="flex flex-wrap gap-2">
                          {cat.inputs.map(fmt => (
                            <Badge key={fmt} variant="secondary" className="bg-white/5 hover:bg-white/10 text-white/70 border-white/5">
                              .{fmt}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <Separator className="bg-white/5" />
                      <div>
                        <p className="text-[10px] uppercase tracking-widest font-bold text-purple-500/50 mb-3">Output Formats</p>
                        <div className="flex flex-wrap gap-2">
                          {cat.outputs.map(fmt => (
                            <Badge key={fmt} variant="outline" className="border-purple-500/30 text-purple-400 bg-purple-500/5">
                              .{fmt}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-8 flex flex-col md:flex-row items-center gap-6">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center shrink-0">
                  <Zap className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h4 className="text-lg font-bold mb-1 text-blue-400">More formats coming soon</h4>
                  <p className="text-sm text-white/40">
                    We're constantly adding more formats. Everything runs locally for optimal stability and performance.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <footer className="border-t border-white/5 py-12 mt-20">
          <div className="max-w-7xl mx-auto px-4 md:px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-white/40">
            <p>© 2026 OmniConvert Pro. All rights reserved.</p>
            <div className="flex items-center gap-8">
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">GitHub</a>
            </div>
          </div>
        </footer>
      </div>
    </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-black/60 backdrop-blur-xl border-t border-white/10 px-6 py-3 flex items-center justify-around pb-safe">
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={() => setView('downloader')}
          className={cn(
            "flex flex-col items-center gap-1 transition-all",
            view === 'downloader' ? "text-blue-500" : "text-white/40"
          )}
        >
          <div className={cn(
            "p-2 rounded-full transition-all",
            view === 'downloader' ? "bg-blue-500/10" : ""
          )}>
            <Download className="w-5 h-5" />
          </div>
          <span className="text-[9px] font-bold uppercase tracking-widest">Download</span>
        </motion.button>

        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={() => setView('converter')}
          className={cn(
            "flex flex-col items-center gap-1 transition-all",
            view === 'converter' ? "text-blue-500" : "text-white/40"
          )}
        >
          <div className={cn(
            "p-2 rounded-full transition-all",
            view === 'converter' ? "bg-blue-500/10" : ""
          )}>
            <Zap className="w-5 h-5" />
          </div>
          <span className="text-[9px] font-bold uppercase tracking-widest">Convert</span>
        </motion.button>
        
        <motion.div 
          whileTap={{ scale: 0.9 }}
          className="w-12 h-12 -mt-10 bg-gradient-to-br from-blue-500 to-violet-500 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.4)] border-4 border-[#0B0F1A] cursor-pointer hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] transition-shadow" 
          onClick={() => fileInputRef.current?.click()}
        >
          <Plus className="w-6 h-6 text-white" />
        </motion.div>

        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={() => setView('history')}
          className={cn(
            "flex flex-col items-center gap-1 transition-all",
            view === 'history' ? "text-blue-500" : "text-white/40"
          )}
        >
          <div className={cn(
            "p-2 rounded-full transition-all",
            view === 'history' ? "bg-blue-500/10" : ""
          )}>
            <HistoryIcon className="w-5 h-5" />
          </div>
          <span className="text-[9px] font-bold uppercase tracking-widest">History</span>
        </motion.button>

        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={() => setView('formats')}
          className={cn(
            "flex flex-col items-center gap-1 transition-all",
            view === 'formats' ? "text-blue-500" : "text-white/40"
          )}
        >
          <div className={cn(
            "p-2 rounded-full transition-all",
            view === 'formats' ? "bg-blue-500/10" : ""
          )}>
            <Settings2 className="w-5 h-5" />
          </div>
          <span className="text-[9px] font-bold uppercase tracking-widest">Formats</span>
        </motion.button>
      </nav>
    </div>
  );
}
