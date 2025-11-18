import { NextRequest } from 'next/server';
import { farcasterProfileStorage } from '@/lib/farcaster-profile-storage';

// Define the context interface to match the error's expectation
interface RouteContext {
  params: Promise<{
    address: string;
  }>;
}

export async function GET(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const resolvedParams = await context.params; // Await the promise
    const { address } = resolvedParams;

    if (!address) {
      return Response.json({ message: 'Address is required' }, { status: 400 });
    }

    // Get stored Farcaster profile for the requested address
    const profile = farcasterProfileStorage.getByAddress(address);

    if (profile && profile.username && profile.username.trim() !== "" && profile.username.trim() !== "0" && !profile.username.includes('...')) {
      // Return the stored profile data
      return Response.json({
        username: profile.username,
        displayName: profile.displayName,
        pfpUrl: profile.pfpUrl,
        timestamp: profile.timestamp
      });
    } else {
      // If no profile stored, return a response that indicates no profile found
      // The frontend will use this to determine whether to show the fallback
      return Response.json({
        username: "",
        displayName: "",
        pfpUrl: "",
        timestamp: 0
      }, { status: 200 }); // 200 OK but with empty data
    }
  } catch (error) {
    console.error('Error fetching Farcaster profile:', error);
    return Response.json({ message: 'Internal server error' }, { status: 500 });
  }
}