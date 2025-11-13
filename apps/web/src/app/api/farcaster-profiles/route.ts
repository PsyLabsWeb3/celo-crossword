import { NextRequest } from 'next/server';
import { farcasterProfileStorage } from '@/lib/farcaster-profile-storage';

export async function POST(req: NextRequest) {
  try {
    const { addresses } = await req.json();

    if (!Array.isArray(addresses)) {
      return Response.json({ message: 'Addresses must be an array' }, { status: 400 });
    }

    // Get stored Farcaster profiles for the requested addresses
    const results = farcasterProfileStorage.getByAddresses(addresses);
    
    // For addresses without stored profiles, return null values
    // The frontend component will handle the fallback to address display
    addresses.forEach(address => {
      if (!results[address]) {
        results[address] = {
          address: address,
          username: address.substring(0, 6) + "..." + address.substring(address.length - 4),
          displayName: address.substring(0, 6) + "..." + address.substring(address.length - 4),
          timestamp: 0,
        };
      }
    });
    
    return Response.json(results);
  } catch (error) {
    console.error('Error resolving Farcaster profiles:', error);
    return Response.json({ message: 'Internal server error' }, { status: 500 });
  }
}