import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { requestAI } from '@/chat/request';

export async function loader({ request, context }: LoaderFunctionArgs) {
  return await requestAI({ request, context });
}

export async function action({ request, context }: ActionFunctionArgs) {
  return await requestAI({ request, context });
}
