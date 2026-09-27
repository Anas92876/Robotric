import React, { ReactNode } from "react";
import { Footer } from "../components/layout/Footer";
import { ContactCTA } from "../components/home/ContactCTA";

interface PublicLayoutProps {
  children: ReactNode;
}

/**
 * Public layout component that includes ContactCTA and Footer.
 * Used for all public-facing pages (Home, About, Services, etc.)
 */
export const PublicLayout: React.FC<PublicLayoutProps> = ({ children }) => {
  return (
    <>
      {children}
      <ContactCTA />
      <Footer />
    </>
  );
};

export default PublicLayout;
