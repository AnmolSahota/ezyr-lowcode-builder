import "@/styles/globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ToastContainer } from "react-toastify";
import { ServiceCodeProvider } from "@/context/ServiceCodeContext"; // Adjust path as needed

export default function App({ Component, pageProps }) {
  return (
    <ServiceCodeProvider>
      <Navbar />
      <Component {...pageProps} />
      <Footer />
      <ToastContainer />
    </ServiceCodeProvider>
  );
}
