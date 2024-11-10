const express = require('express');
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
ffmpeg.setFfmpegPath(ffmpegPath);
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Set ffmpeg path for fluent-ffmpeg
ffmpeg.setFfmpegPath(ffmpegPath);

const { exec } = require('child_process');

app.get('/api/check-ffmpeg', (req, res) => {
  exec('which ffmpeg', (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return res.status(500).send('FFmpeg is not installed or accessible');
    }
    res.send(`FFmpeg is accessible at: ${stdout}`);
  });
});

// Route to download and trim YouTube video
app.get('/api/downloadYoutubeSlice', async (req, res) => {
  const { youtubeVideoId, startTime, endTime } = req.query;

  if (!youtubeVideoId || !startTime || !endTime) {
    return res.status(400).send('Missing youtubeVideoId, startTime, or endTime');
  }

  const videoUrl = `https://www.youtube.com/watch?v=${youtubeVideoId}`;
  const outputFilePath = path.resolve(__dirname, `${youtubeVideoId}_${startTime}_${endTime}.mp4`);

  try {
    // Download video stream with high quality
    const videoStream = ytdl(videoUrl, { quality: 'highestvideo' });

    // Process video using ffmpeg to trim
    ffmpeg(videoStream)
      .setStartTime(startTime)
      .setDuration(endTime - startTime)
      .output(outputFilePath)
      .on('end', () => {
        res.download(outputFilePath, (err) => {
          if (err) {
            console.error('Download error:', err);
            res.status(500).send('Error in file download');
          }
          fs.unlinkSync(outputFilePath); // Clean up after download
        });
      })
      .on('error', (err) => {
        console.error('ffmpeg error:', err);
        res.status(500).send('Error processing video');
      })
      .run();
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('An error occurred');
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});