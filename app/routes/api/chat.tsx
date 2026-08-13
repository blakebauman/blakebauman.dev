import type { ActionFunctionArgs } from 'react-router';
import { requestAI } from '@/chat/request';

// No loader is exported on purpose. This route used to export one, which meant
// GET /api/chat ran the whole chat path — model call included — while the rate
// limiter in workers/app.ts only checked POST. The worker now returns 405 for
// non-POST methods before reaching React Router; this file simply does not
// offer a second way in.

export async function action({ request, context }: ActionFunctionArgs) {
  return await requestAI({ request, context });
}
