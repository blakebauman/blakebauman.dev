import { Resume } from '../resume/resume';
import type { Route } from './+types/home';

export function meta(_: Route.MetaArgs) {
  return [
    {
      title: 'Blake Bauman | Software Engineer/Principal Technical Architect @ Adobe',
    },
    { name: 'description', content: 'Welcome to blakebauman.dev!' },
  ];
}

export default function Home() {
  return <Resume />;
}
