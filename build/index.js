#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import ffmpeg from 'fluent-ffmpeg';
import { homedir } from 'os';
import { join, isAbsolute, resolve, dirname } from 'path';
import { promises as fs } from 'fs';
import { execSync } from 'node:child_process';
// Create server instance
const server = new McpServer({
    name: "media-processor",
    version: "1.0.0",
});
const downloadsPath = join(homedir(), 'Downloads');
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
    // FIXME: But it's not working, because the server is running in a different directory
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
    const absoluteOutputPath = isAbsolute(outputPath) ? outputPath : resolve(process.cwd(), outputPath);
    const outputDir = dirname(absoluteOutputPath);
    // Ensure output directory exists
    await ensureDirectoryExists(outputDir);
    return absoluteOutputPath;
}
// Helper function to check if ImageMagick is installed
async function checkImageMagick() {
    try {
        execSync('convert -version');
        return true;
    }
    catch (error) {
        throw new Error('ImageMagick is not installed. Please install it first.');
    }
}
// Helper function to execute FFmpeg command
const executeFFmpeg = (command) => {
    return new Promise((resolve, reject) => {
        command
            .on('end', () => resolve())
            .on('error', (err) => reject(err))
            .run();
    });
};
// Register video processing tools
server.tool("execute-ffmpeg", "Execute any FFmpeg command with custom options", {
    inputPath: z.string().describe("Absolute path to input video file"),
    outputPath: z.string().optional().describe("Optional absolute path for output file. If not provided, file will be saved in Downloads folder"),
    outputFilename: z.string().optional().describe("Output filename (only used if outputPath is not provided)"),
    options: z.array(z.string()).describe("Array of FFmpeg command options (e.g. ['-c:v', 'libx264', '-crf', '23'])")
}, async ({ inputPath, outputPath, outputFilename, options }) => {
    try {
        const absoluteInputPath = await getAbsolutePath(inputPath);
        const finalOutputPath = await getOutputPath(outputPath, outputFilename || 'output.mp4');
        let command = ffmpeg(absoluteInputPath);
        // Add all options in pairs
        for (let i = 0; i < options.length; i += 2) {
            if (i + 1 < options.length) {
                command = command.addOption(options[i], options[i + 1]);
            }
        }
        command.save(finalOutputPath);
        await executeFFmpeg(command);
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
server.tool("convert-video", "Convert video to different format", {
    inputPath: z.string().describe("Absolute path to input video file"),
    outputFormat: z.string().describe("Desired output format (e.g., mp4, mkv, avi)"),
    outputPath: z.string().optional().describe("Optional absolute path for output file. If not provided, file will be saved in Downloads folder"),
    outputFilename: z.string().optional().describe("Output filename (only used if outputPath is not provided)")
}, async ({ inputPath, outputFormat, outputPath, outputFilename }) => {
    try {
        const absoluteInputPath = await getAbsolutePath(inputPath);
        const inputFileName = absoluteInputPath.split('/').pop()?.split('.')[0] || 'output';
        const defaultFilename = outputFilename || `${inputFileName}_converted.${outputFormat}`;
        const finalOutputPath = await getOutputPath(outputPath, defaultFilename);
        const command = ffmpeg(absoluteInputPath)
            .toFormat(outputFormat)
            .save(finalOutputPath);
        await executeFFmpeg(command);
        return {
            content: [
                {
                    type: "text",
                    text: `Video successfully converted and saved to: ${finalOutputPath}`,
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
                    text: `Error converting video: ${errorMessage}`,
                },
            ],
        };
    }
});
server.tool("compress-video", "Compress video file", {
    inputPath: z.string().describe("Absolute path to input video file"),
    quality: z.number().min(1).max(51).default(23).describe("Compression quality (1-51, lower is better quality but larger file)"),
    outputPath: z.string().optional().describe("Optional absolute path for output file. If not provided, file will be saved in Downloads folder"),
    outputFilename: z.string().optional().describe("Output filename (only used if outputPath is not provided)")
}, async ({ inputPath, quality, outputPath, outputFilename }) => {
    try {
        const absoluteInputPath = await getAbsolutePath(inputPath);
        const inputFileName = absoluteInputPath.split('/').pop()?.split('.')[0] || 'output';
        const defaultFilename = outputFilename || `${inputFileName}_compressed.mp4`;
        const finalOutputPath = await getOutputPath(outputPath, defaultFilename);
        const command = ffmpeg(absoluteInputPath)
            .videoCodec('libx264')
            .addOption('-crf', quality.toString())
            .save(finalOutputPath);
        await executeFFmpeg(command);
        return {
            content: [
                {
                    type: "text",
                    text: `Video successfully compressed and saved to: ${finalOutputPath}`,
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
                    text: `Error compressing video: ${errorMessage}`,
                },
            ],
        };
    }
});
server.tool("trim-video", "Trim video to specified duration", {
    inputPath: z.string().describe("Absolute path to input video file"),
    startTime: z.string().describe("Start time in format HH:MM:SS"),
    duration: z.string().describe("Duration in format HH:MM:SS"),
    outputPath: z.string().optional().describe("Optional absolute path for output file. If not provided, file will be saved in Downloads folder"),
    outputFilename: z.string().optional().describe("Output filename (only used if outputPath is not provided)")
}, async ({ inputPath, startTime, duration, outputPath, outputFilename }) => {
    try {
        const absoluteInputPath = await getAbsolutePath(inputPath);
        const inputFileName = absoluteInputPath.split('/').pop()?.split('.')[0] || 'output';
        const defaultFilename = outputFilename || `${inputFileName}_trimmed.mp4`;
        const finalOutputPath = await getOutputPath(outputPath, defaultFilename);
        const command = ffmpeg(absoluteInputPath)
            .setStartTime(startTime)
            .setDuration(duration)
            .save(finalOutputPath);
        await executeFFmpeg(command);
        return {
            content: [
                {
                    type: "text",
                    text: `Video successfully trimmed and saved to: ${finalOutputPath}`,
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
                    text: `Error trimming video: ${errorMessage}`,
                },
            ],
        };
    }
});
server.tool("compress-image", "Compress PNG image using ImageMagick", {
    inputPath: z.string().describe("Absolute path to input PNG image"),
    quality: z.number().min(1).max(100).default(80).describe("Compression quality (1-100)"),
    outputPath: z.string().optional().describe("Optional absolute path for output file. If not provided, file will be saved in Downloads folder"),
    outputFilename: z.string().optional().describe("Output filename (only used if outputPath is not provided)")
}, async ({ inputPath, quality, outputPath, outputFilename }) => {
    try {
        // Check if ImageMagick is installed
        await checkImageMagick();
        const absoluteInputPath = await getAbsolutePath(inputPath);
        // Verify input file is PNG
        if (!absoluteInputPath.toLowerCase().endsWith('.png')) {
            throw new Error('Input file must be a PNG image');
        }
        const inputFileName = absoluteInputPath.split('/').pop()?.split('.')[0] || 'output';
        const defaultFilename = outputFilename || `${inputFileName}_compressed.png`;
        const finalOutputPath = await getOutputPath(outputPath, defaultFilename);
        // Run ImageMagick convert command with quality setting
        const command = `convert "${absoluteInputPath}" -quality ${quality} -define png:compression-level=9 "${finalOutputPath}"`;
        const output = await execSync(command);
        return {
            content: [
                {
                    type: "text",
                    text: `Image successfully compressed and saved to: ${finalOutputPath}`,
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
                    text: `Error compressing image: ${errorMessage}`,
                },
            ],
        };
    }
});
server.tool("convert-image", "Convert image to different format", {
    inputPath: z.string().describe("Absolute path to input image file"),
    outputFormat: z.string().describe("Desired output format (e.g., jpg, png, webp, gif)"),
    outputPath: z.string().optional().describe("Optional absolute path for output file. If not provided, file will be saved in Downloads folder"),
    outputFilename: z.string().optional().describe("Output filename (only used if outputPath is not provided)")
}, async ({ inputPath, outputFormat, outputPath, outputFilename }) => {
    try {
        await checkImageMagick();
        const absoluteInputPath = await getAbsolutePath(inputPath);
        const inputFileName = absoluteInputPath.split('/').pop()?.split('.')[0] || 'output';
        const defaultFilename = outputFilename || `${inputFileName}_converted.${outputFormat}`;
        const finalOutputPath = await getOutputPath(outputPath, defaultFilename);
        const command = `convert "${absoluteInputPath}" "${finalOutputPath}"`;
        await execSync(command);
        return {
            content: [
                {
                    type: "text",
                    text: `Image successfully converted and saved to: ${finalOutputPath}`,
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
                    text: `Error converting image: ${errorMessage}`,
                },
            ],
        };
    }
});
server.tool("resize-image", "Resize image to specified dimensions", {
    inputPath: z.string().describe("Absolute path to input image file"),
    width: z.number().optional().describe("Target width in pixels"),
    height: z.number().optional().describe("Target height in pixels"),
    maintainAspectRatio: z.boolean().default(true).describe("Whether to maintain aspect ratio when resizing"),
    outputPath: z.string().optional().describe("Optional absolute path for output file. If not provided, file will be saved in Downloads folder"),
    outputFilename: z.string().optional().describe("Output filename (only used if outputPath is not provided)")
}, async ({ inputPath, width, height, maintainAspectRatio, outputPath, outputFilename }) => {
    try {
        await checkImageMagick();
        const absoluteInputPath = await getAbsolutePath(inputPath);
        const inputFileName = absoluteInputPath.split('/').pop()?.split('.')[0] || 'output';
        const extension = absoluteInputPath.split('.').pop() || 'png';
        const defaultFilename = outputFilename || `${inputFileName}_resized.${extension}`;
        const finalOutputPath = await getOutputPath(outputPath, defaultFilename);
        let dimensions = '';
        if (width && height) {
            dimensions = maintainAspectRatio ? `${width}x${height}` : `${width}x${height}!`;
        }
        else if (width) {
            dimensions = `${width}x`;
        }
        else if (height) {
            dimensions = `x${height}`;
        }
        else {
            throw new Error('Either width or height must be specified');
        }
        const command = `convert "${absoluteInputPath}" -resize "${dimensions}" "${finalOutputPath}"`;
        await execSync(command);
        return {
            content: [
                {
                    type: "text",
                    text: `Image successfully resized and saved to: ${finalOutputPath}`,
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
                    text: `Error resizing image: ${errorMessage}`,
                },
            ],
        };
    }
});
server.tool("rotate-image", "Rotate image by specified degrees", {
    inputPath: z.string().describe("Absolute path to input image file"),
    degrees: z.number().describe("Rotation angle in degrees"),
    outputPath: z.string().optional().describe("Optional absolute path for output file. If not provided, file will be saved in Downloads folder"),
    outputFilename: z.string().optional().describe("Output filename (only used if outputPath is not provided)")
}, async ({ inputPath, degrees, outputPath, outputFilename }) => {
    try {
        await checkImageMagick();
        const absoluteInputPath = await getAbsolutePath(inputPath);
        const inputFileName = absoluteInputPath.split('/').pop()?.split('.')[0] || 'output';
        const extension = absoluteInputPath.split('.').pop() || 'png';
        const defaultFilename = outputFilename || `${inputFileName}_rotated.${extension}`;
        const finalOutputPath = await getOutputPath(outputPath, defaultFilename);
        const command = `convert "${absoluteInputPath}" -rotate ${degrees} "${finalOutputPath}"`;
        await execSync(command);
        return {
            content: [
                {
                    type: "text",
                    text: `Image successfully rotated and saved to: ${finalOutputPath}`,
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
                    text: `Error rotating image: ${errorMessage}`,
                },
            ],
        };
    }
});
server.tool("add-watermark", "Add watermark to image", {
    inputPath: z.string().describe("Absolute path to input image file"),
    watermarkPath: z.string().describe("Absolute path to watermark image file"),
    position: z.enum(['northwest', 'north', 'northeast', 'west', 'center', 'east', 'southwest', 'south', 'southeast']).default('southeast').describe("Position of watermark"),
    opacity: z.number().min(0).max(100).default(50).describe("Watermark opacity (0-100)"),
    outputPath: z.string().optional().describe("Optional absolute path for output file. If not provided, file will be saved in Downloads folder"),
    outputFilename: z.string().optional().describe("Output filename (only used if outputPath is not provided)")
}, async ({ inputPath, watermarkPath, position, opacity, outputPath, outputFilename }) => {
    try {
        await checkImageMagick();
        const absoluteInputPath = await getAbsolutePath(inputPath);
        const absoluteWatermarkPath = await getAbsolutePath(watermarkPath);
        const inputFileName = absoluteInputPath.split('/').pop()?.split('.')[0] || 'output';
        const extension = absoluteInputPath.split('.').pop() || 'png';
        const defaultFilename = outputFilename || `${inputFileName}_watermarked.${extension}`;
        const finalOutputPath = await getOutputPath(outputPath, defaultFilename);
        // Convert opacity from 0-100 to 0-1 for ImageMagick
        const normalizedOpacity = opacity / 100;
        const command = `convert "${absoluteInputPath}" \\( "${absoluteWatermarkPath}" -alpha set -channel A -evaluate multiply ${normalizedOpacity} \\) -gravity ${position} -composite "${finalOutputPath}"`;
        await execSync(command);
        return {
            content: [
                {
                    type: "text",
                    text: `Watermark successfully added and saved to: ${finalOutputPath}`,
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
                    text: `Error adding watermark: ${errorMessage}`,
                },
            ],
        };
    }
});
server.tool("apply-effect", "Apply visual effect to image", {
    inputPath: z.string().describe("Absolute path to input image file"),
    effect: z.enum(['blur', 'sharpen', 'edge', 'emboss', 'grayscale', 'sepia', 'negate']).describe("Effect to apply"),
    intensity: z.number().min(0).max(100).default(50).describe("Effect intensity (0-100, not applicable for some effects)"),
    outputPath: z.string().optional().describe("Optional absolute path for output file. If not provided, file will be saved in Downloads folder"),
    outputFilename: z.string().optional().describe("Output filename (only used if outputPath is not provided)")
}, async ({ inputPath, effect, intensity, outputPath, outputFilename }) => {
    try {
        await checkImageMagick();
        const absoluteInputPath = await getAbsolutePath(inputPath);
        const inputFileName = absoluteInputPath.split('/').pop()?.split('.')[0] || 'output';
        const extension = absoluteInputPath.split('.').pop() || 'png';
        const defaultFilename = outputFilename || `${inputFileName}_${effect}.${extension}`;
        const finalOutputPath = await getOutputPath(outputPath, defaultFilename);
        let command = '';
        switch (effect) {
            case 'blur':
                command = `convert "${absoluteInputPath}" -blur 0x${intensity / 5} "${finalOutputPath}"`;
                break;
            case 'sharpen':
                command = `convert "${absoluteInputPath}" -sharpen 0x${intensity / 10} "${finalOutputPath}"`;
                break;
            case 'edge':
                command = `convert "${absoluteInputPath}" -edge ${intensity / 10} "${finalOutputPath}"`;
                break;
            case 'emboss':
                command = `convert "${absoluteInputPath}" -emboss ${intensity / 10} "${finalOutputPath}"`;
                break;
            case 'grayscale':
                command = `convert "${absoluteInputPath}" -colorspace Gray "${finalOutputPath}"`;
                break;
            case 'sepia':
                command = `convert "${absoluteInputPath}" -sepia-tone ${intensity}% "${finalOutputPath}"`;
                break;
            case 'negate':
                command = `convert "${absoluteInputPath}" -negate "${finalOutputPath}"`;
                break;
        }
        await execSync(command);
        return {
            content: [
                {
                    type: "text",
                    text: `Effect successfully applied and saved to: ${finalOutputPath}`,
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
                    text: `Error applying effect: ${errorMessage}`,
                },
            ],
        };
    }
});
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Media Processor MCP Server running on stdio");
}
main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
