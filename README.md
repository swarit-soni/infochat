<div align="center">

# Sera

AI-powered campus assistant for Kalvium students and mentors, with grounded search and a generative UI.

https://sera-info.vercel.app

</div>

## Overview

Sera helps students and mentors quickly find accurate information about admissions, fees, examinations, timetables, and college activities with cited answers and an interactive interface.

## Features

- Google sign-in open to any Google account; Kalvium accounts get a role (`@kalvium.com` for Mentors, `@kalvium.community` for Students)
- Powered by Gemini 4 Hydrogen (`google:gemini-4-hydrogen`) via the Vercel AI SDK, with multi-provider support (Google, OpenAI, Anthropic, Ollama, Vercel AI Gateway, OpenAI-compatible providers)
- Search modes: Quick and Adaptive
- Grounded answers with inline citations and generative UI components
- Multiple search backends (Tavily, SearXNG, Brave, Exa)
- Persistent chat history, Spaces, and Library backed by PostgreSQL (Supabase / Drizzle ORM)
- Shareable conversations and file upload support
- Docker deployment ready

## Installation

### Local Development

1. Clone and install:

```bash
git clone https://github.com/swarit-soni/infochat.git
cd infochat
bun install
```

2. Configure environment:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and configure your Supabase project credentials, `DATABASE_URL`, Google Gemini API key (`GOOGLE_GENERATIVE_AI_API_KEY`), and a search provider key (`TAVILY_API_KEY`).

See [CONFIGURATION.md](./docs/CONFIGURATION.md) for all environment options and [PRIVACY.md](./docs/PRIVACY.md) for outbound request behavior.

3. Start the dev server:

```bash
bun dev
```

Visit http://localhost:3000.

### Docker

1. Clone the repository and configure environment:

```bash
git clone https://github.com/swarit-soni/infochat.git
cd infochat
cp .env.local.example .env.local
```

2. Set at least one AI provider API key in `.env.local`, then start all services:

```bash
docker compose up -d
```

Docker Compose starts PostgreSQL, Redis, SearXNG, and Sera automatically. See the [Docker Guide](./docs/DOCKER.md) for more options.

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details on getting started.

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.
