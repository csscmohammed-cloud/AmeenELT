import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);

function analyzeAudio(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        return reject(err);
      }
      const duration = metadata?.format?.duration || 0;
      
      let meanVolume = -91;
      let maxVolume = -91;
      
      ffmpeg(filePath)
        .audioFilter('volumedetect')
        .format('null')
        .output('-')
        .on('stderr', (stderrLine) => {
           const meanMatch = stderrLine.match(/mean_volume:\s+([-\d.]+)\s+dB/);
           if (meanMatch) {
             meanVolume = parseFloat(meanMatch[1]);
           }
           const maxMatch = stderrLine.match(/max_volume:\s+([-\d.]+)\s+dB/);
           if (maxMatch) {
             maxVolume = parseFloat(maxMatch[1]);
           }
        })
        .on('error', reject)
        .on('end', () => {
           resolve({ duration, meanVolume, maxVolume });
        })
        .run();
    });
  });
}
