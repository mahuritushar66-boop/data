import { useState } from "react";
import { Briefcase } from "lucide-react";
import { getCompanyLogoUrl } from "@/utils/companyLogos";
import { cn } from "@/lib/utils";

interface CompanyLogoProps {
  companyName: string | undefined | null;
  size?: number;
  className?: string;
  fallbackIcon?: boolean;
}

const CompanyLogo = ({ 
  companyName, 
  size = 16, 
  className,
  fallbackIcon = true 
}: CompanyLogoProps) => {
  const [imageError, setImageError] = useState(false);
  const logoUrl = getCompanyLogoUrl(companyName);

  if (!companyName || (!logoUrl && !fallbackIcon)) {
    return null;
  }

  if (!logoUrl || imageError) {
    if (!fallbackIcon) return null;
    return (
      <Briefcase 
        className={cn("text-muted-foreground", className)} 
        size={size}
      />
    );
  }

  return (
    <img
      src={logoUrl}
      alt={`${companyName} logo`}
      className={cn("rounded object-contain", className)}
      style={{ width: size, height: size }}
      onError={() => {
        setImageError(true);
      }}
      loading="lazy"
    />
  );
};

export default CompanyLogo;

