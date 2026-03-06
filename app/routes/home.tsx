import { Resume } from '../resume/resume';
import type { Route } from './+types/home';

export function loader({ context }: Route.LoaderArgs) {
  return {
    chatEnabled: context.cloudflare.env.CHAT_ENABLED === 'true',
  };
}

export function meta(_: Route.MetaArgs) {
  return [
    {
      title: 'Blake Bauman | Enterprise-scale systems, edge computing, and AI',
    },
    { name: 'description', content: 'Welcome to blakebauman.dev!' },
  ];
}

export default function Home({ loaderData }: Route.ComponentProps) {
  return <Resume chatEnabled={loaderData.chatEnabled} />;
}
