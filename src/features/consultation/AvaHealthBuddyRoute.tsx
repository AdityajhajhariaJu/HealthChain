import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AvaHealthBuddy from './AvaHealthBuddy';

const queryClient = new QueryClient();

/** Ava is the only Query client consumer; load its provider with the feature. */
export default function AvaHealthBuddyRoute() {
  return (
    <QueryClientProvider client={queryClient}>
      <AvaHealthBuddy />
    </QueryClientProvider>
  );
}
