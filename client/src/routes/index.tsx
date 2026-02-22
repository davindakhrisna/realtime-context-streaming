import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";

export const Route = createFileRoute("/")({
	component: Home,
});

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

function findLoopbackDevice(
	devices: MediaDeviceInfo[],
): MediaDeviceInfo | null {
	const keywords = [
		"stereo mix",
		"what u hear",
		"monitor",
		"blackhole",
		"loopback",
		"virtual",
	];
	return (
		devices.find(
			(d) =>
				d.kind === "audioinput" &&
				keywords.some((k) => d.label.toLowerCase().includes(k)),
		) || null
	);
}

function Home() {
	const [isRecording, setIsRecording] = useState(false);
	const [transcript, setTranscript] = useState("");
	const [status, setStatus] = useState("Idle");
	const [systemAudioDetected, setSystemAudioDetected] = useState<
		boolean | null
	>(null);

	const wsRef = useRef<WebSocket | null>(null);
	const audioContextRef = useRef<AudioContext | null>(null);
	const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
	const mediaStreamRef = useRef<MediaStream | null>(null);

	const connect = () => {
		wsRef.current = new WebSocket("ws://localhost:8000/ws");
		wsRef.current.onopen = () => setStatus("Connected");
		wsRef.current.onmessage = (event) => {
			const data = JSON.parse(event.data);
			if (data.type === "result") {
				// Server sends ONLY new text now - just append it
				setTranscript((prev) => (prev ? prev + " " : "") + data.text.trim());
				setStatus("Transcribing...");
				setTimeout(() => {
					if (wsRef.current?.readyState === WebSocket.OPEN)
						setStatus("Connected");
				}, 2000);
			}
		};
		wsRef.current.onclose = () => setStatus("Disconnected");
		wsRef.current.onerror = () => setStatus("WebSocket Error");
	};

	const startRecording = async () => {
		if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
			connect();
			await new Promise((r) => setTimeout(r, 500));
		}

		try {
			const devices = await navigator.mediaDevices.enumerateDevices();
			const loopbackDevice = findLoopbackDevice(devices);

			// Universal audio constraints - let browser choose best format
			let constraints: MediaStreamConstraints = {
				audio: {
					channelCount: { ideal: 1 }, // Prefer mono but accept stereo
					echoCancellation: false,
					noiseSuppression: false,
					autoGainControl: false,
					// Don't specify sampleRate here - browsers handle this differently
				},
			};

			if (loopbackDevice) {
				constraints.audio = {
					...constraints.audio,
					deviceId: { exact: loopbackDevice.deviceId },
				};
				setSystemAudioDetected(true);
				setStatus("System Audio Detected & Selected");
			} else {
				setSystemAudioDetected(false);
				setStatus("Using Default Microphone");
			}

			const stream = await navigator.mediaDevices.getUserMedia(constraints);
			mediaStreamRef.current = stream;

			// Create AudioContext with browser's default sample rate
			// This ensures compatibility across all browsers/OS
			const audioCtx = new (
				window.AudioContext || (window as any).webkitAudioContext
			)();
			audioContextRef.current = audioCtx;

			const source = audioCtx.createMediaStreamSource(stream);

			// Use ScriptProcessor with appropriate buffer size
			// Buffer sizes: 256, 512, 1024, 2048, 4096, 8192, 16384
			// Larger = more latency but more stable
			const bufferSize = audioCtx.sampleRate >= 48000 ? 8192 : 4096;
			const processor = audioCtx.createScriptProcessor(bufferSize, 1, 1);
			scriptProcessorRef.current = processor;

			processor.onaudioprocess = (e) => {
				if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN)
					return;

				const inputData = e.inputBuffer.getChannelData(0);

				// Resample to 16kHz if needed (browser may give us 44.1kHz, 48kHz, etc.)
				const targetSampleRate = 16000;
				const resampledData = resampleAudio(
					inputData,
					audioCtx.sampleRate,
					targetSampleRate,
				);

				// Convert Float32 (-1 to 1) to Int16 PCM for consistent server format
				const int16Data = new Int16Array(resampledData.length);
				for (let i = 0; i < resampledData.length; i++) {
					// Clamp to [-1, 1] range to prevent clipping
					const s = Math.max(-1, Math.min(1, resampledData[i]));
					// Convert to 16-bit integer
					int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
				}

				// Send as binary (Int16 PCM bytes)
				wsRef.current.send(int16Data.buffer);
			};

			source.connect(processor);
			processor.connect(audioCtx.destination);

			setIsRecording(true);
			setTranscript("");
		} catch (err) {
			console.error("Mic Error:", err);
			setStatus("Error: " + (err as Error).message);
		}
	};

	const stopRecording = () => {
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
			mediaStreamRef.current.getTracks().forEach((track) => track.stop());
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
			<h1 className="text-3xl font-bold mb-2">Universal STT</h1>
			<p className="text-gray-500 mb-6">
				Timestamp-based Deduplication + Universal Audio Capture
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

			{isRecording && systemAudioDetected === false && (
				<div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700 text-sm rounded">
					<p className="font-bold">System Audio Not Detected</p>
					<ul className="list-disc ml-5 mt-2 space-y-1">
						<li>
							<strong>Windows:</strong> Enable "Stereo Mix" in Sound Settings.
						</li>
						<li>
							<strong>macOS:</strong> Install "BlackHole".
						</li>
						<li>
							<strong>Linux:</strong> Use <code>pavucontrol</code> to set
							"Monitor".
						</li>
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
						Start Listening
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
		</div>
	);
}
