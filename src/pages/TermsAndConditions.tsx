import GlassCard from "@/components/GlassCard";
import { FileText } from "lucide-react";

const TermsAndConditions = () => {
  return (
    <div className="min-h-screen py-24 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center rounded-full bg-primary/10 text-primary h-16 w-16 mb-4">
            <FileText className="h-8 w-8" />
          </div>
          <h1 className="text-4xl font-bold mb-4">
            <span className="bg-gradient-primary bg-clip-text text-transparent">Terms and Conditions</span>
          </h1>
          <p className="text-muted-foreground">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <GlassCard className="p-8 space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing and using bytes_of_data ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Use License</h2>
            <p className="text-muted-foreground leading-relaxed mb-2">
              Permission is granted to temporarily access the materials on bytes_of_data's website for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Modify or copy the materials</li>
              <li>Use the materials for any commercial purpose or for any public display</li>
              <li>Attempt to reverse engineer any software contained on the website</li>
              <li>Remove any copyright or other proprietary notations from the materials</li>
              <li>Transfer the materials to another person or "mirror" the materials on any other server</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. User Accounts</h2>
            <p className="text-muted-foreground leading-relaxed mb-2">
              To access certain features of our Service, you may be required to create an account. You agree to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Provide accurate, current, and complete information during registration</li>
              <li>Maintain and promptly update your account information</li>
              <li>Maintain the security of your password and identification</li>
              <li>Accept all responsibility for activities that occur under your account</li>
              <li>Notify us immediately of any unauthorized use of your account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Payment Terms</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold mb-2">4.1 Payment Processing</h3>
                <p className="text-muted-foreground leading-relaxed">
                  All payments for our services are processed securely through Razorpay. By making a payment, you agree to Razorpay's terms and conditions. We are not responsible for any issues arising from payment processing.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-2">4.2 Pricing</h3>
                <p className="text-muted-foreground leading-relaxed">
                  All prices are displayed in Indian Rupees (INR) unless otherwise stated. We reserve the right to change our prices at any time, but price changes will not affect purchases already completed.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-2">4.3 Refund Policy</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Refund requests will be considered on a case-by-case basis. If you are not satisfied with our services, please contact us within 7 days of purchase. Refunds, if approved, will be processed within 14 business days.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Intellectual Property Rights</h2>
            <p className="text-muted-foreground leading-relaxed">
              All content, materials, courses, case studies, and resources provided on bytes_of_data are the intellectual property of bytes_of_data or its content providers. This includes but is not limited to text, graphics, logos, images, audio clips, digital downloads, and software. You may not reproduce, distribute, modify, create derivative works of, publicly display, or exploit any of the content without our express written permission.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. User Conduct</h2>
            <p className="text-muted-foreground leading-relaxed mb-2">
              You agree not to use the Service to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Violate any applicable laws or regulations</li>
              <li>Infringe upon the rights of others</li>
              <li>Transmit any harmful, offensive, or illegal content</li>
              <li>Interfere with or disrupt the Service or servers</li>
              <li>Attempt to gain unauthorized access to any portion of the Service</li>
              <li>Collect or store personal data about other users</li>
              <li>Use automated systems to access the Service without permission</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Service Availability</h2>
            <p className="text-muted-foreground leading-relaxed">
              We strive to ensure the Service is available 24/7, but we do not guarantee uninterrupted access. The Service may be unavailable due to maintenance, updates, technical issues, or circumstances beyond our control. We are not liable for any loss or damage resulting from Service unavailability.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Disclaimer</h2>
            <p className="text-muted-foreground leading-relaxed">
              The materials on bytes_of_data's website are provided on an 'as is' basis. bytes_of_data makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Limitations of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              In no event shall bytes_of_data or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on bytes_of_data's website, even if bytes_of_data or a bytes_of_data authorized representative has been notified orally or in writing of the possibility of such damage.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Indemnification</h2>
            <p className="text-muted-foreground leading-relaxed">
              You agree to indemnify, defend, and hold harmless bytes_of_data, its officers, directors, employees, agents, and affiliates from any claims, damages, losses, liabilities, and expenses (including legal fees) arising out of or relating to your use of the Service, violation of these Terms, or infringement of any rights of another.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to terminate or suspend your account and access to the Service immediately, without prior notice or liability, for any reason, including if you breach these Terms. Upon termination, your right to use the Service will cease immediately.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of India, without regard to its conflict of law provisions. Any disputes arising under or in connection with these Terms shall be subject to the exclusive jurisdiction of the courts in India.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">13. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to modify these Terms at any time. We will notify users of any material changes by posting the new Terms on this page and updating the "Last updated" date. Your continued use of the Service after such modifications constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">14. Contact Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about these Terms and Conditions, please contact us:
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

export default TermsAndConditions;

