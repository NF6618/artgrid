import { PinterestAdapter } from './pinterest';
import { CosmosAdapter } from './cosmos';
import type { SiteAdapter } from './types';

export const adapters: SiteAdapter[] = [
  PinterestAdapter,
  CosmosAdapter,
];

export function getActiveAdapter(): SiteAdapter | null {
  const hostname = window.location.hostname;
  return adapters.find(a => a.match(hostname)) || null;
}
