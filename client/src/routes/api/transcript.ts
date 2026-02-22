import { createClient } from "@deepgram/sdk";
import { createServerFn } from "@tanstack/react-start";
import { env } from "#/env";

export const startTranscription = createServerFn({ method: "POST" }).handler(
	async () => {
		const deepgram = createClient(env.DEEPGRAM_API_KEY);

		const live = deepgram.listen.live({
			model: "nova-2",
			language: "en",
			smart_format: true,
		});

		live.on("open", () => {
			console.log("Deepgram connection opened");
		});

		live.on("transcriptReceived", (data) => {
			// Send this data back to client, e.g., via a Socket.io bridge or server-sent events
			console.log(data.channel.alternatives[0].transcript);
		});

		live.on("error", (err) => {
			console.error(err);
		});

		// Return something indicating the connection is established
		return { status: "connected" };
	},
);
