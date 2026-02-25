import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState, useEffect } from "react";
import { StudyAssistantPanel } from "#/lib/components/StudyAssistantPanel";
import { BookOpen, FileText, TrendingUp } from 'lucide-react';

export const Route = createFileRoute("/")({
	component: Home,
});

// Frame capture timing constants
const FRAME_CAPTURE_INTERVAL_MS = 10000;
const FIRST_FRAME_DELAY_MS = 1000;

// WebSocket connection constants
const WS_RECONNECT_DELAY_MS = 500;
const STATUS_RESET_DELAY_MS = 2000;
const FRAME_STATUS_RESET_DELAY_MS = 3000;

// Audio processing constants
const TARGET_SAMPLE_RATE = 16000;
const HIGH_SAMPLE_RATE_THRESHOLD = 48000;
const BUFFER_SIZE_HIGH_SAMPLE_RATE = 8192;
const BUFFER_SIZE_LOW_SAMPLE_RATE = 4096;

// Message type markers
const MSG_TYPE_FRAME = 0x01;
const JPEG_QUALITY = 0.8;

/**
 * Resamples audio data from one sample rate to another.
 * Uses linear interpolation for smooth conversion.
 */
function resampleAudio(
	float32Data: Float32Array,
	fromSampleRate: number,
	toSampleRate: number,
) {
	if (fromSampleRate === toSampleRate) return float32Data;
	const ratio = fromSampleRate / toSampleRate;
	const newLength = Math.round(float32Data.length / ratio);
	const result = new Float32Array(newLength);
	for (let i = 0; i < newLength; i++) {
		const position = i * ratio;
		const index = Math.floor(position);
		const fraction = position - index;
		if (index + 1 < float32Data.length) {
			result[i] =
				float32Data[index] * (1 - fraction) + float32Data[index + 1] * fraction;
		} else {
			result[i] = float32Data[index];
		}
	}
	return result;
}

