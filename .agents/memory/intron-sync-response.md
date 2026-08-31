---
name: Intron sync response
description: Provider behavior observed when Sahara's synchronous file upload returns transcript data before a final status.
---

Treat a non-empty Sahara `audio_transcript` as usable even when the synchronous upload response reports `FILE_QUEUED`; only poll the status endpoint when the transcript is still empty.

**Why:** A real successful request returned a complete transcript and duration with `FILE_QUEUED`, contrary to the apparent expectation that synchronous success always reports `FILE_TRANSCRIBED`.

**How to apply:** Preserve strict response validation, but prioritize a non-empty transcript. If it is absent and a file ID exists, poll briefly; never fabricate or silently substitute a transcript.