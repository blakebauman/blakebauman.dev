import { Resume } from '../components/resume';
import { chatGreetingFor, derivePersona, suggestedPromptsFor } from '../lib/persona';
import type { Route } from './+types/home';

export function loader({ context, request }: Route.LoaderArgs) {
  const persona = derivePersona(request);
  return {
    chatEnabled: context.cloudflare.env.CHAT_ENABLED === 'true',
    persona,
    chatGreeting: chatGreetingFor(persona),
    suggestedPrompts: suggestedPromptsFor(persona),
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
  return (
    <Resume
      chatEnabled={loaderData.chatEnabled}
      persona={loaderData.persona}
      chatGreeting={loaderData.chatGreeting}
      suggestedPrompts={loaderData.suggestedPrompts}
    />
  );
}
