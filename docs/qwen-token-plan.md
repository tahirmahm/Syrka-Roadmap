# Retired Token Plan integration

The latest directive supersedes this integration. The Roadmaps backend must not use the prior Individual Lite/Coding Token Plan key or endpoint. `qwen-token-plan` now fails closed and the old operator probe performs no request.

Use [Singapore free-quota configuration](qwen-free-quota.md). Historical database quota tables and previous validation records are retained for compatibility and provenance; they do not authorize calls to the old endpoint.
