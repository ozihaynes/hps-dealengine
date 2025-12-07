"use client";

import React from "react";
import LoginForm from "./LoginForm";
import styles from "./login.module.css";

type LoginClientProps = {
  redirectTo?: string;
};

export default function LoginClient({ redirectTo }: LoginClientProps) {
  // If no redirectTo is provided, ALWAYS go to /startup
  const targetPath = redirectTo || "/startup";

  return (
    <div className={styles.loginPage}>
      <div className={styles.bgShapes} aria-hidden>
        <div className={`${styles.shape} ${styles.shape1}`} />
        <div className={`${styles.shape} ${styles.shape2}`} />
        <div className={`${styles.shape} ${styles.shape3}`} />
      </div>
      <div className={styles.gridOverlay} aria-hidden />
      <div className="relative z-10 flex items-center justify-center px-4 py-12 sm:py-16">
        <LoginForm redirectTo={targetPath} />
      </div>
    </div>
  );
}
