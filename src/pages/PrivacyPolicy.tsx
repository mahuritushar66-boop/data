import GlassCard from "@/components/GlassCard";
import { Shield } from "lucide-react";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen py-24 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center rounded-full bg-primary/10 text-primary h-16 w-16 mb-4">
            <Shield className="h-8 w-8" />
          </div>
          <h1 className="text-4xl font-bold mb-4">
            <span className="bg-gradient-primary bg-clip-text text-transparent">Privacy Policy</span>
          </h1>
          <p className="text-muted-foreground">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <GlassCard className="p-8 space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              Welcome to bytes_of_data ("we," "our," or "us"). We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold mb-2">2.1 Personal Information</h3>
                <p className="text-muted-foreground leading-relaxed">
                  We may collect personal information that you voluntarily provide to us when you:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mt-2">
                  <li>Register for an account</li>
                  <li>Subscribe to our services or courses</li>
                  <li>Contact us for support or inquiries</li>
                  <li>Participate in surveys or promotions</li>
                  <li>Make a payment for our services</li>
                </ul>
                <p className="text-muted-foreground leading-relaxed mt-2">
                  This information may include your name, email address, phone number, payment information, and any other information you choose to provide.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-2">2.2 Usage Data</h3>
                <p className="text-muted-foreground leading-relaxed">
                  We automatically collect certain information when you visit our website, including:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mt-2">
                  <li>IP address and browser type</li>
                  <li>Pages visited and time spent on pages</li>
                  <li>Referring website addresses</li>
                  <li>Device information and operating system</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
            <p className="text-muted-foreground leading-relaxed mb-2">
              We use the information we collect to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Provide, maintain, and improve our services</li>
              <li>Process your transactions and send related information</li>
              <li>Send you technical notices, updates, and support messages</li>
              <li>Respond to your comments, questions, and requests</li>
              <li>Monitor and analyze trends, usage, and activities</li>
              <li>Detect, prevent, and address technical issues</li>
              <li>Personalize your experience on our platform</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Payment Processing</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use Razorpay, a third-party payment processor, to handle all payment transactions. When you make a payment, your payment information is processed securely by Razorpay. We do not store your complete payment card details on our servers. Razorpay's privacy policy governs the collection and use of your payment information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Data Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Data Sharing and Disclosure</h2>
            <p className="text-muted-foreground leading-relaxed mb-2">
              We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>With service providers who assist us in operating our website and conducting our business</li>
              <li>When required by law or to respond to legal process</li>
              <li>To protect our rights, privacy, safety, or property</li>
              <li>In connection with a merger, acquisition, or sale of assets</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed mb-2">
              You have the right to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Access and receive a copy of your personal data</li>
              <li>Rectify inaccurate or incomplete information</li>
              <li>Request deletion of your personal data</li>
              <li>Object to processing of your personal data</li>
              <li>Request restriction of processing</li>
              <li>Data portability</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              To exercise these rights, please contact us at tushar@bytesofdata.com
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Cookies and Tracking Technologies</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use cookies and similar tracking technologies to track activity on our website and hold certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, if you do not accept cookies, you may not be able to use some portions of our website.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Children's Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our services are not intended for individuals under the age of 18. We do not knowingly collect personal information from children. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Changes to This Privacy Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date. You are advised to review this Privacy Policy periodically for any changes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about this Privacy Policy, please contact us:
            </p>
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <p className="text-muted-foreground">
                <strong>Email:</strong> tushar@bytesofdata.com<br />
                <strong>Website:</strong> bytes_of_data
              </p>
            </div>
          </section>
        </GlassCard>
      </div>
    </div>
  );
};

export default PrivacyPolicy;

