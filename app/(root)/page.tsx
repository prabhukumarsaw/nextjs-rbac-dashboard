import AboutSectionOne from "@/components/home/About/AboutSectionOne";
import AboutSectionTwo from "@/components/home/About/AboutSectionTwo";
import Blog from "@/components/home/Blog";
import Brands from "@/components/home/Brands";
import ScrollUp from "@/components/home/Common/ScrollUp";
import Contact from "@/components/home/Contact";
import Features from "@/components/home/Features";
import Hero from "@/components/home/Hero";
import Pricing from "@/components/home/Pricing";
import Testimonials from "@/components/home/Testimonials";
import Video from "@/components/home/Video";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free Next.js Template for Startup and SaaS",
  description: "This is Home for Startup Nextjs Template",
  // other metadata
};

export default function HomePage() {
  return (
    <>
      <ScrollUp />
      <Hero />
      <Features />
      <Video />
      <Brands />
      <AboutSectionOne />
      <AboutSectionTwo />
      <Testimonials />
      <Pricing />
      <Blog />
      <Contact />
    </>
  );
}
