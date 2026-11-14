import { put, get, list, del } from '@vercel/blob';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const BLOB_PREFIX = 'allotly/state-';
const KEEP_VERSIONS = 3;

type AppState = {
  settings: {
    weight: string;
    ft: string;
    inch: string;
    age: string;
    goal: string;
    activity: string;
  };
  logs: Record<string, { food: string; burn: string }>;
  weighins: Array<{ date: string; weight: string }>;
  plan: {
    day: string;
    cals: number;
    others: Record<string, number>;
    miles: number;
    label: string;
  } | null;
  shifts: Record<string, number>;
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Set Cache-Control to prevent caching
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  
  // Check passcode
  const passcode = req.headers['x-allotly-passcode'];
  const expectedPasscode = process.env.ALLOTLY_PASSCODE;

  if (!expectedPasscode) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  if (!passcode || passcode !== expectedPasscode) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Handle GET - fetch latest version
  if (req.method === 'GET') {
    try {
      // List all state files
      const blobs = await list({ prefix: 'allotly/' });
      
      if (!blobs.blobs || blobs.blobs.length === 0) {
        // No data yet, return empty state
        return res.status(200).json({});
      }

      // Sort by uploadedAt descending to get the newest
      const sortedBlobs = blobs.blobs.sort((a, b) => 
        b.uploadedAt.getTime() - a.uploadedAt.getTime()
      );
      
      const newestBlob = sortedBlobs[0];

      // Read the newest blob using SDK with cache bypass
      const result = await get(newestBlob.pathname, { 
        access: 'private',
        useCache: false, // Bypass CDN cache for read-after-write consistency
      });
      
      if (!result || result.statusCode !== 200) {
        console.error('Blob not found or not modified');
        return res.status(200).json({});
      }

      // Read the stream and parse JSON
      const chunks: Uint8Array[] = [];
      const reader = result.stream.getReader();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      
      const buffer = Buffer.concat(chunks.map(chunk => Buffer.from(chunk)));
      const data = JSON.parse(buffer.toString('utf-8'));
      
      return res.status(200).json(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error fetching data:', errorMessage, error);
      return res.status(500).json({ error: 'Failed to fetch data', details: errorMessage });
    }
  }

  // Handle PUT - save new version and cleanup old ones
  if (req.method === 'PUT') {
    try {
      const state: AppState = req.body;

      // Validate that we have data
      if (!state || typeof state !== 'object') {
        return res.status(400).json({ error: 'Invalid data' });
      }

      // Create versioned pathname with timestamp
      const timestamp = Date.now();
      const pathname = `${BLOB_PREFIX}${timestamp}.json`;

      // Save to private blob store with versioned pathname
      await put(pathname, JSON.stringify(state), {
        access: 'private',
        contentType: 'application/json',
        addRandomSuffix: false,
      });

      // Clean up old versions (keep only the last N versions)
      try {
        const blobs = await list({ prefix: 'allotly/' });
        
        if (blobs.blobs && blobs.blobs.length > KEEP_VERSIONS) {
          // Sort by uploadedAt descending
          const sortedBlobs = blobs.blobs.sort((a, b) => 
            b.uploadedAt.getTime() - a.uploadedAt.getTime()
          );
          
          // Delete versions beyond KEEP_VERSIONS
          const toDelete = sortedBlobs.slice(KEEP_VERSIONS);
          if (toDelete.length > 0) {
            await del(toDelete.map(b => b.url));
          }
        }
      } catch (cleanupError) {
        // Log but don't fail the request if cleanup fails
        console.warn('Cleanup of old versions failed:', cleanupError);
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error saving data:', errorMessage, error);
      return res.status(500).json({ error: 'Failed to save data', details: errorMessage });
    }
  }

  // Method not allowed
  return res.status(405).json({ error: 'Method not allowed' });
}
