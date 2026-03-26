# Square POS Integration Backend

Complete production-ready backend for Square POS integration with Express, TypeScript, and Node.js.

## Features

✅ **Square API Integration**
- Fetch payments and orders from Square
- Real-time webhook processing
- Automatic data synchronization

✅ **REST API Endpoints**
- `POST /square/connect` - Connect to Square
- `GET /square/payments` - Get all payments
- `GET /square/orders` - Get all orders
- `POST /square/sync` - Manual sync trigger
- `POST /webhook/square` - Webhook receiver

✅ **Production-Ready**
- TypeScript for type safety
- Modular architecture (services, controllers, routes)
- Comprehensive logging
- Error handling
- CORS support
- Webhook validation

✅ **In-Memory Database**
- Mock database for storing synced data
- Stores payments, orders, webhooks
- Sync status tracking
- Connection state management

## Project Structure

```
server/
├── src/
│   ├── config/
│   │   └── squareClient.ts          # Square SDK configuration
│   ├── controllers/
│   │   ├── squareController.ts      # API route handlers
│   │   └── webhookController.ts     # Webhook handlers
│   ├── services/
│   │   └── squareService.ts         # Business logic
│   ├── routes/
│   │   ├── squareRoutes.ts          # /square endpoints
│   │   ├── webhookRoutes.ts         # /webhook endpoints
│   │   └── integrationRoutes.ts     # /integrations endpoints
│   ├── types/
│   │   └── square.ts                # TypeScript interfaces
│   ├── utils/
│   │   ├── logger.ts                # Logging utility
│   │   └── inMemoryDB.ts            # Mock database
│   └── server.ts                    # Express app & initialization
├── package.json                      # Dependencies
├── tsconfig.json                     # TypeScript config
├── .env                              # Environment variables
└── .env.example                      # Example variables

```

## Setup Instructions

### 1. Install Dependencies

```bash
cd server
npm install

# Also install TypeScript build tools
npm install --save-dev typescript ts-node @types/express @types/node @types/axios
```

### 2. Configure Environment Variables

Copy the existing `.env` file and add Square credentials:

```bash
# .env file should have:
SQUARE_ACCESS_TOKEN=your_token_here
SQUARE_APPLICATION_ID=your_app_id_here
SQUARE_LOCATION_ID=your_location_id_here
SQUARE_ENVIRONMENT=production
PORT=5000
```

