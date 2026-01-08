"use client";

import React from "react";
import StartupPage from "../../components/auth/StartupPage";
import { AppBackground } from "@/components/layout";

export default function StartupRoutePage() {
    return (
        <AppBackground>
            <div className="flex min-h-screen w-full items-center justify-center p-4">
                <StartupPage />
            </div>
        </AppBackground>
    );
}
