"use client";
import { useUser } from "@clerk/nextjs";
import React, { useState } from "react";
import { Spinner } from "@/components/spinner";
import toast, { Toaster } from "react-hot-toast";
import Image from "next/image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { availablePlans } from "@/lib/plans";
import { useRouter } from "next/navigation";

async function fetchSubscriptionStatus() {
  const response = await fetch("/api/profile/subscription-status");
  return response.json();
}

async function updatePlan(newPlan: string) {
  const response = await fetch("/api/profile/change-plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ newPlan }),
  });
  return response.json();
}

async function unsubscribe() {
  const response = await fetch("/api/profile/unsubscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  return response.json();
}

const Profile = () => {
  const [selectedPlan, setSelectedPlan] = useState("");
  const { isLoaded, isSignedIn, user } = useUser();
  const queryClient = useQueryClient();
  const router = useRouter();

  const {
    data: subscription,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["subscription"],
    queryFn: fetchSubscriptionStatus,
    enabled: isLoaded && isSignedIn,
    staleTime: 5 * 60 * 1000,
  });

  const { mutate: updatePlanMutation, isPending: isUpdatePlanPending } =
    useMutation({
      mutationFn: updatePlan,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["subscription"] });
        toast.success("Plan updated successfully");
        refetch();
      },
      onError: () => {
        toast.error("Something went wrong");
      },
    });

  const { mutate: unsubscribeMutation, isPending: isUnsubscribePending } =
    useMutation({
      mutationFn: unsubscribe,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["subscription"] });
        router.push("/subscribe");
      },
      onError: () => {
        toast.error("Error unsubscribing.");
      },
    });

  const currentPlan = availablePlans.find(
    (plan) => plan.interval === subscription?.subscription?.subscriptionTier
  );

  function handleUpdatePlan() {
    if (selectedPlan) {
      updatePlanMutation(selectedPlan);
    }
    setSelectedPlan("");
  }

  function handleUnsubscribe() {
    if (
      confirm(
        "Are you sure you want to unsubscribe? You will lose access to premium features."
      )
    ) {
      unsubscribeMutation();
    }
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
        <span className="ml-2 text-lg">Loading...</span>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-xl font-semibold text-gray-700">
          Please Sign in to view your Profile
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <Toaster position="top-center" />
      <div className="bg-white shadow-xl rounded-2xl p-6 space-y-8">
        {/* User Info */}
        <div className="flex flex-col items-center space-y-4">
          {user.imageUrl && (
            <Image
              src={user.imageUrl}
              alt="User Avatar"
              width={100}
              height={100}
              className="rounded-full"
              unoptimized
            />
          )}
          <h1 className="text-2xl font-bold">
            {user.firstName} {user.lastName}
          </h1>
          <p className="text-gray-500">
            {user.primaryEmailAddress?.emailAddress}
          </p>
        </div>

        {/* Subscription */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Subscription Details</h2>
          {isLoading ? (
            <div className="flex items-center">
              <Spinner />
              <span className="ml-2 text-gray-600">
                Loading Subscription Details...
              </span>
            </div>
          ) : isError ? (
            <p className="text-red-500">{error?.message}</p>
          ) : subscription ? (
            <div className="bg-gray-100 p-4 rounded-xl space-y-2">
              {currentPlan ? (
                <>
                  <p>
                    <strong>Plan:</strong> {currentPlan.name}
                  </p>
                  <p>
                    <strong>Amount:</strong> ${currentPlan.amount}{" "}
                    {currentPlan.currency}
                  </p>
                  <p>
                    <strong>Status:</strong> ACTIVE
                  </p>
                </>
              ) : (
                <p className="text-yellow-600">Current Plan Not Found</p>
              )}
            </div>
          ) : (
            <p>You are not subscribed to any Plan</p>
          )}
        </div>

        {/* Change Plan */}
        {currentPlan && (
          <div>
            <h3 className="text-lg font-medium mb-2">
              Change Subscription Plan
            </h3>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <select
                defaultValue={currentPlan?.interval}
                disabled={isUpdatePlanPending}
                onChange={(e) => setSelectedPlan(e.target.value)}
                className="border p-2 rounded-md w-full sm:w-auto"
              >
                <option value="" disabled>
                  Select New Plan
                </option>
                {availablePlans.map((plan, key) => (
                  <option key={key} value={plan.interval}>
                    {plan.name} - ${plan.amount} / {plan.interval}
                  </option>
                ))}
              </select>
              <button
                onClick={handleUpdatePlan}
                disabled={!selectedPlan}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
              >
                Save Change
              </button>
            </div>
            {isUpdatePlanPending && (
              <div className="flex items-center mt-2">
                <Spinner />
                <span className="ml-2 text-gray-600">Updating Plan...</span>
              </div>
            )}
          </div>
        )}

        {/* Unsubscribe */}
        <div>
          <h3 className="text-lg font-medium mb-2">Unsubscribe</h3>
          <button
            onClick={handleUnsubscribe}
            disabled={isUnsubscribePending}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition"
          >
            {isUnsubscribePending ? "Unsubscribing..." : "Unsubscribe"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