function Home() {
	const [isRecording, setIsRecording] = useState(false);
	const [transcript, setTranscript] = useState("");
	const [status, setStatus] = useState("Idle");
	const [browserSupported, setBrowserSupported] = useState<boolean | null>(
		null,
	);
	const [screenAnalysis, setScreenAnalysis] = useState<string>("");

	const wsRef = useRef<WebSocket | null>(null);
	const audioContextRef = useRef<AudioContext | null>(null);
	const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
	const mediaStreamRef = useRef<MediaStream | null>(null);
	const videoElementRef = useRef<HTMLVideoElement | null>(null);
	const canvasElementRef = useRef<HTMLCanvasElement | null>(null);
	const frameIntervalRef = useRef<number | null>(null);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (isRecording) {
				stopRecording();
			}
		};
	}, [isRecording]);

	// Check browser support for getDisplayMedia with audio
	const checkBrowserSupport = () => {
		const isChrome =
			/Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
		const isEdge = /Edg/.test(navigator.userAgent);
		setBrowserSupported(isChrome || isEdge);
		return isChrome || isEdge;
	};

	const connect = async () => {
		return new Promise<void>((resolve, reject) => {
			wsRef.current = new WebSocket("ws://localhost:8000/ws");
			wsRef.current.onopen = () => {
				setStatus("Connected");
				resolve();
			};
			wsRef.current.onmessage = (event) => {
				const data = JSON.parse(event.data) as {
					type: string;
					text?: string;
					analysis?: string;
					error?: string;
				};
				if (data.type === "result") {
					// Server sends ONLY new text now - just append it
					setTranscript((prev) =>
						`${prev ? `${prev} ` : ""}${data.text?.trim() ?? ""}`,
					);
					setStatus("Transcribing...");
					setTimeout(() => {
						if (wsRef.current?.readyState === WebSocket.OPEN)
							setStatus("Connected");
					}, STATUS_RESET_DELAY_MS);
				} else if (data.type === "frame_analysis") {
					// Server sends screen frame analysis result
					setScreenAnalysis(data.analysis ?? "");
					setStatus("Screen analyzed");
					setTimeout(() => {
						if (wsRef.current?.readyState === WebSocket.OPEN)
							setStatus("Connected");
					}, FRAME_STATUS_RESET_DELAY_MS);
				} else if (data.type === "frame_analysis_error") {
					console.error("Frame analysis error:", data.error);
					setStatus("Frame analysis failed");
					setTimeout(() => {
						if (wsRef.current?.readyState === WebSocket.OPEN)
							setStatus("Connected");
					}, FRAME_STATUS_RESET_DELAY_MS);
				}
			};
			wsRef.current.onclose = () => setStatus("Disconnected");
			wsRef.current.onerror = () => {
				setStatus("WebSocket Error");
				reject(new Error("WebSocket error"));
			};
		});
	};

	const cleanupStream = (stream: MediaStream) => {
		for (const track of stream.getTracks()) {
			track.stop();
		}
	};

	const setupFrameCapture = async (stream: MediaStream) => {
		// Create hidden video element to render frames
		const video = document.createElement("video");
		video.srcObject = stream;
		video.muted = true;
		video.playsInline = true;
		await video.play();
		videoElementRef.current = video;

		// Create canvas for frame capture
		const canvas = document.createElement("canvas");
		canvas.width = video.videoWidth || 1280;
		canvas.height = video.videoHeight || 720;
		canvasElementRef.current = canvas;

		// Capture frame function - sends JPEG via WebSocket
		const captureFrame = () => {
			if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
				return;
			}
			if (!videoElementRef.current || !canvasElementRef.current) {
				return;
			}

			const ctx = canvasElementRef.current.getContext("2d");
			if (!ctx) return;

			// Draw current video frame to canvas
			ctx.drawImage(
				videoElementRef.current,
				0, 0,
				canvasElementRef.current.width,
				canvasElementRef.current.height,
			);

			// Convert canvas to JPEG blob and send
			canvasElementRef.current.toBlob((blob) => {
				if (!blob || !wsRef.current) return;

				const reader = new FileReader();
				reader.onload = () => {
					if (!wsRef.current) return;
					const jpegArray = new Uint8Array(reader.result as ArrayBuffer);

					// Create message with type header: [0x01, ...jpegBytes]
					const message = new Uint8Array(jpegArray.length + 1);
					message[0] = MSG_TYPE_FRAME;
					message.set(jpegArray, 1);

					wsRef.current?.send(message);
				};
				reader.readAsArrayBuffer(blob);
			}, "image/jpeg", JPEG_QUALITY);
		};

		// Start frame capture interval
		frameIntervalRef.current = window.setInterval(
			captureFrame,
			FRAME_CAPTURE_INTERVAL_MS,
		);
		// Capture first frame after a short delay
		setTimeout(captureFrame, FIRST_FRAME_DELAY_MS);

		// Handle user stopping screen share via browser UI
		const audioTrack = stream.getAudioTracks()[0];
		if (audioTrack) {
			audioTrack.onended = () => {
				stopRecording();
			};
		}
	};

	const setupAudioProcessing = (stream: MediaStream) => {
		// Create AudioContext with browser's default sample rate
		const audioCtx = new (window.AudioContext ||
			(window as { webkitAudioContext?: typeof AudioContext })
				.webkitAudioContext)();
		audioContextRef.current = audioCtx;

		const source = audioCtx.createMediaStreamSource(stream);

		// Use ScriptProcessor with appropriate buffer size
		const bufferSize =
			audioCtx.sampleRate >= HIGH_SAMPLE_RATE_THRESHOLD
				? BUFFER_SIZE_HIGH_SAMPLE_RATE
				: BUFFER_SIZE_LOW_SAMPLE_RATE;
		const processor = audioCtx.createScriptProcessor(bufferSize, 1, 1);
		scriptProcessorRef.current = processor;

		processor.onaudioprocess = (e) => {
			if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

			const inputData = e.inputBuffer.getChannelData(0);

			// Resample to 16kHz if needed
			const resampledData = resampleAudio(
				inputData,
				audioCtx.sampleRate,
				TARGET_SAMPLE_RATE,
			);

			// Convert Float32 (-1 to 1) to Int16 PCM
			const int16Data = new Int16Array(resampledData.length);
			for (let i = 0; i < resampledData.length; i++) {
				const s = Math.max(-1, Math.min(1, resampledData[i]));
				int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
			}

			wsRef.current.send(int16Data.buffer);
		};

		source.connect(processor);
		processor.connect(audioCtx.destination);
	};

	const startRecording = async () => {
		// Connect to WebSocket if not already connected
		if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
			try {
				await connect();
			} catch {
				setStatus("Failed to connect to server");
				return;
			}
		}

		try {
			// Check browser support
			const supported = checkBrowserSupport();
			if (!supported) {
				setStatus("Browser Not Supported - Use Chrome/Edge");
				return;
			}

			// Request screen share with audio
			const stream = await navigator.mediaDevices.getDisplayMedia({
				video: true,
				audio: {
					systemAudio: "include",
					windowAudio: "system",
				},
			});

			mediaStreamRef.current = stream;

			// Validate tracks
			const audioTrack = stream.getAudioTracks()[0];
			const videoTrack = stream.getVideoTracks()[0];

			if (!audioTrack) {
				setStatus("No Audio Track - User didn't share audio");
				cleanupStream(stream);
				return;
			}

			if (!videoTrack) {
				setStatus("No Video Track - Can't capture frames");
				cleanupStream(stream);
				return;
			}

			// Setup video and canvas for frame capture
			await setupFrameCapture(stream);

			// Setup audio processing
			setupAudioProcessing(stream);

			setIsRecording(true);
			setTranscript("");
			setStatus("Recording Screen + Audio");
		} catch (err) {
			console.error("Screen Share Error:", err);
			const error = err as { name?: string; message?: string };
			if (error.name === "NotAllowedError") {
				setStatus("Error: Permission Denied");
			} else {
				setStatus(`Error: ${error.message ?? "Unknown error"}`);
			}
		}
	};

	const stopRecording = () => {
		// Stop frame capture interval
		if (frameIntervalRef.current) {
			window.clearInterval(frameIntervalRef.current);
			frameIntervalRef.current = null;
		}

		// Clean up video element
		if (videoElementRef.current) {
			videoElementRef.current.srcObject = null;
			videoElementRef.current = null;
		}

		// Clean up canvas
		if (canvasElementRef.current) {
			canvasElementRef.current = null;
		}

		// Disconnect audio nodes in reverse order of connection
		if (scriptProcessorRef.current) {
			scriptProcessorRef.current.disconnect();
			scriptProcessorRef.current = null;
		}
		if (audioContextRef.current) {
			audioContextRef.current.close();
			audioContextRef.current = null;
		}
		if (mediaStreamRef.current) {
			for (const track of mediaStreamRef.current.getTracks()) {
				track.stop();
			}
			mediaStreamRef.current = null;
		}
		// Close WebSocket gracefully
		if (wsRef.current) {
			wsRef.current.close();
			wsRef.current = null;
		}
		setIsRecording(false);
		setStatus("Stopped");
	};

	const clearTranscript = () => setTranscript("");

	return (
		<div className="p-10 font-sans max-w-2xl mx-auto">
			{/* Navigation */}
			<nav className="mb-8 flex items-center gap-4 pb-4 border-b border-gray-200 dark:border-gray-700">
				<Link
					to="/study/flashcards"
					className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
				>
					<BookOpen className="w-4 h-4" />
					Flashcards
				</Link>
				<Link
					to="/study/stats"
					className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
				>
					<TrendingUp className="w-4 h-4" />
					Statistics
				</Link>
				<Link
					to="/study/materials"
					className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
				>
					<FileText className="w-4 h-4" />
					Study Materials
				</Link>
			</nav>

			<h1 className="text-3xl font-bold mb-2">Screen + Audio STT</h1>
			<p className="text-gray-500 mb-6">
				Capture screen audio via getDisplayMedia API
			</p>

			<div className="flex items-center gap-4 mb-6">
				<div
					className={`w-3 h-3 rounded-full ${isRecording ? "bg-red-500 animate-pulse" : "bg-gray-300"}`}
				/>
				<span
					className={`font-mono text-sm ${status.includes("Transcribing") ? "text-green-600 font-bold" : "text-gray-600"}`}
				>
					{status}
				</span>
			</div>

			{browserSupported === false && (
				<div className="mb-6 p-4 bg-red-50 border-l-4 border-red-400 text-red-700 text-sm rounded">
					<p className="font-bold">Browser Not Supported</p>
					<p className="mt-2">
						Please use <strong>Google Chrome</strong> or{" "}
						<strong>Microsoft Edge</strong> for screen audio capture.
					</p>
				</div>
			)}

			{isRecording && (
				<div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-400 text-blue-700 text-sm rounded">
					<p className="font-bold">Recording Active</p>
					<ul className="list-disc ml-5 mt-2 space-y-1">
						<li>Audio is captured from your selected screen/tab</li>
						<li>Click "Stop Sharing" in browser bar to end</li>
						<li>Only Chrome/Edge support system audio</li>
					</ul>
				</div>
			)}

			<div className="flex gap-4 mb-8">
				{!isRecording ? (
					<button
						type="button"
						onClick={startRecording}
						className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
					>
						Start Screen Capture
					</button>
				) : (
					<button
						type="button"
						onClick={stopRecording}
						className="bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition"
					>
						Stop
					</button>
				)}
				<button
					type="button"
					onClick={clearTranscript}
					className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
				>
					Clear
				</button>
			</div>

			<div className="border-2 border-gray-200 rounded-xl p-6 bg-gray-50 min-h-[150px] shadow-inner">
				<h3 className="text-xs uppercase tracking-wide text-gray-400 font-bold mb-2">
					Live Transcript
				</h3>
				<p className="text-lg text-gray-800 leading-relaxed">
					{transcript || (
						<span className="text-gray-400 italic">Waiting for speech...</span>
					)}
				</p>
			</div>

			{screenAnalysis && (
				<div className="border-2 border-purple-200 rounded-xl p-6 bg-purple-50 min-h-[100px] shadow-inner mt-6">
					<h3 className="text-xs uppercase tracking-wide text-purple-400 font-bold mb-2">
						Screen Analysis
					</h3>
					<p className="text-lg text-purple-800 leading-relaxed">
						{screenAnalysis}
					</p>
				</div>
			)}

			<StudyAssistantPanel />
		</div>
	);
}
