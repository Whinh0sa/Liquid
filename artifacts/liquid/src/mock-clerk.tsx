import React from "react";

export const ClerkProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>;
export const SignedIn = ({ children }: { children: React.ReactNode }) => <>{children}</>; // Render contents to allow previewing authenticated state if needed
export const SignedOut = ({ children }: { children: React.ReactNode }) => null;
export const RedirectToSignIn = () => <div>Redirecting to sign in...</div>;
export const SignInButton = ({ children }: { children: React.ReactNode }) => <button type="button">{children || "Sign In"}</button>;
export const UserButton = () => <div className="w-8 h-8 rounded-full bg-gray-200" title="Mock User" />;

export const useAuth = () => ({
  getToken: async () => "mock-token",
  isLoaded: true,
  isSignedIn: true,
  userId: "mock-user-123"
});

export const useUser = () => ({
  isLoaded: true,
  isSignedIn: true,
  user: {
    id: "mock-user-123",
    fullName: "Mock User",
    primaryEmailAddress: { emailAddress: "mock@example.com" }
  }
});
