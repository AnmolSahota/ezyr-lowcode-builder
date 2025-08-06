"use client";
import { ServiceCodeContext } from "@/context/ServiceCodeContext";
import {
  ArrowRight,
  CheckCircle,
  Database,
  FileSpreadsheet,
  Globe,
  Mail,
  Shield,
  Star,
  Users,
  Zap,
} from "lucide-react";
import { useRouter } from "next/router";
import { useContext, useEffect, useState } from "react";
import data from "../config.json";
export default function EzyrHomepage() {
  const [isScrolled, setIsScrolled] = useState(false);
  const { setServiceCode, setConfig } = useContext(ServiceCodeContext);
  let router = useRouter();

  const resetAndHome = () => {
    localStorage.removeItem("DynamicApiBlock.authValues");
    localStorage.removeItem("DynamicApiBlock.inputValues");
    localStorage.removeItem("DynamicApiBlock.editingId");
    localStorage.removeItem("DynamicApiBlock.isAuthenticated");
  };

  useEffect(() => {
    resetAndHome()
    const stored = localStorage.getItem("servicecode");
    if (stored) setServiceCode(stored);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const services = [
    {
      id: "gmail",
      name: "Gmail Manager",
      description:
        "Search, organize, and manage your Gmail messages with powerful filtering and automation tools.",
      icon: Mail,
      color: "from-red-500 to-red-600",
      hoverColor: "group-hover:from-red-600 group-hover:to-red-700",
      features: [
        "Email Search",
        "Smart Filters",
        "Bulk Actions",
        "Auto-Organization",
      ],
      route: "gmail",
    },
    {
      id: "airtable",
      name: "Airtable Studio",
      description:
        "Create, edit, and manage your Airtable databases with an intuitive interface and advanced features.",
      icon: Database,
      color: "from-blue-500 to-blue-600",
      hoverColor: "group-hover:from-blue-600 group-hover:to-blue-700",
      features: [
        "Database Management",
        "Record CRUD",
        "Real-time Sync",
        "Advanced Filtering",
      ],
      route: "airtable",
    },
    {
      id: "sheets",
      name: "Sheets Pro",
      description:
        "Transform your Google Sheets into powerful databases with enhanced editing and collaboration features.",
      icon: FileSpreadsheet,
      color: "from-green-500 to-green-600",
      hoverColor: "group-hover:from-green-600 group-hover:to-green-700",
      features: [
        "Spreadsheet Management",
        "Data Validation",
        "Collaboration Tools",
        "Import/Export",
      ],
      route: "googlesheets",
    },
  ];

  const stats = [
    { number: "10K+", label: "Active Users" },
    { number: "500K+", label: "Data Records Processed" },
    { number: "99.9%", label: "Uptime" },
    { number: "24/7", label: "Support" },
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Product Manager",
      company: "TechCorp",
      avatar: "SJ",
      text: "Ezyr has revolutionized how we manage our data across different platforms. The unified interface saves us hours every week.",
    },
    {
      name: "Michael Chen",
      role: "Data Analyst",
      company: "DataFlow Inc",
      avatar: "MC",
      text: "The Gmail integration is incredible. I can now process thousands of emails efficiently with their smart filtering system.",
    },
    {
      name: "Emily Rodriguez",
      role: "Operations Director",
      company: "CloudVentures",
      avatar: "ER",
      text: "Finally, a platform that understands our workflow. Ezyr's Airtable integration has streamlined our entire operation.",
    },
  ];
  let handleRouting = (servicecode) => {
    localStorage.setItem("servicecode", servicecode);
    let config = data.find((d) => d.servicecode == servicecode) || null;
    console.log("config from / page", config);
    setConfig(config);
    setTimeout(() => {
      router.push("/apiblock");
    }, 500);
  };

  // if (serviceCode) {
  //   let config = data.find((d) => d.servicecode == serviceCode) || null;
  //   return <DynamicApiBlock config={config} />;
  // }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="pt-24 pb-12 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                One Platform,
                <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent block">
                  Endless Possibilities
                </span>
              </h1>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Streamline your workflow with our unified platform for Gmail,
                Airtable, and Google Sheets. Manage your data, emails, and
                spreadsheets all in one place.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <button className="bg-gradient-to-r from-purple-500 to-blue-600 text-white px-8 py-4 rounded-full font-semibold text-lg hover:from-purple-600 hover:to-blue-700 transition-all duration-200 transform hover:scale-105 shadow-lg">
                  Start Free Trial
                </button>
                <button className="border-2 border-purple-500 text-purple-600 px-8 py-4 rounded-full font-semibold text-lg hover:bg-purple-50 transition-all duration-200 flex items-center justify-center gap-2">
                  Watch Demo
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Animated Hero Visual */}
            <div className="relative">
              <div className="relative z-10">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <div className="bg-white p-6 rounded-2xl shadow-xl transform rotate-3 hover:rotate-0 transition-transform duration-300">
                      <Mail className="w-8 h-8 text-red-500 mb-2" />
                      <h3 className="font-semibold text-gray-800">Gmail</h3>
                      <p className="text-sm text-gray-600">Email Management</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-xl transform -rotate-2 hover:rotate-0 transition-transform duration-300">
                      <FileSpreadsheet className="w-8 h-8 text-green-500 mb-2" />
                      <h3 className="font-semibold text-gray-800">Sheets</h3>
                      <p className="text-sm text-gray-600">Spreadsheet Pro</p>
                    </div>
                  </div>
                  <div className="space-y-4 mt-8">
                    <div className="bg-white p-6 rounded-2xl shadow-xl transform -rotate-3 hover:rotate-0 transition-transform duration-300">
                      <Database className="w-8 h-8 text-blue-500 mb-2" />
                      <h3 className="font-semibold text-gray-800">Airtable</h3>
                      <p className="text-sm text-gray-600">Database Studio</p>
                    </div>
                    <div className="bg-gradient-to-r from-purple-500 to-blue-600 p-6 rounded-2xl shadow-xl text-white transform rotate-2 hover:rotate-0 transition-transform duration-300">
                      <Zap className="w-8 h-8 mb-2" />
                      <h3 className="font-semibold">Unified</h3>
                      <p className="text-sm opacity-90">All-in-One</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Background decorations */}
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-purple-200 rounded-full opacity-60 animate-pulse"></div>
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-blue-200 rounded-full opacity-40 animate-pulse delay-1000"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl font-bold text-gray-900 mb-2">
                  {stat.number}
                </div>
                <div className="text-gray-600 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Powerful Tools for Every Workflow
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Choose your service and experience the power of unified data
              management. Each platform is designed to maximize productivity and
              simplify complex tasks.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {services.map((service) => {
              const IconComponent = service.icon;
              return (
                <div
                  key={service.id}
                  className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100"
                >
                  <div
                    className={`w-16 h-16 bg-gradient-to-r ${service.color} ${service.hoverColor} rounded-2xl flex items-center justify-center mb-6 transition-all duration-300`}
                  >
                    <IconComponent className="w-8 h-8 text-white" />
                  </div>

                  <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-purple-600 transition-colors">
                    {service.name}
                  </h3>

                  <p className="text-gray-600 mb-6 leading-relaxed">
                    {service.description}
                  </p>

                  <div className="space-y-3 mb-8">
                    {service.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => handleRouting(service.route)}
                    className={`w-full bg-gradient-to-r ${service.color} ${service.hoverColor} text-white py-3 px-6 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 group-hover:shadow-lg`}
                  >
                    Launch {service.name}
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Why Choose Ezyr?
            </h2>
            <p className="text-xl text-gray-600">
              Built for professionals who demand efficiency, security, and
              scalability.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Zap,
                title: "Lightning Fast",
                description:
                  "Optimized performance ensures your workflows run at maximum speed.",
              },
              {
                icon: Shield,
                title: "Enterprise Security",
                description:
                  "Bank-level encryption and security protocols protect your sensitive data.",
              },
              {
                icon: Globe,
                title: "Global Access",
                description:
                  "Access your data from anywhere in the world with cloud synchronization.",
              },
              {
                icon: Users,
                title: "Team Collaboration",
                description:
                  "Built-in collaboration tools for seamless team productivity.",
              },
              {
                icon: Database,
                title: "Smart Integration",
                description:
                  "Intelligent APIs that connect and sync across all your platforms.",
              },
              {
                icon: Star,
                title: "Premium Support",
                description:
                  "24/7 expert support to help you maximize your productivity.",
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="text-center p-6 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section
        id="testimonials"
        className="py-20 bg-gradient-to-br from-purple-50 to-blue-50"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Loved by Professionals Worldwide
            </h2>
            <p className="text-xl text-gray-600">
              See what our users are saying about their Ezyr experience.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white p-8 rounded-2xl shadow-lg">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold mr-4">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {testimonial.name}
                    </h4>
                    <p className="text-gray-600 text-sm">{testimonial.role}</p>
                    <p className="text-gray-500 text-sm">
                      {testimonial.company}
                    </p>
                  </div>
                </div>
                <p className="text-gray-700 italic">"{testimonial.text}"</p>
                <div className="flex mt-4">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-5 h-5 text-yellow-400 fill-current"
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-purple-600 to-blue-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to Transform Your Workflow?
          </h2>
          <p className="text-xl text-purple-100 mb-8">
            Join thousands of professionals who have already streamlined their
            processes with Ezyr.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-white text-purple-600 px-8 py-4 rounded-full font-semibold text-lg hover:bg-gray-100 transition-all duration-200 transform hover:scale-105">
              Start Free Trial
            </button>
            <button className="border-2 border-white text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-white/10 transition-all duration-200">
              Schedule Demo
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
