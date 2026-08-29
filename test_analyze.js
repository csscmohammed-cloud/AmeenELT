import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';
import fs from 'fs';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);

// Create a dummy audio file
import { execSync } from 'child_process';
execSync(`${ffmpegInstaller.path} -f lavfi -i anullsrc=r=44100:cl=mono -t 3 -q:a 9 -acodec libopus dummy.webm`);

ffmpeg.ffprobe('dummy.webm', (err, meta) => {
  console.log("duration:", meta.format.duration);
  ffmpeg('dummy.webm')
    .audioFilter('volumedetect')
    .format('null')
    .output('-')
    .on('stderr', (line) => {
      if (line.includes('mean_volume')) console.log(line);
    })
    .on('end', () => console.log('done'))
    .run();
});