Get these from Square Dashboard:
- [Square Developer Dashboard](https://developer.squareup.com/apps)
- Navigate to your application
- Copy Access Token, Application ID, and Location ID

### 3. Update package.json Scripts

Add these scripts to `server/package.json`:

```json
{
  "scripts": {
    "dev": "ts-node src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "start:dev": "nodemon --exec ts-node src/server.ts",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "express": "^4.18.2",
    "axios": "^1.13.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "typescript": "^5.2.2",
    "ts-node": "^10.9.1",
    "nodemon": "^3.0.1",
    "@types/express": "^4.17.17",
    "@types/node": "^20.0.0",
    "@types/axios": "^0.14.0"
  }
}
```

### 4. Create TypeScript Config

Create `server/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

### 5. Run the Server

**Development (with auto-reload):**
```bash
npm run start:dev
```

**Production:**
```bash
npm run build
npm start
```

The server will start on `http://localhost:5000`

## API Endpoints

### Health & Status

```bash
# Health check
GET /health
```

### Square Integration

```bash
# Connect to Square (called from frontend "Connect" button)
POST /square/connect

# Get all payments
GET /square/payments

# Get all orders
GET /square/orders

# Manual sync trigger
POST /square/sync

# Get status
GET /square/status
```

### Webhooks

```bash
# Receive Square webhooks (configured in Square Dashboard)
POST /webhook/square

# Test webhook (for development)
POST /webhook/square/test
```

## Testing Locally

### 1. Start the Backend

```bash
cd server
npm run start:dev
```

Output should show:
```
🚀 Server started on http://localhost:5000
✅ Square integration ready
📚 API Endpoints:
   Square Integration:
     GET  /square/health
     POST /square/connect
     ...
```

### 2. Test Endpoints with curl

```bash
# Health check
curl http://localhost:5000/health

# Get Square status
curl http://localhost:5000/square/status

# Get payments
curl http://localhost:5000/square/payments

# Send test webhook
curl -X POST http://localhost:5000/webhook/square/test \
  -H "Content-Type: application/json"

# Manual sync
curl -X POST http://localhost:5000/square/sync
```

### 3. Test Connect Endpoint (simulates frontend button click)

```bash
curl -X POST http://localhost:5000/square/connect
```

This will:
1. Connect to Square using your access token
2. Fetch allpayments and orders
3. Store them in the database
4. Return connection status

### 4. View Logs

All operations are logged. Look for:
- 🚀 Server startup
- 🔌 Connection attempts
- 📥 Sync operations
- 📨 Webhook events
- ❌ Errors with details

## Integration with Frontend(Existing UI)

The frontend (already exists) will call these endpoints:

**When user clicks "Connect" button:**
```javascript
fetch('http://localhost:5000/square/connect', {
  method: 'POST'
})
.then(res => res.json())
.then(data => console.log('Connected:', data))
```

**Get payments:**
```javascript
fetch('http://localhost:5000/square/payments')
  .then(res => res.json())
  .then(payments => console.log(payments))
```

**Get orders:**
```javascript
fetch('http://localhost:5000/square/orders')
  .then(res => res.json())
  .then(orders => console.log(orders))
```

## Webhook Setup (Production)

1. Go to [Square Developer Dashboard](https://developer.squareup.com/apps)
2. Select your application
3. Go to Webhooks section
4. Add webhook URL: `https://yourserver.com/webhook/square`
5. Subscribe to events:
   - `payment.created`
   - `payment.updated`
   - `order.created`
   - `order.updated`

## Data Flow

```
Frontend "Connect" Button
        ↓
POST /square/connect
        ↓
SquareClient → Square API
        ↓
Fetch Payments & Orders
        ↓
SquareService processes data
        ↓
In-Memory Database stores data
        ↓
Response to Frontend

------- Webhooks -------

Square sends event
        ↓
POST /webhook/square
        ↓
WebhookController receives
        ↓
SquareService processes event
        ↓
In-Memory Database updated
```

## Key Files Explained

### `config/squareClient.ts`
- Initializes axios client for Square API
- Handles authentication
- Provides methods: getPayments(), getOrders(), getCustomers()

### `services/squareService.ts`
- Implements business logic
- Calls Square API via client
- Processes webhooks
- Manages sync status

### `controllers/squareController.ts`
- Handles HTTP requests
- Calls services
- Returns JSON responses

### `utils/inMemoryDB.ts`
- Stores synced data
- Tracks sync status
- Stores webhook events

### `server.ts`
- Express app initialization
- Routes setup
- Error handling
- Server startup

## Troubleshooting

### "Square credentials not configured"
- Check `.env` file has `SQUARE_ACCESS_TOKEN` and `SQUARE_LOCATION_ID`
- Verify values are not wrapped in quotes

### "Port 5000 is already in use"
- Change port: `PORT=6000 npm run start:dev`
- Or kill existing process on port 5000

### "CORS blocked request"
- Make sure frontend URL is allowed in CORS middleware
- Check allowed origins in `server.ts`

### Webhooks not being received
- Verify webhook URL is public and accessible
- Check Square Dashboard webhook configuration
- Look at server logs for incoming webhook errors

## Deployment

### Deploy to Render / Heroku

1. **Build:**
   ```bash
   npm run build
   ```

2. **Environment Variables:**
   - Set `SQUARE_ACCESS_TOKEN`
   - Set `SQUARE_LOCATION_ID`
   - Set `SQUARE_APPLICATION_ID`
   - Set `PORT` (if different from 5000)

3. **Start Command:**
   ```
   npm start
   ```

### Docker Deployment (Optional)

Create `Dockerfile`:
```dockerfile
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t square-backend .
docker run -p 5000:5000 -e SQUARE_ACCESS_TOKEN=xxx square-backend
```

## Support

For issues or questions:
1. Check the logs for detailed error messages
2. Verify Square credentials
3. Check network connectivity to Square API
4. Review [Square API Documentation](https://developer.squareup.com/reference)

## License

MIT
