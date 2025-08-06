"use client";

import { ServiceCodeContext } from "@/context/ServiceCodeContext";
import { Menu, X, Zap } from "lucide-react";
import { useRouter } from "next/router";
import { useContext, useEffect, useState } from "react";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { setServiceCode } = useContext(ServiceCodeContext); // ✅ Correct usage
  const router = useRouter();

  const resetAndHome = () => {
    localStorage.removeItem("DynamicApiBlock.authValues");
    localStorage.removeItem("DynamicApiBlock.inputValues");
    localStorage.removeItem("DynamicApiBlock.editingId");
    localStorage.removeItem("DynamicApiBlock.isAuthenticated");
    localStorage.removeItem("servicecode");
  };

  const handleHomeClick = () => {
    // localStorage.removeItem("servicecode");
    resetAndHome()
    setServiceCode(null);
    router.push("/");
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems = ["services", "features", "testimonials", "contact"];

  return (
    <nav
      className={` w-full z-50 transition-all duration-300 ${isScrolled
        ? "bg-white/95 backdrop-blur-lg shadow-lg border-b border-gray-200"
        : "bg-transparent"
        }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Logo with link to homepage */}
          <div
            onClick={handleHomeClick}
            className="flex items-center space-x-2 cursor-pointer"
            role="button"
            tabIndex={0}
            onKeyPress={(e) => {
              if (e.key === "Enter" || e.key === " ") handleHomeClick();
            }}
          >
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              ezyr
            </span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((section) => (
              <a
                key={section}
                href={`#${section}`}
                className="text-gray-700 hover:text-purple-600 transition-colors font-medium capitalize"
              >
                {section}
              </a>
            ))}
            <button className="bg-gradient-to-r from-purple-500 to-blue-600 text-white px-6 py-2 rounded-full font-semibold hover:from-purple-600 hover:to-blue-700 transition-all duration-200 transform hover:scale-105">
              Get Started
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {isMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-200 py-4">
            <div className="flex flex-col space-y-4">
              {navItems.map((section) => (
                <a
                  key={section}
                  href={`#${section}`}
                  className="text-gray-700 hover:text-purple-600 transition-colors font-medium capitalize"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {section}
                </a>
              ))}
              <button className="bg-gradient-to-r from-purple-500 to-blue-600 text-white px-6 py-2 rounded-full font-semibold w-fit">
                Get Started
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
