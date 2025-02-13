import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import ffmpeg from "fluent-ffmpeg";
import { homedir } from "os";
import { join, isAbsolute, resolve, dirname } from "path";
import { promises as fs } from "fs";
// Create server instance
const server = new McpServer({
    name: "ffmpeg",
    version: "1.0.0",
});
const downloadsPath = join(homedir(), "Downloads");
// Helper function to ensure directory exists
async function ensureDirectoryExists(dirPath) {
    try {
        await fs.access(dirPath);
    }
    catch {
        await fs.mkdir(dirPath, { recursive: true });
    }
}
// Helper function to convert path to absolute path
async function getAbsolutePath(inputPath) {
    if (isAbsolute(inputPath)) {
        return inputPath;
    }
    // Convert relative path to absolute path
    const absolutePath = resolve(process.cwd(), inputPath);
    try {
        await fs.access(absolutePath);
        return absolutePath;
    }
    catch (error) {
        throw new Error(`Input file not found: ${inputPath}`);
    }
}
// Helper function to get output path
async function getOutputPath(outputPath, defaultFilename) {
    if (!outputPath) {
        // If no output path provided, use Downloads directory
        await ensureDirectoryExists(downloadsPath);
        return join(downloadsPath, defaultFilename);
    }
    // If output path is provided
    const absoluteOutputPath = isAbsolute(outputPath)
        ? outputPath
        : resolve(process.cwd(), outputPath);
    const outputDir = dirname(absoluteOutputPath);
    // Ensure output directory exists
    await ensureDirectoryExists(outputDir);
    return absoluteOutputPath;
}
// Register video processing tools
server.tool("execute-ffmpeg", "Execute any FFmpeg command with custom options", {
    inputPath: z.string().describe("Absolute path to input video file"),
    outputPath: z
        .string()
        .optional()
        .describe("Optional output absolute path. If not provided, file will be saved in Downloads folder"),
    outputFilename: z
        .string()
        .optional()
        .describe("Output filename (only used if outputPath is not provided)"),
    options: z
        .array(z.string())
        .describe("Array of FFmpeg command options (e.g. ['-c:v', 'libx264', '-crf', '23'])"),
}, async ({ inputPath, outputPath, outputFilename, options }) => {
    try {
        const absoluteInputPath = await getAbsolutePath(inputPath);
        const finalOutputPath = await getOutputPath(outputPath, outputFilename || "output.mp4");
        await new Promise((resolve, reject) => {
            let command = ffmpeg(absoluteInputPath);
            // Add all options in pairs
            for (let i = 0; i < options.length; i += 2) {
                if (i + 1 < options.length) {
                    command = command.addOption(options[i], options[i + 1]);
                }
            }
            command
                .on("start", (commandLine) => {
                console.error("Executing FFmpeg command:", commandLine);
            })
                .on("progress", (progress) => {
                if (progress.percent) {
                    console.error("Processing: " + Math.floor(progress.percent) + "% done");
                }
            })
                .on("end", () => resolve(true))
                .on("error", (err) => reject(err))
                .save(finalOutputPath);
        });
        return {
            content: [
                {
                    type: "text",
                    text: `Video processing completed successfully. Output saved to: ${finalOutputPath}`,
                },
            ],
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            content: [
                {
                    type: "text",
                    text: `Error processing video: ${errorMessage}`,
                },
            ],
        };
    }
});
// server.tool(
//   "convert-video",
//   "Convert video to different format",
//   {
//     inputPath: z.string().describe("Path to input video file"),
//     outputFormat: z.string().describe("Desired output format (e.g., mp4, mkv, avi)"),
//     outputPath: z.string().optional().describe("Optional output path (absolute or relative). If not provided, file will be saved in Downloads folder"),
//     outputFilename: z.string().optional().describe("Output filename (only used if outputPath is not provided)")
//   },
//   async ({ inputPath, outputFormat, outputPath, outputFilename }) => {
//     try {
//       const absoluteInputPath = await getAbsolutePath(inputPath);
//       const inputFileName = absoluteInputPath.split('/').pop()?.split('.')[0] || 'output';
//       const defaultFilename = outputFilename || `${inputFileName}_converted.${outputFormat}`;
//       const finalOutputPath = await getOutputPath(outputPath, defaultFilename);
//       await new Promise((resolve, reject) => {
//         ffmpeg(absoluteInputPath)
//           .toFormat(outputFormat)
//           .on('end', () => resolve(true))
//           .on('error', (err: FFmpegError) => reject(err))
//           .save(finalOutputPath);
//       });
//       return {
//         content: [
//           {
//             type: "text",
//             text: `Video successfully converted and saved to: ${finalOutputPath}`,
//           },
//         ],
//       };
//     } catch (error) {
//       const errorMessage = error instanceof Error ? error.message : String(error);
//       return {
//         content: [
//           {
//             type: "text",
//             text: `Error converting video: ${errorMessage}`,
//           },
//         ],
//       };
//     }
//   }
// );
// server.tool(
//   "compress-video",
//   "Compress video file",
//   {
//     inputPath: z.string().describe("Path to input video file"),
//     quality: z.number().min(1).max(51).default(23).describe("Compression quality (1-51, lower is better quality but larger file)"),
//     outputPath: z.string().optional().describe("Optional output path (absolute or relative). If not provided, file will be saved in Downloads folder"),
//     outputFilename: z.string().optional().describe("Output filename (only used if outputPath is not provided)")
//   },
//   async ({ inputPath, quality, outputPath, outputFilename }) => {
//     try {
//       const absoluteInputPath = await getAbsolutePath(inputPath);
//       const inputFileName = absoluteInputPath.split('/').pop()?.split('.')[0] || 'output';
//       const defaultFilename = outputFilename || `${inputFileName}_compressed.mp4`;
//       const finalOutputPath = await getOutputPath(outputPath, defaultFilename);
//       await new Promise((resolve, reject) => {
//         ffmpeg(absoluteInputPath)
//           .videoCodec('libx264')
//           .addOption('-crf', quality.toString())
//           .on('end', () => resolve(true))
//           .on('error', (err: FFmpegError) => reject(err))
//           .save(finalOutputPath);
//       });
//       return {
//         content: [
//           {
//             type: "text",
//             text: `Video successfully compressed and saved to: ${finalOutputPath}`,
//           },
//         ],
//       };
//     } catch (error) {
//       const errorMessage = error instanceof Error ? error.message : String(error);
//       return {
//         content: [
//           {
//             type: "text",
//             text: `Error compressing video: ${errorMessage}`,
//           },
//         ],
//       };
//     }
//   }
// );
// server.tool(
//   "trim-video",
//   "Trim video to specified duration",
//   {
//     inputPath: z.string().describe("Path to input video file"),
//     startTime: z.string().describe("Start time in format HH:MM:SS"),
//     duration: z.string().describe("Duration in format HH:MM:SS"),
//     outputPath: z.string().optional().describe("Optional output path (absolute or relative). If not provided, file will be saved in Downloads folder"),
//     outputFilename: z.string().optional().describe("Output filename (only used if outputPath is not provided)")
//   },
//   async ({ inputPath, startTime, duration, outputPath, outputFilename }) => {
//     try {
//       const absoluteInputPath = await getAbsolutePath(inputPath);
//       const inputFileName = absoluteInputPath.split('/').pop()?.split('.')[0] || 'output';
//       const defaultFilename = outputFilename || `${inputFileName}_trimmed.mp4`;
//       const finalOutputPath = await getOutputPath(outputPath, defaultFilename);
//       await new Promise((resolve, reject) => {
//         ffmpeg(absoluteInputPath)
//           .setStartTime(startTime)
//           .setDuration(duration)
//           .on('end', () => resolve(true))
//           .on('error', (err: FFmpegError) => reject(err))
//           .save(finalOutputPath);
//       });
//       return {
//         content: [
//           {
//             type: "text",
//             text: `Video successfully trimmed and saved to: ${finalOutputPath}`,
//           },
//         ],
//       };
//     } catch (error) {
//       const errorMessage = error instanceof Error ? error.message : String(error);
//       return {
//         content: [
//           {
//             type: "text",
//             text: `Error trimming video: ${errorMessage}`,
//           },
//         ],
//       };
//     }
//   }
// );
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("FFmpeg MCP Server running on stdio");
}
main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
