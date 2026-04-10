import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { jsPDF } from 'jspdf';
import mammoth from 'mammoth';
import * as pdfjs from 'pdfjs-dist';

// Set worker for pdfjs
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

let ffmpeg: FFmpeg | null = null;

export interface ConversionSettings {
  quality?: number; // 0-100
  bitrate?: string;
  resolution?: string;
}

export async function getFFmpeg() {
  if (ffmpeg) return ffmpeg;

  ffmpeg = new FFmpeg();
  
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });

  return ffmpeg;
}

export async function convertMedia(file: File, outputFormat: string, settings: ConversionSettings, onProgress?: (p: number) => void) {
  const ffmpeg = await getFFmpeg();
  
  const inputName = 'input' + file.name.substring(file.name.lastIndexOf('.'));
  const outputName = `output.${outputFormat}`;

  ffmpeg.on('log', ({ message }) => {
    console.log(message);
  });

  ffmpeg.on('progress', ({ progress }) => {
    if (onProgress) onProgress(progress * 100);
  });

  await ffmpeg.writeFile(inputName, await fetchFile(file));
  
  const args = ['-i', inputName];

  if (settings.bitrate) {
    args.push('-b:a', settings.bitrate);
    args.push('-b:v', settings.bitrate);
  }

  if (settings.resolution && settings.resolution !== 'original') {
    args.push('-s', settings.resolution);
  }

  args.push(outputName);

  await ffmpeg.exec(args);

  const data = await ffmpeg.readFile(outputName);
  
  let type = 'video/mp4';
  if (outputFormat === 'mp3') type = 'audio/mpeg';
  else if (outputFormat === 'wav') type = 'audio/wav';
  else if (outputFormat === 'avi') type = 'video/x-msvideo';
  else if (outputFormat === 'mov') type = 'video/quicktime';

  const blob = new Blob([data], { type });
  
  return blob;
}

export async function convertImage(file: File, outputFormat: string, settings: ConversionSettings, onProgress?: (p: number) => void) {
  return new Promise<Blob>((resolve, reject) => {
    if (onProgress) onProgress(10);
    const reader = new FileReader();
    reader.onload = (e) => {
      if (onProgress) onProgress(30);
      const img = new Image();
      img.onload = () => {
        if (onProgress) onProgress(60);
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Failed to get canvas context'));
        
        ctx.drawImage(img, 0, 0);
        if (onProgress) onProgress(90);
        
        const quality = (settings.quality || 80) / 100;
        canvas.toBlob((blob) => {
          if (blob) {
            if (onProgress) onProgress(100);
            resolve(blob);
          }
          else reject(new Error('Failed to convert image'));
        }, `image/${outputFormat}`, quality);
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function convertDoc(file: File, outputFormat: string, onProgress?: (p: number) => void) {
  const ext = file.name.split('.').pop()?.toLowerCase();
  
  if (outputFormat === 'pdf') {
    if (ext === 'docx') {
      return convertDocToPdf(file, onProgress);
    } else if (ext === 'txt') {
      return convertTxtToPdf(file, onProgress);
    }
  } else if (outputFormat === 'txt') {
    if (ext === 'pdf') {
      return convertPdfToTxt(file, onProgress);
    } else if (ext === 'docx') {
      return convertDocxToTxt(file, onProgress);
    }
  } else if (outputFormat === 'docx') {
    throw new Error('PDF to DOCX conversion is currently not supported in-browser. Suggestion: Try converting to TXT or PDF first.');
  }

  throw new Error(`Unsupported conversion: ${ext?.toUpperCase()} to ${outputFormat.toUpperCase()}. Suggestion: Check if the file format is supported in the "Formats" tab.`);
}

async function convertDocToPdf(file: File, onProgress?: (p: number) => void) {
  if (onProgress) onProgress(10);
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer });
  const html = result.value;
  if (onProgress) onProgress(50);

  const doc = new jsPDF();
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  const text = tempDiv.innerText || tempDiv.textContent || "";
  
  const lines = doc.splitTextToSize(text, 180);
  doc.text(lines, 10, 10);
  if (onProgress) onProgress(90);
  
  return doc.output('blob');
}

async function convertTxtToPdf(file: File, onProgress?: (p: number) => void) {
  if (onProgress) onProgress(10);
  const text = await file.text();
  if (onProgress) onProgress(50);

  const doc = new jsPDF();
  const lines = doc.splitTextToSize(text, 180);
  doc.text(lines, 10, 10);
  if (onProgress) onProgress(90);
  
  return doc.output('blob');
}

async function convertPdfToTxt(file: File, onProgress?: (p: number) => void) {
  if (onProgress) onProgress(10);
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  if (onProgress) onProgress(30);

  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(' ');
    fullText += pageText + '\n\n';
    if (onProgress) onProgress(30 + (i / pdf.numPages) * 60);
  }

  return new Blob([fullText], { type: 'text/plain' });
}

async function convertDocxToTxt(file: File, onProgress?: (p: number) => void) {
  if (onProgress) onProgress(10);
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  if (onProgress) onProgress(90);
  return new Blob([result.value], { type: 'text/plain' });
}
