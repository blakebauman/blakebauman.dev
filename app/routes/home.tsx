import type { Route } from './+types/home';
import { Resume } from '../resume/resume';

export function meta({}: Route.MetaArgs) {
  return [
    {
      title: 'Blake Bauman | Software Engineer/Principal Technical Architect @ Adobe',
    },
    { name: 'description', content: 'Welcome to blakebauman.dev!' },
  ];
}

export function loader({ context }: Route.LoaderArgs) {
  return { message: context.cloudflare.env.VALUE_FROM_CLOUDFLARE };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  return <Resume message={loaderData.message} />;
}
