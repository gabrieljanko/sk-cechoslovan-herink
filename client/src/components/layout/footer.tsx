import { HelpCircle } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 py-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:flex md:items-center md:justify-between">
        <div className="flex justify-center md:order-2">
          <a href="#" className="text-gray-400 hover:text-gray-500">
            <span className="sr-only">Help</span>
            <HelpCircle className="h-6 w-6" />
          </a>
        </div>
        <div className="mt-4 md:mt-0 md:order-1">
          <p className="text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Thursday Football Manager. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
