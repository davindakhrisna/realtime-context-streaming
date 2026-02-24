# Todo List

- Initialize Server and Client
- Install Pipeline Model (Moondream2)
- Install Server Dependencies
- Initialize local vector db
- Test local vector db (Create, Delete, Read)
- Integrate STT through websocket (client -> server)
- Initialize Moondream2 into the project

- Integrate the function to do screen capture every 10 seconds && pixel change from the client
- Create a HTTP communication for client -> server to transport screen frame
- Have every sent screen capture to be processed and summarised by the local VLM
- Build JSON output structure for both VLM and STT, make them both identical
- Every JSON should have timestamp
- Process JSON to embeddings straight away
- Integrate a Cloud based AI that user can inquiry, provide it with the local vector DB
- Finalization, refactor configurable codes with .env
