import { cn } from "@/lib/utils";

const universities = [
  "Stanford", "MIT", "Harvard", "Berkeley", "UCLA", "NYU", "Oxford", "Cambridge", "Yale", "Princeton"
];

export const SocialProof = () => {
  return (
    <section className="py-10 border-b border-border/50 bg-background overflow-hidden">
      <div className="container mx-auto px-4 text-center mb-8">
        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
          Trusted by students at
        </p>
      </div>
      
      <div className="relative flex overflow-x-hidden group mask-linear-fade">
        <div className="animate-marquee whitespace-nowrap flex gap-12 items-center">
          {universities.map((uni, i) => (
            <span 
              key={i} 
              className="text-2xl font-black text-gray-300 hover:text-duolingo-green transition-colors duration-300 cursor-default select-none"
            >
              {uni}
            </span>
          ))}
          {/* Duplicate for seamless loop */}
          {universities.map((uni, i) => (
            <span 
              key={`dup-${i}`} 
              className="text-2xl font-black text-gray-300 hover:text-duolingo-green transition-colors duration-300 cursor-default select-none"
            >
              {uni}
            </span>
          ))}
        </div>

        <div className="absolute top-0 animate-marquee2 whitespace-nowrap flex gap-12 items-center ml-12">
          {universities.map((uni, i) => (
            <span 
              key={`dup2-${i}`} 
              className="text-2xl font-black text-gray-300 hover:text-duolingo-green transition-colors duration-300 cursor-default select-none"
            >
              {uni}
            </span>
          ))}
          {universities.map((uni, i) => (
            <span 
              key={`dup3-${i}`} 
              className="text-2xl font-black text-gray-300 hover:text-duolingo-green transition-colors duration-300 cursor-default select-none"
            >
              {uni}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};
