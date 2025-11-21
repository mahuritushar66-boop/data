import { useState, FormEvent } from "react";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Phone, Instagram, Linkedin, MessageSquare } from "lucide-react";
import emailjs from "@emailjs/browser";

const EMAIL_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const EMAIL_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const EMAIL_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
const SUPPORT_EMAIL = "mahuritushar66@gmail.com";

const Contact = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [isSending, setIsSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatusMessage(null);

    if (!EMAIL_SERVICE_ID || !EMAIL_TEMPLATE_ID || !EMAIL_PUBLIC_KEY) {
      setStatusMessage({
        type: "error",
        text: "Email service is not configured. Please contact support directly.",
      });
      return;
    }

    setIsSending(true);
    try {
      await emailjs.send(
        EMAIL_SERVICE_ID,
        EMAIL_TEMPLATE_ID,
        {
          from_name: formData.name,
          from_email: formData.email,
          subject: formData.subject,
          message: formData.message,
          to_email: SUPPORT_EMAIL,
        },
        EMAIL_PUBLIC_KEY,
      );
      setStatusMessage({
        type: "success",
        text: "Message sent successfully! I'll get back to you soon.",
      });
      setFormData({ name: "", email: "", subject: "", message: "" });
    } catch (error) {
      console.error(error);
      setStatusMessage({
        type: "error",
        text: "Unable to send the message right now. Please try again later or email me directly.",
      });
    } finally {
      setIsSending(false);
    }
  };
  return (
    <div className="min-h-screen py-20">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16 animate-fade-up">
          <h1 className="text-5xl font-bold mb-4">
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              Get in Touch
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Have a question or want to work together? I'd love to hear from you!
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
          {/* Contact Form */}
          <GlassCard>
            <h2 className="text-2xl font-bold mb-6">Send a Message</h2>
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-medium mb-2">Name</label>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Your name"
                  className="bg-background/50"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <Input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="your@email.com"
                  className="bg-background/50"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Subject</label>
                <Input
                  name="subject"
                  value={formData.subject}
                  onChange={handleInputChange}
                  placeholder="What's this about?"
                  className="bg-background/50"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Message</label>
                <Textarea
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  placeholder="Your message..."
                  rows={6}
                  className="bg-background/50"
                  required
                />
              </div>
              {statusMessage && (
                <p
                  className={`text-sm ${
                    statusMessage.type === "success" ? "text-green-500" : "text-destructive"
                  } text-center`}
                >
                  {statusMessage.text}
                </p>
              )}
              <Button
                type="submit"
                disabled={isSending}
                className="w-full bg-gradient-primary hover:shadow-glow-primary disabled:opacity-70"
              >
                {isSending ? "Sending..." : "Send Message"}
              </Button>
            </form>
          </GlassCard>

          {/* Contact Info */}
          <div className="space-y-6">
            <GlassCard>
              <div className="flex items-start gap-4">
                <div className="p-3 bg-gradient-primary rounded-lg">
                  <Mail className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Email</h3>
                  <p className="text-muted-foreground">mahuritushar66@gmail.com</p>
                  <a href="mailto:mahuritushar66@gmail.com" className="text-primary text-sm hover:underline">
                    Send an email →
                  </a>
                </div>
              </div>
            </GlassCard>

            <GlassCard>
              <div className="flex items-start gap-4">
                <div className="p-3 bg-gradient-primary rounded-lg">
                  <Phone className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">WhatsApp</h3>
                  <p className="text-muted-foreground">+91 78942 63847</p>
                  <a
                    href="https://wa.me/917894263847"
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary text-sm hover:underline"
                  >
                    Chat on WhatsApp →
                  </a>
                </div>
              </div>
            </GlassCard>

            <GlassCard>
              <div className="flex items-start gap-4">
                <div className="p-3 bg-gradient-primary rounded-lg">
                  <MessageSquare className="h-6 w-6 text-primary-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-3">Social Media</h3>
                  <div className="flex gap-4">
                    <a
                      href="https://www.instagram.com/bytes_of_data"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-background rounded-lg hover:bg-primary/20 transition-colors"
                      aria-label="Follow us on Instagram"
                    >
                      <Instagram className="h-6 w-6" />
                    </a>
                    <a
                      href="https://www.linkedin.com/in/tushar-mahuri-84a3451aa/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-background rounded-lg hover:bg-primary/20 transition-colors"
                      aria-label="Connect on LinkedIn"
                    >
                      <Linkedin className="h-6 w-6" />
                    </a>
                  </div>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="bg-gradient-subtle">
              <h3 className="font-semibold mb-3">Office Hours</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Monday - Friday: 9:00 AM - 6:00 PM IST</p>
                <p>Saturday: 10:00 AM - 2:00 PM IST</p>
                <p>Sunday: Closed</p>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;