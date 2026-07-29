import { Hono } from 'hono';
import api from './routes/api';
import data from './routes/data';
import type { Bindings } from './types';

const app = new Hono<{ Bindings: Bindings }>();

app.route('/api', api);
app.route('/data', data);

app.notFound((c) => c.text('Not Found', 404));

export default app;
