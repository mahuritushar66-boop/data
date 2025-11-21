import { Link } from "react-router-dom";
import { Instagram, Linkedin, Github, Mail, Shield, Phone } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-card border-t border-border mt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <img 
              src="/logo.jpg" 
              alt="BytesOfData Logo" 
              className="h-16 w-16 object-contain"
            />
            <p className="text-muted-foreground text-sm">
              Empowering data scientists through education, mentorship, and practical experience.
            </p>
            <div className="flex space-x-4">
              <a 
                href="https://www.instagram.com/bytes_of_data" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="Follow us on Instagram"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a 
                href="https://www.linkedin.com/in/tushar-mahuri-84a3451aa/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="Connect on LinkedIn"
              >
                <Linkedin className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors" aria-label="Visit our GitHub">
                <Github className="h-5 w-5" />
              </a>
              <a 
                href="mailto:mahuritushar66@gmail.com" 
                className="text-muted-foreground hover:text-primary transition-colors" 
                aria-label="Send us an email"
              >
                <Mail className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4 text-foreground">Quick Links</h4>
            <ul className="space-y-2">
              {["Interview Prep", "Mentorship", "Services", "Courses"].map((item) => (
                <li key={item}>
                  <Link to={`/${item.toLowerCase().replace(" ", "-")}`} className="text-muted-foreground hover:text-primary transition-colors text-sm">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-semibold mb-4 text-foreground">Resources</h4>
            <ul className="space-y-2">
              {["Case Studies", "Projects", "Blog"].map((item) => (
                <li key={item}>
                  <Link to={`/${item.toLowerCase().replace(" ", "-")}`} className="text-muted-foreground hover:text-primary transition-colors text-sm">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4 text-foreground">Get in Touch</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <a 
                  href="mailto:mahuritushar66@gmail.com" 
                  className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2"
                >
                  <Mail className="h-4 w-4" />
                  <span>mahuritushar66@gmail.com</span>
                </a>
              </li>
              <li>
                <a 
                  href="https://wa.me/917894263847" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2"
                >
                  <Phone className="h-4 w-4" />
                  <span>+91 78942 63847</span>
                </a>
              </li>
              <li className="text-muted-foreground">Based in India</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <p>&copy; {new Date().getFullYear()} bytes_of_data. All rights reserved.</p>
              <div className="flex items-center gap-4">
                <Link
                  to="/privacy-policy"
                  className="hover:text-primary transition-colors"
                >
                  Privacy Policy
                </Link>
                <span>•</span>
                <Link
                  to="/terms-and-conditions"
                  className="hover:text-primary transition-colors"
                >
                  Terms & Conditions
                </Link>
              </div>
            </div>
            <Link
              to="/admin/login"
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <Shield className="h-4 w-4" />
              <span>Admin Access</span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;