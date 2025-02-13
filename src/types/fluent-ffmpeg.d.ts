declare module 'fluent-ffmpeg' {
  interface FFmpeg {
    toFormat(format: string): this;
    videoCodec(codec: string): this;
    addOption(option: string, value: string): this;
    setStartTime(time: string): this;
    setDuration(duration: string): this;
    on(event: 'end', callback: () => void): this;
    on(event: 'error', callback: (err: { message: string }) => void): this;
    save(outputPath: string): this;
  }

  function ffmpeg(input: string): FFmpeg;
  export default ffmpeg;
} 