# Interview Simulation Platform (TypeScript/NestJS Version)

This is a TypeScript/NestJS implementation of the Interview Simulation Platform, a system that uses AI to simulate job interviews for candidates.

## Features

- Create and manage interview sessions with different personality types and difficulty levels
- Real-time interaction with an AI interviewer through WebSockets
- Audio transcription (speech-to-text) for candidate responses
- Text-to-speech synthesis for interviewer questions
- Detailed interview feedback generation
- Docker-based setup for easy development and deployment

## Getting Started

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- OpenAI API Key

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/interview-simulation-platform.git
   cd interview-simulation-platform
   ```

2. Create a `.env` file based on the example:
   ```bash
   cp .env.example .env
   ```

3. Add your OpenAI API key to the `.env` file:
   ```
   OPENAI_API_KEY=your_api_key_here
   ```

### Running with Docker

1. Start the application:
   ```bash
   docker-compose up -d
   ```

2. The API will be available at:
   ```
   http://localhost:8000/api/v1
   ```

3. To stop the application:
   ```bash
   docker-compose down
   ```

### Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Generate Prisma client:
   ```bash
   npx prisma generate
   ```

3. Set up the database:
   ```bash
   chmod +x scripts/setup-db.sh
   ./scripts/setup-db.sh
   ```

4. Run the application in development mode:
   ```bash
   npm run start:dev
   ```

## API Endpoints

### Interview Endpoints

- `POST /api/v1/interviews/create` - Create a new interview session
- `GET /api/v1/interviews/:interview_id` - Get interview session details
- `GET /api/v1/interviews/:interview_id/messages` - Get all messages for an interview
- `POST /api/v1/interviews/:interview_id/start` - Start an interview session
- `POST /api/v1/interviews/:interview_id/end` - End an interview session
- WebSocket: `ws://localhost:8000/api/v1/interviews/ws/:interview_id` - Real-time interview interaction

### Audio Endpoints

- `POST /api/v1/audio/transcribe` - Transcribe audio to text
- `POST /api/v1/audio/synthesize` - Convert text to speech

### Feedback Endpoints

- `POST /api/v1/feedback/generate/:interview_id` - Generate feedback for an interview
- `GET /api/v1/feedback/:interview_id` - Get feedback for an interview

## Architecture

The application follows a modular architecture using NestJS:

- **Interview Module**: Manages interview sessions and real-time interaction
- **Audio Module**: Handles audio transcription and synthesis
- **Feedback Module**: Generates and retrieves interview feedback
- **OpenAI Module**: Integrates with OpenAI for AI capabilities
- **Prisma Module**: Provides database access through Prisma ORM

## Technical Stack

- **Backend**: NestJS (TypeScript)
- **Database**: PostgreSQL
- **ORM**: Prisma
- **WebSockets**: Socket.IO
- **AI**: OpenAI API (GPT-4, Whisper, TTS)
- **Containerization**: Docker

## License

This project is licensed under the MIT License - see the LICENSE file for details.