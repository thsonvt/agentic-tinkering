import {ConvexReactClient} from 'convex/react';

let convexClient: ConvexReactClient | null = null;

export function getConvexClient(url?: string): ConvexReactClient | null {
  if (typeof window === 'undefined') {
    return null;
  }

  if (convexClient) {
    return convexClient;
  }

  if (!url) {
    console.warn('Convex URL not provided');
    return null;
  }

  convexClient = new ConvexReactClient(url);
  return convexClient;
}
