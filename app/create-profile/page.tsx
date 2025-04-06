"use client";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 In React Query, useMutation() is used to handle API mutations like creating, updating, or deleting data. Unlike useQuery() (which is used for fetching data), useMutation() does not cache responses and is triggered manually.
 */

type ApiResponse = {
  message: string;
  error?: string;
  subscriptionActive?: boolean;
};
async function createProfileRequest() {
  const response = await fetch("/api/create-profile", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });
  const data = await response.json();
  return data as ApiResponse;
}
/*
Yes, your observation is correct! Even though your API returns an error response ({ error: "Profile already exists" } with status 400), the onSuccess callback inside useMutation still runs. This happens because useMutation considers any HTTP response (even with status 400) as a successful fetch operation unless an actual network error occurs (e.g., no internet, server unreachable).

🔍 Why is onSuccess Running on Error?
The fetch call inside createProfileRequest() does not automatically reject for non-2xx status codes (e.g., 400 or 500).

fetch only throws an error if the network request itself fails (e.g., no internet, CORS issues).

Since you're returning a JSON response, React Query assumes the request was successful (even if it's an error message).
*/
export default function CreateProfile() {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const hasRun = useRef(false);
  const { mutate, isPending } = useMutation<ApiResponse, Error>({
    mutationFn: createProfileRequest,
    onSuccess: (data) => {
      if (
        data.message === "Profile created successfully" ||
        !data.subscriptionActive
      ) {
        router.push("/subscribe"); // ✅ Redirect to subscribe if not subscribed
      } else {
        router.push("/mealplan"); // ✅ Redirect to mealplan if already subscribed
      }
    },
    onError: (error) => {
      console.log(error);
    },
  });

  useEffect(() => {
    if (isLoaded && isSignedIn && !isPending && !hasRun.current) {
      hasRun.current = true;
      mutate(); //When you call mutate(), it triggers the mutationFn, which in this case is createProfileRequest().
    }
  }, [isLoaded, isSignedIn, isPending]);
  return <div>Processing sign in...</div>;
}
