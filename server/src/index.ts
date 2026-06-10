import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth';
import analyzeRouter from './routes/analyze';
import paymentRouter from './routes/payment';
import aiRouter from './routes/ai';

const app = express();

const allowedOrigins = [
  process.env.CLIENT_URL,
  'https://accessiscan-sand.vercel.app',
  'https://accessiscan-api-ccge.onrender.com',
].filter(Boolean) as string[];

app.use(cors({ origin: allowedOrigins }));

// Stripe webhook ham body istiyor — diğer route'lardan önce tanımla
app.use('/api/payment/webhook', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '2mb' }));

app.use('/api/auth', authRouter);
app.use('/api/analyze', analyzeRouter);
app.use('/api/payment', paymentRouter);
app.use('/api/ai', aiRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
