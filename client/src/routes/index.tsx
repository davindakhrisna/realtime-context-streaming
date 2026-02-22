import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";

export const Route = createFileRoute("/")({
	component: Home,
});

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
	const [lastActivity, setLastActivity] = useState<Date | null>(null);

	const wsRef = useRef<WebSocket | null>(null);
	const audioContextRef = useRef<AudioContext | null>(null);
	const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
	const mediaStreamRef = useRef<MediaStream | null>(null);

	const connect = () => {
		wsRef.current = new WebSocket("ws://localhost:8000/ws");
		wsRef.current.onopen = () => setStatus("Connected (Waiting for speech...)");
		wsRef.current.onmessage = (event) => {
			const data = JSON.parse(event.data);
			if (data.type === "result") {
				setTranscript((prev) => (prev ? prev + " " : "") + data.text);
				setLastActivity(new Date());
				setStatus("Transcribing...");
				// Reset status to "Listening" after 2s of no new messages
				setTimeout(() => {
					if (wsRef.current?.readyState === WebSocket.OPEN) {
						setStatus("Connected (Waiting for speech...)");
					}
				}, 2000);
			}
		};
		wsRef.current.onclose = () => setStatus("Disconnected");
	};

	const startRecording = async () => {
		if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
			connect();
			await new Promise((r) => setTimeout(r, 500));
		}

		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				audio: { channelCount: 1 },
			});
			mediaStreamRef.current = stream;

			const audioCtx = new (
				window.AudioContext || (window as any).webkitAudioContext
			)();
			audioContextRef.current = audioCtx;

			const source = audioCtx.createMediaStreamSource(stream);
			const processor = audioCtx.createScriptProcessor(4096, 1, 1);
			scriptProcessorRef.current = processor;

			processor.onaudioprocess = (e) => {
				if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN)
					return;
				const inputData = e.inputBuffer.getChannelData(0);
				const resampledData = resampleAudio(
					inputData,
					audioCtx.sampleRate,
					16000,
				);
				wsRef.current.send(resampledData.buffer);
			};

			source.connect(processor);
			processor.connect(audioCtx.destination);

			setIsRecording(true);
			setStatus("Connected (Waiting for speech...)");
			setTranscript("");
		} catch (err) {
			console.error("Mic Error:", err);
			setStatus("Error accessing microphone");
		}
	};

	const stopRecording = () => {
		if (scriptProcessorRef.current) scriptProcessorRef.current.disconnect();
		if (audioContextRef.current) audioContextRef.current.close();
		if (mediaStreamRef.current)
			mediaStreamRef.current.getTracks().forEach((track) => track.stop());
		setIsRecording(false);
		setStatus("Stopped");
	};

	const clearTranscript = () => setTranscript("");

	return (
		<div className="p-10 font-sans max-w-2xl mx-auto">
			<h1 className="text-3xl font-bold mb-2">Universal STT (Phase 3)</h1>
			<p className="text-gray-500 mb-6">
				VAD Enabled: Saves battery by ignoring silence
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

			<div className="flex gap-4 mb-8">
				{!isRecording ? (
					<button
						onClick={startRecording}
						className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
					>
						Start Speaking
					</button>
				) : (
					<button
						onClick={stopRecording}
						className="bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition"
					>
						Stop
					</button>
				)}
				<button
					onClick={clearTranscript}
					className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
				>
					Clear Text
				</button>
			</div>

			<div className="border-2 border-gray-200 rounded-xl p-6 bg-gray-50 min-h-[150px] shadow-inner relative">
				<h3 className="text-xs uppercase tracking-wide text-gray-400 font-bold mb-2">
					Live Transcript
				</h3>
				<p className="text-lg text-gray-800 leading-relaxed">
					{transcript || (
						<span className="text-gray-400 italic">Waiting for speech...</span>
					)}
				</p>
				{lastActivity && (
					<div className="absolute bottom-2 right-4 text-xs text-gray-400">
						Last update: {lastActivity.toLocaleTimeString()}
					</div>
				)}
			</div>
		</div>
	);
}
