import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import ffmpeg from 'fluent-ffmpeg';
import { homedir } from 'os';
import { join } from 'path';
import { promises as fs } from 'fs';

// Create server instance
const server = new McpServer({
  name: "ffmpeg",
  version: "1.0.0",
});

const downloadsPath = join(homedir(), 'Downloads');

// Helper function to ensure output directory exists
async function ensureOutputDirectory() {
  try {
    await fs.access(downloadsPath);
  } catch {
    await fs.mkdir(downloadsPath, { recursive: true });
  }
}

interface FFmpegError {
  message: string;
}

// Register video processing tools
server.tool(
  "convert-video",
  "Convert video to different format",
  {
    inputPath: z.string().describe("Path to input video file"),
    outputFormat: z.string().describe("Desired output format (e.g., mp4, mkv, avi)"),
    outputFilename: z.string().optional().describe("Optional custom output filename")
  },
  async ({ inputPath, outputFormat, outputFilename }) => {
    try {
      await ensureOutputDirectory();
      
      const inputFileName = inputPath.split('/').pop()?.split('.')[0] || 'output';
      const finalOutputFilename = outputFilename || `${inputFileName}_converted.${outputFormat}`;
      const outputPath = join(downloadsPath, finalOutputFilename);

      await new Promise((resolve, reject) => {
        ffmpeg(inputPath)
          .toFormat(outputFormat)
          .on('end', () => resolve(true))
          .on('error', (err: FFmpegError) => reject(err))
          .save(outputPath);
      });

      return {
        content: [
          {
            type: "text",
            text: `Video successfully converted and saved to: ${outputPath}`,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: "text",
            text: `Error converting video: ${errorMessage}`,
          },
        ],
      };
    }
  }
);

server.tool(
  "compress-video",
  "Compress video file",
  {
    inputPath: z.string().describe("Path to input video file"),
    quality: z.number().min(1).max(51).default(23).describe("Compression quality (1-51, lower is better quality but larger file)"),
    outputFilename: z.string().optional().describe("Optional custom output filename")
  },
  async ({ inputPath, quality, outputFilename }) => {
    try {
      await ensureOutputDirectory();
      
      const inputFileName = inputPath.split('/').pop()?.split('.')[0] || 'output';
      const finalOutputFilename = outputFilename || `${inputFileName}_compressed.mp4`;
      const outputPath = join(downloadsPath, finalOutputFilename);

      await new Promise((resolve, reject) => {
        ffmpeg(inputPath)
          .videoCodec('libx264')
          .addOption('-crf', quality.toString())
          .on('end', () => resolve(true))
          .on('error', (err: FFmpegError) => reject(err))
          .save(outputPath);
      });

      return {
        content: [
          {
            type: "text",
            text: `Video successfully compressed and saved to: ${outputPath}`,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: "text",
            text: `Error compressing video: ${errorMessage}`,
          },
        ],
      };
    }
  }
);

server.tool(
  "trim-video",
  "Trim video to specified duration",
  {
    inputPath: z.string().describe("Path to input video file"),
    startTime: z.string().describe("Start time in format HH:MM:SS"),
    duration: z.string().describe("Duration in format HH:MM:SS"),
    outputFilename: z.string().optional().describe("Optional custom output filename")
  },
  async ({ inputPath, startTime, duration, outputFilename }) => {
    try {
      await ensureOutputDirectory();
      
      const inputFileName = inputPath.split('/').pop()?.split('.')[0] || 'output';
      const finalOutputFilename = outputFilename || `${inputFileName}_trimmed.mp4`;
      const outputPath = join(downloadsPath, finalOutputFilename);

      await new Promise((resolve, reject) => {
        ffmpeg(inputPath)
          .setStartTime(startTime)
          .setDuration(duration)
          .on('end', () => resolve(true))
          .on('error', (err: FFmpegError) => reject(err))
          .save(outputPath);
      });

      return {
        content: [
          {
            type: "text",
            text: `Video successfully trimmed and saved to: ${outputPath}`,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: "text",
            text: `Error trimming video: ${errorMessage}`,
          },
        ],
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("FFmpeg MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
