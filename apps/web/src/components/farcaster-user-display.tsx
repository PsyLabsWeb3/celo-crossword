"use client";

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useGetUserProfile } from "@/hooks/useContract";

interface FarcasterUserDisplayProps {
  address: string;
  fallbackUsername?: string;
  size?: "sm" | "md" | "lg";
}

// This component displays a Farcaster user with avatar, username, and address
// It tries to resolve the address to a Farcaster profile from the blockchain, falling back to address display
export default function FarcasterUserDisplay({
  address,
  fallbackUsername = "User",
  size = "md"
}: FarcasterUserDisplayProps) {
  const [userData, setUserData] = useState<{
    username: string;
    displayName: string;
    pfpUrl: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Use the blockchain hook to get user profile
  const { data: blockchainProfile, isLoading: isBlockchainLoading, isError, refetch } = useGetUserProfile(address as `0x${string}`);

  // Initialize on component mount
  useEffect(() => {
    console.log("Debug FarcasterUserDisplay: Component mounted for address", address);
    // Initial fetch is handled by wagmi automatically
  }, [address]);

  // Log when props change
  useEffect(() => {
    console.log("Debug FarcasterUserDisplay: Props updated", { address, fallbackUsername, size });
  }, [address, fallbackUsername, size]);

  useEffect(() => {
    console.log("Debug FarcasterUserDisplay: Profile data received", {
      blockchainProfile,
      isBlockchainLoading,
      isError,
      address
    });

    if (blockchainProfile) {
      // blockchainProfile should be an array [username, displayName, pfpUrl, timestamp]
      // but let's handle it more thoroughly to ensure we handle different return formats
      let username = "";
      let displayName = "";
      let pfpUrl = "";

      if (Array.isArray(blockchainProfile)) {
        // Standard wagmi return format - contract returns [username, displayName, pfpUrl, timestamp]
        // The array will have 4 elements, we only need the first 3
        [username, displayName, pfpUrl] = blockchainProfile.slice(0, 3);
      } else if (typeof blockchainProfile === 'object' && blockchainProfile !== null) {
        // Named return format - type assertion to access properties safely
        const profileObj = blockchainProfile as {
          username?: string;
          displayName?: string;
          pfpUrl?: string;
          timestamp?: bigint
        };
        username = profileObj.username || "";
        displayName = profileObj.displayName || "";
        pfpUrl = profileObj.pfpUrl || "";
      }

      console.log("Debug FarcasterUserDisplay: Parsed profile", {
        username: username || 'empty/undefined',
        displayName: displayName || 'empty/undefined',
        pfpUrl: pfpUrl || 'empty/undefined'
      });

      // If we have a valid username from blockchain, use it; otherwise fall back
      if (username && username.trim() !== "" && username.trim() !== "0") { // Check for empty string or "0"
        console.log("Debug FarcasterUserDisplay: Using Farcaster profile data", {
          username,
          displayName,
          pfpUrl,
          address
        });
        setUserData({
          username: username,
          displayName: displayName || username,
          pfpUrl: pfpUrl || ""
        });
      } else {
        // Fallback to address display
        console.log("Debug FarcasterUserDisplay: No Farcaster data found in blockchain, using fallback", {
          fallbackUsername,
          address
        });
        setUserData({
          username: fallbackUsername,
          displayName: fallbackUsername,
          pfpUrl: ""
        });
      }
      setLoading(false);
    } else if (isError && !isBlockchainLoading) {
      // If there was an error fetching from blockchain, try to get from API as fallback
      console.log("Debug FarcasterUserDisplay: Error occurred fetching profile from blockchain, trying API fallback", {
        address,
        error: true
      });

      // Fetch profile from API as fallback
      const fetchProfileFromAPI = async () => {
        try {
          // Try the new GET endpoint for single address first
          const response = await fetch(`/api/farcaster-profiles/${address}`);

          if (response.ok) {
            const profile = await response.json();

            if (profile && profile.username && profile.username.trim() !== "" && profile.username.trim() !== "0") {
              console.log("Debug FarcasterUserDisplay: Using Farcaster profile data from API", {
                username: profile.username,
                displayName: profile.displayName,
                pfpUrl: profile.pfpUrl,
                address
              });
              setUserData({
                username: profile.username,
                displayName: profile.displayName || profile.username,
                pfpUrl: profile.pfpUrl || ""
              });
            } else {
              // If API also doesn't have data, use fallback
              console.log("Debug FarcasterUserDisplay: No profile found in API, using fallback", {
                fallbackUsername,
                address
              });
              setUserData({
                username: fallbackUsername,
                displayName: fallbackUsername,
                pfpUrl: ""
              });
            }
          } else {
            // API request failed, use fallback
            console.log("Debug FarcasterUserDisplay: API request failed, using fallback", {
              fallbackUsername,
              address
            });
            setUserData({
              username: fallbackUsername,
              displayName: fallbackUsername,
              pfpUrl: ""
            });
          }
        } catch (error) {
          console.error("Debug FarcasterUserDisplay: Error fetching profile from API", error);
          // On API error, use fallback
          setUserData({
            username: fallbackUsername,
            displayName: fallbackUsername,
            pfpUrl: ""
          });
        } finally {
          setLoading(false);
        }
      };

      fetchProfileFromAPI();
    } else if (!isBlockchainLoading) {
      // If no blockchain profile found and no error, show fallback immediately
      console.log("Debug FarcasterUserDisplay: No blockchain profile data, using fallback", {
        fallbackUsername,
        address
      });
      setUserData({
        username: fallbackUsername,
        displayName: fallbackUsername,
        pfpUrl: ""
      });
      setLoading(false);
    }
  }, [blockchainProfile, isBlockchainLoading, isError, fallbackUsername, address]);

  // Add a retry mechanism for when profile data is not immediately available
  useEffect(() => {
    if (isBlockchainLoading && blockchainProfile === undefined) {
      // Data is still loading and no profile yet, this is normal initial state
      console.log("Debug FarcasterUserDisplay: Initial loading state, waiting for data");
    } else if (!isBlockchainLoading && blockchainProfile === undefined && isError) {
      // Data finished loading but is still undefined and there was an error
      console.log("Debug FarcasterUserDisplay: Profile data fetch resulted in error, using fallback");
    } else if (!isBlockchainLoading && blockchainProfile === undefined && !isError) {
      // Data finished loading but is still undefined, this might be an issue
      console.log("Debug FarcasterUserDisplay: Profile data is undefined after loading completed, might need to try again later");
    }
  }, [blockchainProfile, isBlockchainLoading, isError]);

  // Format address for display
  const formatAddress = (addr: string): string => {
    if (!addr || addr.length < 10) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-12 h-12 text-sm",
    lg: "w-16 h-16 text-base"
  };

  if (loading || isBlockchainLoading) {
    return (
      <div className="flex items-center gap-3">
        <div className={`${sizeClasses[size]} rounded-full bg-gray-200 animate-pulse`}></div>
        <div>
          <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
          <div className="h-3 mt-1 bg-gray-200 rounded w-12 animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Avatar className={`${sizeClasses[size]} border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]`}>
        {userData?.pfpUrl && userData.pfpUrl !== "" ? (
          <AvatarImage src={userData.pfpUrl} alt={`${userData.displayName || 'User'}'s profile`} />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <span className="text-white font-bold">
              {userData?.displayName?.charAt(0) || formatAddress(address).charAt(2)}
            </span>
          </div>
        )}
        <AvatarFallback>
          {formatAddress(address).substring(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex flex-col">
        <span className="font-black text-foreground">
          {userData && userData.username && userData.username !== "" ? userData.username : formatAddress(address)}
        </span>
        <span className="text-xs font-bold text-muted-foreground">
          {formatAddress(address)}
        </span>
      </div>
    </div>
  );
}
