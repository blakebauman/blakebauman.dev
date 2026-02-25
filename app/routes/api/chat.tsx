import { requestAI } from '@/chat/request';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';

export async function loader({ request, context }: LoaderFunctionArgs) {
  return await requestAI({ request, context });
}

export async function action({ request, context }: ActionFunctionArgs) {
  return await requestAI({ request, context });
}
