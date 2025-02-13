declare module 'fluent-ffmpeg' {
  interface FFmpegProgress {
    frames: number;
    currentFps: number;
    currentKbps: number;
    targetSize: number;
    timemark: string;
    percent?: number;
  }

  interface FFmpeg {
    toFormat(format: string): this;
    videoCodec(codec: string): this;
    addOption(option: string, value: string): this;
    setStartTime(time: string): this;
    setDuration(duration: string): this;
    on(event: 'end', callback: () => void): this;
    on(event: 'error', callback: (err: { message: string }) => void): this;
    on(event: 'start', callback: (commandLine: string) => void): this;
    on(event: 'progress', callback: (progress: FFmpegProgress) => void): this;
    save(outputPath: string): this;
  }

  function ffmpeg(input: string): FFmpeg;
  export default ffmpeg;
} 