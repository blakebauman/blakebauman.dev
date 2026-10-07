import { Resume } from '../components/resume';
import { chatGreetingFor, derivePersona, suggestedPromptsFor } from '../lib/persona';
import { homeGraph, pageMeta } from '../lib/seo';
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
  return pageMeta({
    title: 'Blake Bauman | Enterprise commerce and agent infrastructure',
    description:
      'Principal Technical Architect at Adobe. Enterprise commerce on Adobe Commerce and AEM Edge Delivery Services, plus independent agent infrastructure: Felix, Memoturn, Fold.',
    path: '/',
    type: 'website',
    jsonLd: homeGraph(),
  });
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
