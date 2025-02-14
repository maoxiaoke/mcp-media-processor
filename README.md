# MCP Media Processing Server

A Node.js server implementing Model Context Protocol (MCP) for media processing operations, providing powerful video and image manipulation capabilities.

## Features

* Video processing and conversion
* Image processing and manipulation
* Media compression
* Video trimming and editing
* Image effects and watermarking

## Prerequisites

Before using this server, make sure you have the following dependencies installed on your system:

* **FFmpeg**: Required for video processing operations
  * macOS: `brew install ffmpeg`
  * Ubuntu/Debian: `sudo apt-get install ffmpeg`
  * Windows: Download from [FFmpeg official website](https://ffmpeg.org/download.html)

* **ImageMagick**: Required for image processing operations
  * macOS: `brew install imagemagick`
  * Ubuntu/Debian: `sudo apt-get install imagemagick`
  * Windows: Download from [ImageMagick official website](https://imagemagick.org/script/download.php)

## How to use

Add this to your `claude_desktop_config.json`:

### NPX

```json
{
  "mcpServers": {
    "mediaProcessor": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-media-processor@latest"
      ]
    }
  }
}
```

## API

### Tools

#### Video Operations

* **execute-ffmpeg**
  * Execute any FFmpeg command with custom options
  * Inputs:
    * `inputPath` (string): Absolute path to input video file
    * `options` (string[]): Array of FFmpeg command options
    * `outputPath` (string, optional): Absolute path for output file
    * `outputFilename` (string, optional): Output filename

* **convert-video**
  * Convert video to different format
  * Inputs:
    * `inputPath` (string): Absolute path to input video file
    * `outputFormat` (string): Desired output format (e.g., mp4, mkv, avi)
    * `outputPath` (string, optional): Custom output path
    * `outputFilename` (string, optional): Custom output filename

* **compress-video**
  * Compress video file
  * Inputs:
    * `inputPath` (string): Absolute path to input video file
    * `quality` (number, optional): Compression quality (1-51, lower is better quality)
    * `outputPath` (string, optional): Custom output path
    * `outputFilename` (string, optional): Custom output filename

* **trim-video**
  * Trim video to specified duration
  * Inputs:
    * `inputPath` (string): Absolute path to input video file
    * `startTime` (string): Start time in format HH:MM:SS
    * `duration` (string): Duration in format HH:MM:SS
    * `outputPath` (string, optional): Custom output path
    * `outputFilename` (string, optional): Custom output filename

#### Image Operations

* **compress-image**
  * Compress PNG image using ImageMagick
  * Inputs:
    * `inputPath` (string): Absolute path to input PNG image
    * `quality` (number, optional): Compression quality (1-100)
    * `outputPath` (string, optional): Custom output path
    * `outputFilename` (string, optional): Custom output filename

* **convert-image**
  * Convert image to different format
  * Inputs:
    * `inputPath` (string): Absolute path to input image file
    * `outputFormat` (string): Desired output format (e.g., jpg, png, webp, gif)
    * `outputPath` (string, optional): Custom output path
    * `outputFilename` (string, optional): Custom output filename

* **resize-image**
  * Resize image to specified dimensions
  * Inputs:
    * `inputPath` (string): Absolute path to input image file
    * `width` (number, optional): Target width in pixels
    * `height` (number, optional): Target height in pixels
    * `maintainAspectRatio` (boolean, optional): Whether to maintain aspect ratio
    * `outputPath` (string, optional): Custom output path
    * `outputFilename` (string, optional): Custom output filename

* **rotate-image**
  * Rotate image by specified degrees
  * Inputs:
    * `inputPath` (string): Absolute path to input image file
    * `degrees` (number): Rotation angle in degrees
    * `outputPath` (string, optional): Custom output path
    * `outputFilename` (string, optional): Custom output filename

* **add-watermark**
  * Add watermark to image
  * Inputs:
    * `inputPath` (string): Absolute path to input image file
    * `watermarkPath` (string): Absolute path to watermark image file
    * `position` (string, optional): Position of watermark (default: "southeast")
    * `opacity` (number, optional): Watermark opacity (0-100)
    * `outputPath` (string, optional): Custom output path
    * `outputFilename` (string, optional): Custom output filename

* **apply-effect**
  * Apply visual effect to image
  * Inputs:
    * `inputPath` (string): Absolute path to input image file
    * `effect` (string): Effect to apply (blur, sharpen, edge, emboss, grayscale, sepia, negate)
    * `intensity` (number, optional): Effect intensity (0-100)
    * `outputPath` (string, optional): Custom output path
    * `outputFilename` (string, optional): Custom output filename


## License

This MCP server is licensed under the MIT License. This means you are free to use, modify, and distribute the software, subject to the terms and conditions of the MIT License. For more details, please see the LICENSE file in the project repository.
