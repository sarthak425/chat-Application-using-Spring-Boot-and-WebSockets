# ChatBox

WhatsApp-inspired direct messaging app built with:

- React + Tailwind CSS
- Spring Boot + Spring Security
- JWT authentication
- STOMP over WebSocket
- MySQL-ready persistence

## What It Does

- User registration and login
- One-to-one real-time chat
- Message history with pagination
- Typing indicators
- Read receipts
- Attachments and voice notes
- Online/offline presence
- Dark/light mode

## Local Development

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

Set the database and JWT environment variables if you want to use MySQL locally:

```bash
SPRING_DATASOURCE_URL=jdbc:mysql://localhost:3306/chatbox
SPRING_DATASOURCE_USERNAME=your_user
SPRING_DATASOURCE_PASSWORD=your_password
JWT_SECRET=change-me-in-production-change-me-in-production
```

Then run:

```bash
./mvnw spring-boot:run
```

If you do not set MySQL variables, the app falls back to in-memory H2 for local/test usage.

## Production Deploy

Render runs the app with `SPRING_PROFILES_ACTIVE=prod`.

Set these environment variables in your production service:

- `SPRING_DATASOURCE_URL`
- `SPRING_DATASOURCE_USERNAME`
- `SPRING_DATASOURCE_PASSWORD`
- `JWT_SECRET`

The `prod` profile does not enable H2, so the app will fail fast if the MySQL settings are missing.

## Production Build

The included `Dockerfile` builds the React app first, copies the production bundle into Spring Boot, and ships a single deployable container.

```bash
docker build -t chatbox .
```

## API Notes

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/conversations`
- `POST /api/conversations/direct`
- `GET /api/messages/conversation/{conversationId}/page`
- `POST /api/messages`

## WebSocket

- Endpoint: `/ws`
- Application prefix: `/app`
- Broker topics: `/topic` and `/queue`
