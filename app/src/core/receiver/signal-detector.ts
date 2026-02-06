// Module: core/receiver/signal-detector
// Signal post detection using epoch key and selection threshold

import { isSignalPost } from '../protocol/selection';
import type { UnifiedPost } from './types';

/**
 * Filter signal posts from a collection of fetched posts.
 *
 * A post is a signal post if its selection hash falls below the
 * threshold derived from the selection rate. Pure function with
 * no adapter dependencies.
 *
 * @param posts - Array of posts to filter
 * @param epochKey - Epoch key for selection hashing
 * @param rate - Selection rate (0.0 to 1.0, default 0.25)
 * @returns Array of signal posts
 */
export async function detectSignalPosts(
  posts: UnifiedPost[],
  epochKey: Uint8Array,
  rate: number = 0.25
): Promise<UnifiedPost[]> {
  const results = await Promise.all(
    posts.map(async (post) => ({
      post,
      isSignal: await isSignalPost(epochKey, post.id, rate),
    }))
  );

  return results.filter((r) => r.isSignal).map((r) => r.post);
}
