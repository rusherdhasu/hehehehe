const express = require("express");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const app = express();
const PORT = 3000;

const YOUTUBE_STREAM_KEY = "333m-4wxh-42p6-9y8t-6ghu";
const YOUTUBE_VIDEO_URL = "https://www.youtube.com/watch?v=UIsf0eDOoMo";
const STREAM_URL = `rtmp://a.rtmp.youtube.com/live2/${YOUTUBE_STREAM_KEY}`;
const OFFSET_FILE = "last_offset.txt";

let ffmpegProcess = null;
let ytDlpProcess = null;
let isStreaming = false;

function startStreaming(startTime = 0) {
    if (isStreaming) return;
    isStreaming = true;
    console.log(`🎥 Starting YouTube Live Stream from ${startTime} seconds...`);

    ytDlpProcess = spawn("yt-dlp", [
        "-o", "-",
        "-f", "best",
        "--postprocessor-args", `ffmpeg:-ss ${startTime}`,
        YOUTUBE_VIDEO_URL
    ]);

    ffmpegProcess = spawn("ffmpeg", [
        "-re",
        "-i", "pipe:0",
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-b:v", "2000k",
        "-maxrate", "2000k",
        "-bufsize", "4000k",
        "-c:a", "aac",
        "-b:a", "128k",
        "-ar", "44100",
        "-f", "flv",
        STREAM_URL
    ]);

    ytDlpProcess.stdout.pipe(ffmpegProcess.stdin);

    let elapsedTime = startTime;
    const updateOffset = setInterval(() => {
        elapsedTime += 5;
        fs.writeFileSync(OFFSET_FILE, elapsedTime.toString());
    }, 5000);

    ffmpegProcess.on("close", () => {
        clearInterval(updateOffset);
        isStreaming = false;
        setTimeout(() => startStreaming(elapsedTime), 5000);
    });
}

const lastOffset = fs.existsSync(OFFSET_FILE) ? parseInt(fs.readFileSync(OFFSET_FILE, "utf8")) : 0;
startStreaming(lastOffset);

app.get("/", (req, res) => {
    res.send("by dhasu");
});

app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});
