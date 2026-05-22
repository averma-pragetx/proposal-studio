import { useNavigate } from "react-router-dom";
import { Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
        <Sparkles className="h-10 w-10" />
      </div>
      
      <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-6xl">
        Proposal Studio
      </h1>
      
      <p className="mb-10 max-w-2xl text-lg text-muted-foreground">
        Draft professional engineering and traffic consultancy proposals in minutes 
        using AI-powered document analysis.
      </p>

      <Button 
        size="lg" 
        onClick={() => navigate("/upload")} 
        className="h-12 gap-2 px-8 text-base font-medium"
      >
        Get Started <ArrowRight className="h-5 w-5" />
      </Button>

      <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-3">
        <div className="flex flex-col items-center gap-2">
          <div className="rounded-full bg-primary/10 p-2 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium">AI Analysis</p>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="rounded-full bg-primary/10 p-2 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium">Smart Drafting</p>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="rounded-full bg-primary/10 p-2 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium">Instant Export</p>
        </div>
      </div>
    </div>
  );
}
