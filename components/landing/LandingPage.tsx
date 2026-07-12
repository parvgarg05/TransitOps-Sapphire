/**
 * Public marketing landing page.
 *
 * Built in the Cal.com-inspired design language (white canvas, near-black
 * primary, light-gray feature cards, dark closing footer) with subtle
 * framer-motion entrance animations. Rendered at `/` for unauthenticated
 * visitors; the header CTA routes to the login / dashboard.
 */

"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Truck,
  Car,
  Route,
  Wrench,
  Users,
  BarChart3,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

const FEATURES = [
  {
    icon: Car,
    title: "Vehicle Registry",
    body: "A single source of truth for every asset — status, capacity, odometer, and lifecycle.",
  },
  {
    icon: Route,
    title: "Trips & Dispatch",
    body: "Create, dispatch, and complete trips with automatic vehicle and driver status transitions.",
  },
  {
    icon: Wrench,
    title: "Maintenance",
    body: "Open and close maintenance records that pull vehicles out of dispatch automatically.",
  },
  {
    icon: Users,
    title: "Driver Compliance",
    body: "Track licenses, expiry, and safety scores — with reminders before drivers fall out of compliance.",
  },
  {
    icon: BarChart3,
    title: "Analytics & Reports",
    body: "Fuel efficiency, fleet utilization, operational cost, and ROI — with CSV and PDF export.",
  },
  {
    icon: ShieldCheck,
    title: "Role-Based Access",
    body: "Fleet Manager, Driver, Safety Officer, and Financial Analyst each get a tailored, secured view.",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, delay: i * 0.06, ease: "easeOut" },
  }),
};

export function LandingPage() {
  return (
    <div className="min-h-screen bg-canvas text-foreground">
      {/* Top nav */}
      <header className="sticky top-0 z-40 border-b border-hairline bg-canvas/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-content items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Truck className="h-5 w-5" />
            </span>
            <span className="text-lg font-semibold tracking-[-0.02em]">
              TransitOps
            </span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/login">
              <Button variant="outline" size="lg">
                Sign in
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-content px-4 sm:px-6 py-20 sm:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <motion.div
            className="lg:col-span-7"
            initial="hidden"
            animate="show"
            variants={fadeUp}
            custom={0}
          >
            <span className="inline-flex items-center rounded-pill bg-surface-card px-3 py-1 text-xs font-medium text-muted-foreground">
              Smart Transport Operations Platform
            </span>
            <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-semibold leading-[1.05] tracking-[-0.04em]">
              Run your fleet the smarter way.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              TransitOps replaces spreadsheets and logbooks with one system for
              vehicles, drivers, trips, maintenance, fuel, and analytics — with
              the business rules enforced for you.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/login">
                <Button size="lg" className="gap-2">
                  Get started <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="outline" size="lg">
                  View dashboard
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Hero mockup card */}
          <motion.div
            className="lg:col-span-5"
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
          >
            <div className="rounded-xl border border-hairline bg-canvas p-5 shadow-elevated">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  Fleet Overview
                </span>
                <span className="rounded-pill bg-surface-card px-2 py-0.5 text-xs text-muted-foreground">
                  Live
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Active Vehicles", value: "14" },
                  { label: "On Trip", value: "4" },
                  { label: "In Maintenance", value: "2" },
                  { label: "Fleet Utilization", value: "23.5%" },
                ].map((kpi) => (
                  <div
                    key={kpi.label}
                    className="rounded-lg border border-hairline bg-surface-card p-4"
                  >
                    <div className="text-xs text-muted-foreground">
                      {kpi.label}
                    </div>
                    <div className="mt-1 text-2xl font-semibold tracking-[-0.02em]">
                      {kpi.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-content px-4 sm:px-6 pb-24">
        <div className="mb-10 text-center">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-[-0.03em]">
            Everything your operation needs
          </h2>
          <p className="mt-3 text-muted-foreground">
            One platform, from vehicle registration to profitability analytics.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                className="rounded-lg bg-surface-card border border-hairline p-8"
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-60px" }}
                variants={fadeUp}
                custom={i}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-canvas border border-hairline">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-lg font-semibold tracking-[-0.01em]">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {feature.body}
                </p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* CTA band */}
      <section className="mx-auto max-w-content px-4 sm:px-6 pb-24">
        <div className="rounded-xl bg-surface-card border border-hairline p-10 sm:p-14 text-center">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-[-0.03em]">
            Ready to move your fleet forward?
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
            Sign in with a demo account and explore the full operations suite.
          </p>
          <div className="mt-6">
            <Link href="/login">
              <Button size="lg" className="gap-2">
                Sign in to TransitOps <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Dark footer (the design system's closing dark surface) */}
      <footer className="bg-surface-dark text-white/70">
        <div className="mx-auto max-w-content px-4 sm:px-6 py-12">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white text-surface-dark">
                <Truck className="h-5 w-5" />
              </span>
              <span className="text-lg font-semibold tracking-[-0.02em] text-white">
                TransitOps
              </span>
            </div>
            <p className="text-sm text-white/50">
              Smart Transport Operations Platform
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
