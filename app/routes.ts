import { index, type RouteConfig, route } from '@react-router/dev/routes';

export default [
  index('routes/home.tsx'),
  route('api/chat', 'routes/api/chat.tsx'),
  route('robots.txt', 'routes/robots.txt.tsx'),
  route('sitemap.xml', 'routes/sitemap.xml.tsx'),
] satisfies RouteConfig;
