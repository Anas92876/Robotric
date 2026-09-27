import { motion } from "framer-motion";
import { Trophy, Medal, ArrowUpRight, Sparkles } from "lucide-react";

export const Achievements = () => {
  const achievements = [
    {
      year: "2024",
      awards: [
        {
          title: "2nd Place",
          subtitle: "National Robotics Olympiad Syria",
          icon: Trophy,
          medal: "gold"
        },
        {
          title: "3rd Place",
          subtitle: "National Robotics Olympiad Syria",
          icon: Trophy,
          medal: "bronze"
        },
        {
          title: "6 Silver Medals",
          subtitle: "Individual Technical Excellence",
          icon: Medal,
          medal: "silver",
          count: 6
        }
      ]
    },
    {
      year: "2025",
      awards: [
        {
          title: "2nd Place",
          subtitle: "National Robotics Olympiad Syria",
          icon: Trophy,
          medal: "gold"
        },
        {
          title: "3 Bronze Medals",
          subtitle: "Team Strategy & Innovation",
          icon: Medal,
          medal: "bronze",
          count: 3
        }
      ]
    }
  ];

  return (
    <section id="achievements" className="relative py-12 md:py-24 bg-surface overflow-hidden">
      <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12 relative z-10">
        
        {/* Section Header */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-border shadow-sm mb-6"
          >
            <Sparkles className="w-4 h-4 text-accent fill-accent" />
            <span className="text-xs font-bold text-text-primary tracking-wider uppercase">Our Legacy</span>
          </motion.div>

          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl font-black text-text-primary mb-4"
          >
            Proven <span className="text-primary">Impact</span>
          </motion.h2>
        </div>

        {/* Achievements List */}
        <div className="space-y-8">
          {achievements.map((yearGroup, index) => (
            <motion.div 
              key={yearGroup.year}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.2 }}
              className="bg-white rounded-3xl p-6 md:p-8 border border-border hover:border-primary/30 hover:shadow-lg transition-all"
            >
              <div className="grid md:grid-cols-12 gap-6 items-start">
                
                {/* Year Column */}
                <div className="md:col-span-3">
                  <div className="inline-flex items-center justify-center bg-gradient-to-br from-primary to-accent text-white px-4 py-2 rounded-xl">
                    <span className="text-2xl font-black">{yearGroup.year}</span>
                  </div>
                </div>

                {/* Awards Column */}
                <div className="md:col-span-9">
                  <div className="grid md:grid-cols-2 gap-4">
                    {yearGroup.awards.map((award, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-surface hover:bg-white border border-transparent hover:border-primary/20 transition-all">
                        <div className={`p-2 rounded-lg shrink-0 ${
                            award.medal === 'gold' ? 'text-yellow-500 bg-yellow-50' : 
                            award.medal === 'silver' ? 'text-gray-400 bg-gray-50' : 
                            'text-orange-500 bg-orange-50'
                        }`}>
                          <award.icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-base font-bold text-text-primary leading-tight">
                              {award.title}
                            </h4>
                            {award.count && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary whitespace-nowrap">
                                x{award.count}
                              </span>
                            )}
                          </div>
                          <p className="text-text-secondary text-xs font-medium">
                            {award.subtitle}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
};
