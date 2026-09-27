import React from "react";
import {
  Camera,
  Video,
  Lightbulb,
  Archive,
  Zap,
  Gift,
  DollarSign,
  Users,
  BookOpen,
  Award,
  Cpu,
  Megaphone,
  GraduationCap,
  Star,
  Clock,
  MapPin,
  CheckSquare,
  Bot,
  Rocket,
  Sparkles,
  Trophy,
} from "lucide-react";

export interface JobDetail {
  id: number;
  slug: string;
  titleAr: string;
  titleEn: string;
  subtitleAr: string;
  subtitleEn: string;
  imageSrc: string;
  whatsapp: boolean;
  badge?: boolean;
  descriptionAr: string;
  descriptionEn: string;
  duties: {
    icon: React.ReactNode;
    titleAr: string;
    titleEn: string;
    textAr: string;
    textEn: string;
  }[];
  requirements: { icon: React.ReactNode; textAr: string; textEn: string }[];
  workDetails: {
    icon: React.ReactNode;
    labelAr: string;
    labelEn: string;
    valueAr: string;
    valueEn: string;
  }[];
  perks: { icon: React.ReactNode; textAr: string; textEn: string }[];
}

export const JOB_APPLICATION_WHATSAPP = "https://wa.me/+963942060440";

export const JOB_POSITIONS: JobDetail[] = [
  {
    id: 1,
    slug: "robotics-trainer-kids",
    titleAr: "مدرب روبوتيك",
    titleEn: "Robotics Trainer",
    subtitleAr: "فئة أطفال",
    subtitleEn: "Kids Category",
    imageSrc: "/images/job/job (3).png",
    whatsapp: true,
    descriptionAr:
      "نبحث عن مدرب شغوف لتعليم الأطفال أساسيات الروبوتيك والبرمجة في بيئة ممتعة وتفاعلية.",
    descriptionEn:
      "We're looking for a passionate trainer to teach kids the fundamentals of robotics and programming in a fun, interactive environment.",
    duties: [
      {
        icon: <GraduationCap className="w-5 h-5" />,
        titleAr: "التدريس",
        titleEn: "Teaching",
        textAr: "تدريس أساسيات الروبوتيك والبرمجة لفئة الأطفال",
        textEn: "Teach robotics and programming basics to kids",
      },
      {
        icon: <Users className="w-5 h-5" />,
        titleAr: "إدارة الفصل",
        titleEn: "Class Management",
        textAr: "الإشراف على الطلاب وضمان بيئة تعليمية آمنة ومحفزة",
        textEn:
          "Supervise students and ensure a safe, motivating learning environment",
      },
      {
        icon: <BookOpen className="w-5 h-5" />,
        titleAr: "تطوير المناهج",
        titleEn: "Curriculum",
        textAr: "المساهمة في تطوير المحتوى التدريسي",
        textEn: "Contribute to developing teaching content",
      },
    ],
    requirements: [
      {
        icon: <CheckSquare className="w-4 h-4" />,
        textAr: "خبرة في تعليم الأطفال أو التدريب",
        textEn: "Experience teaching children or training",
      },
      {
        icon: <CheckSquare className="w-4 h-4" />,
        textAr: "معرفة بالروبوتيك أو البرمجة",
        textEn: "Knowledge of robotics or programming",
      },
      {
        icon: <CheckSquare className="w-4 h-4" />,
        textAr: "طاقة عالية وشغف بالتعليم",
        textEn: "High energy and passion for education",
      },
    ],
    workDetails: [
      {
        icon: <Clock className="w-4 h-4" />,
        labelAr: "الدوام",
        labelEn: "Hours",
        valueAr: "حسب الجدول",
        valueEn: "As per schedule",
      },
      {
        icon: <MapPin className="w-4 h-4" />,
        labelAr: "المكان",
        labelEn: "Location",
        valueAr: "مقر الشركة — محطة بغداد",
        valueEn: "HQ — Baghdad Station",
      },
    ],
    perks: [
      {
        icon: <DollarSign className="w-4 h-4" />,
        textAr: "راتب تنافسي يُحدد بعد المقابلة",
        textEn: "Competitive salary determined after interview",
      },
      {
        icon: <Award className="w-4 h-4" />,
        textAr: "بيئة عمل محفزة في قلب عالم التكنولوجيا",
        textEn: "Motivating environment at the heart of tech",
      },
    ],
  },
  {
    id: 2,
    slug: "robotics-trainer-teens",
    titleAr: "مدرب روبوتيك",
    titleEn: "Robotics Trainer",
    subtitleAr: "فئة يافعين",
    subtitleEn: "Teens Category",
    imageSrc: "/images/job/job (4).png",
    whatsapp: true,
    descriptionAr:
      "نبحث عن مدرب لتعليم الشباب والمراهقين مهارات الروبوتيك والهندسة بطريقة متقدمة وممتعة.",
    descriptionEn:
      "We're looking for a trainer to teach teens advanced robotics and engineering skills in an engaging way.",
    duties: [
      {
        icon: <GraduationCap className="w-5 h-5" />,
        titleAr: "التدريس المتقدم",
        titleEn: "Advanced Teaching",
        textAr: "تدريس الروبوتيك المتقدم ومهارات الهندسة للمراهقين",
        textEn: "Teach advanced robotics and engineering skills to teens",
      },
      {
        icon: <Award className="w-5 h-5" />,
        titleAr: "التحضير للمسابقات",
        titleEn: "Competition Prep",
        textAr: "تحضير الطلاب للمشاركة في المسابقات العلمية",
        textEn: "Prepare students for science competitions",
      },
      {
        icon: <Lightbulb className="w-5 h-5" />,
        titleAr: "مشاريع إبداعية",
        titleEn: "Creative Projects",
        textAr: "الإشراف على مشاريع الطلاب الإبداعية والعلمية",
        textEn: "Supervise students' creative and scientific projects",
      },
    ],
    requirements: [
      {
        icon: <CheckSquare className="w-4 h-4" />,
        textAr: "خبرة في تدريب المراهقين أو التعليم الهندسي",
        textEn: "Experience with teens or engineering education",
      },
      {
        icon: <CheckSquare className="w-4 h-4" />,
        textAr: "مستوى متقدم في الروبوتيك والبرمجة",
        textEn: "Advanced level in robotics and programming",
      },
      {
        icon: <CheckSquare className="w-4 h-4" />,
        textAr: "قدرة على قيادة المجموعات وتحفيزها",
        textEn: "Ability to lead and motivate groups",
      },
    ],
    workDetails: [
      {
        icon: <Clock className="w-4 h-4" />,
        labelAr: "الدوام",
        labelEn: "Hours",
        valueAr: "حسب الجدول",
        valueEn: "As per schedule",
      },
      {
        icon: <MapPin className="w-4 h-4" />,
        labelAr: "المكان",
        labelEn: "Location",
        valueAr: "مقر الشركة — محطة بغداد",
        valueEn: "HQ — Baghdad Station",
      },
    ],
    perks: [
      {
        icon: <DollarSign className="w-4 h-4" />,
        textAr: "راتب تنافسي يُحدد بعد المقابلة",
        textEn: "Competitive salary determined after interview",
      },
      {
        icon: <Award className="w-4 h-4" />,
        textAr: "المشاركة في مسابقات دولية",
        textEn: "Participation in international competitions",
      },
    ],
  },
  {
    id: 3,
    slug: "mechatronics-engineer",
    titleAr: "مهندس ميكاترونيكس",
    titleEn: "Mechatronics Engineer",
    subtitleAr: "هندسة وتطوير",
    subtitleEn: "Engineering & Development",
    imageSrc: "/images/job/job (1).png",
    whatsapp: true,
    descriptionAr:
      "نبحث عن مهندس ميكاترونيكس للعمل على تطوير وبناء أنظمة روبوتية متكاملة.",
    descriptionEn:
      "We're looking for a mechatronics engineer to develop and build integrated robotic systems.",
    duties: [
      {
        icon: <Cpu className="w-5 h-5" />,
        titleAr: "تصميم الأنظمة",
        titleEn: "System Design",
        textAr: "تصميم وبناء أنظمة روبوتية متكاملة",
        textEn: "Design and build integrated robotic systems",
      },
      {
        icon: <Zap className="w-5 h-5" />,
        titleAr: "البرمجة والتحكم",
        titleEn: "Programming",
        textAr: "برمجة وحدات التحكم والحساسات",
        textEn: "Program controllers and sensors",
      },
      {
        icon: <BookOpen className="w-5 h-5" />,
        titleAr: "التوثيق التقني",
        titleEn: "Documentation",
        textAr: "توثيق المشاريع التقنية وإعداد التقارير",
        textEn: "Document technical projects and prepare reports",
      },
    ],
    requirements: [
      {
        icon: <CheckSquare className="w-4 h-4" />,
        textAr: "شهادة في الهندسة الميكاترونيكية أو ما يعادلها",
        textEn: "Degree in mechatronics engineering or equivalent",
      },
      {
        icon: <CheckSquare className="w-4 h-4" />,
        textAr: "خبرة في Arduino أو Raspberry Pi",
        textEn: "Experience with Arduino or Raspberry Pi",
      },
      {
        icon: <CheckSquare className="w-4 h-4" />,
        textAr: "مهارات CAD والطباعة ثلاثية الأبعاد ميزة إضافية",
        textEn: "CAD and 3D printing skills are a plus",
      },
    ],
    workDetails: [
      {
        icon: <Clock className="w-4 h-4" />,
        labelAr: "الدوام",
        labelEn: "Hours",
        valueAr: "دوام كامل",
        valueEn: "Full time",
      },
      {
        icon: <MapPin className="w-4 h-4" />,
        labelAr: "المكان",
        labelEn: "Location",
        valueAr: "مقر الشركة — محطة بغداد",
        valueEn: "HQ — Baghdad Station",
      },
    ],
    perks: [
      {
        icon: <DollarSign className="w-4 h-4" />,
        textAr: "راتب تنافسي يُحدد بعد المقابلة",
        textEn: "Competitive salary determined after interview",
      },
      {
        icon: <Zap className="w-4 h-4" />,
        textAr: "العمل على مشاريع تقنية متطورة",
        textEn: "Work on cutting-edge technical projects",
      },
    ],
  },
  {
    id: 4,
    slug: "social-media-manager",
    titleAr: "مسؤول تواصل اجتماعي",
    titleEn: "Social Media Manager",
    subtitleAr: "تسويق رقمي",
    subtitleEn: "Digital Marketing",
    imageSrc: "/images/job/job (2).png",
    whatsapp: true,
    descriptionAr:
      "نبحث عن مسؤول تواصل اجتماعي مبدع لإدارة وتطوير حضور روبوتريك على منصات التواصل الاجتماعي.",
    descriptionEn:
      "We're looking for a creative social media manager to grow and manage Robotrick's presence across all platforms.",
    duties: [
      {
        icon: <Megaphone className="w-5 h-5" />,
        titleAr: "إدارة المنصات",
        titleEn: "Platform Management",
        textAr: "إدارة حسابات التواصل الاجتماعي ونشر المحتوى",
        textEn: "Manage social media accounts and publish content",
      },
      {
        icon: <Lightbulb className="w-5 h-5" />,
        titleAr: "ابتكار المحتوى",
        titleEn: "Content Creation",
        textAr: "ابتكار أفكار محتوى جذابة وتنفيذها",
        textEn: "Ideate and execute engaging content ideas",
      },
      {
        icon: <Users className="w-5 h-5" />,
        titleAr: "التفاعل مع الجمهور",
        titleEn: "Community",
        textAr: "التفاعل مع المتابعين وبناء مجتمع رقمي",
        textEn: "Engage with followers and build a digital community",
      },
    ],
    requirements: [
      {
        icon: <CheckSquare className="w-4 h-4" />,
        textAr: "خبرة في إدارة حسابات التواصل الاجتماعي",
        textEn: "Experience managing social media accounts",
      },
      {
        icon: <CheckSquare className="w-4 h-4" />,
        textAr: "مهارات كتابة إبداعية وتصميم بصري",
        textEn: "Creative writing and visual design skills",
      },
      {
        icon: <CheckSquare className="w-4 h-4" />,
        textAr: "إلمام بالاتجاهات الرقمية الحديثة",
        textEn: "Familiarity with current digital trends",
      },
    ],
    workDetails: [
      {
        icon: <Clock className="w-4 h-4" />,
        labelAr: "الدوام",
        labelEn: "Hours",
        valueAr: "مرن",
        valueEn: "Flexible",
      },
      {
        icon: <MapPin className="w-4 h-4" />,
        labelAr: "المكان",
        labelEn: "Location",
        valueAr: "مقر الشركة — محطة بغداد",
        valueEn: "HQ — Baghdad Station",
      },
    ],
    perks: [
      {
        icon: <DollarSign className="w-4 h-4" />,
        textAr: "راتب تنافسي يُحدد بعد المقابلة",
        textEn: "Competitive salary determined after interview",
      },
      {
        icon: <Award className="w-4 h-4" />,
        textAr: "نظام مكافآت مرتبط بالأداء",
        textEn: "Performance-based bonus system",
      },
    ],
  },
  {
    id: 5,
    slug: "content-creator",
    titleAr: "منشئ محتوى",
    titleEn: "Content Creator",
    subtitleAr: "توثيق إبداعي",
    subtitleEn: "Creative Documentation",
    imageSrc: "/images/job/job (3).png",
    whatsapp: false,
    badge: true,
    descriptionAr:
      'نبحث عن شخص "شغوووووف" يرى الكاميرا امتداداً لعينيه — يوثّق كل لحظة بإبداع ويحوّلها إلى محتوى يلهم الآخرين.',
    descriptionEn:
      "We're looking for someone passionate who sees the camera as an extension of their eyes — documenting every moment and turning it into inspiring content.",
    duties: [
      {
        icon: <Camera className="w-5 h-5" />,
        titleAr: "التوثيق الحي",
        titleEn: "Live Documentation",
        textAr:
          "تصوير وتوثيق كافة لحظات العمل، الورشات التدريبية، والتفاعلات اليومية داخل الشركة (فيديو وصور).",
        textEn:
          "Film and document all work moments, training workshops, and daily interactions inside the company.",
      },
      {
        icon: <Video className="w-5 h-5" />,
        titleAr: "المونتاج الإبداعي",
        titleEn: "Creative Editing",
        textAr:
          "تعديل الفيديوهات باستخدام تطبيقات الموبايل بطريقة احترافية، سريعة، ومواكبة لأحدث أساليب النشر (Reels, Stories).",
        textEn:
          "Edit videos using mobile apps professionally and in line with the latest publishing styles (Reels, Stories).",
      },
      {
        icon: <Lightbulb className="w-5 h-5" />,
        titleAr: "صناعة المحتوى وابتكار الأفكار",
        titleEn: "Content & Ideas",
        textAr:
          "ابتكار أفكار خلاقة وتصوير محتوى إبداعي حتى في أوقات الهدوء لضمان استمرارية الظهور الرقمي.",
        textEn:
          "Invent creative ideas and shoot content even during quiet times to ensure continuous digital presence.",
      },
      {
        icon: <Archive className="w-5 h-5" />,
        titleAr: "إدارة الأرشيف",
        titleEn: "Archive Management",
        textAr: "تنظيم وحفظ المواد المصورة لتكون مرجعاً دائماً للشركة.",
        textEn:
          "Organize and preserve filmed materials as a permanent reference for the company.",
      },
    ],
    requirements: [
      {
        icon: <CheckSquare className="w-4 h-4" />,
        textAr: "شغف لا حدود له — نبحث عن شخص يرى الكاميرا امتداداً لعينيه",
        textEn:
          "Boundless passion — someone who sees the camera as an extension of their eyes",
      },
      {
        icon: <CheckSquare className="w-4 h-4" />,
        textAr: "احتراف تطبيقات المونتاج على الهاتف: CapCut, VN, InShot",
        textEn: "Proficiency in mobile editing apps: CapCut, VN, InShot",
      },
      {
        icon: <CheckSquare className="w-4 h-4" />,
        textAr: "عين سينمائية: القدرة على اختيار الزوايا والإضاءة المناسبة",
        textEn:
          "Cinematic eye: ability to choose the right angles and lighting",
      },
      {
        icon: <CheckSquare className="w-4 h-4" />,
        textAr: "روح ابتكارية عالية وقدرة على اقتراح أفكار محتوى خارج الصندوق",
        textEn:
          "Innovative spirit and ability to suggest out-of-the-box content ideas",
      },
    ],
    workDetails: [
      {
        icon: <Clock className="w-4 h-4" />,
        labelAr: "ساعات الدوام",
        labelEn: "Working Hours",
        valueAr: "7 ساعات يومياً",
        valueEn: "7 hours per day",
      },
      {
        icon: <Star className="w-4 h-4" />,
        labelAr: "العطلة",
        labelEn: "Day Off",
        valueAr: "يوم واحد في الأسبوع",
        valueEn: "One day per week",
      },
      {
        icon: <MapPin className="w-4 h-4" />,
        labelAr: "المكان",
        labelEn: "Location",
        valueAr: "مقر الشركة — محطة بغداد — شارع الشلال",
        valueEn: "HQ — Baghdad Station — Al-Shalal Street",
      },
    ],
    perks: [
      {
        icon: <DollarSign className="w-4 h-4" />,
        textAr: "الراتب يُحدد بعد المقابلة وبناءً على الخبرة والحس الإبداعي",
        textEn:
          "Salary determined after interview based on experience and creative sense",
      },
      {
        icon: <Zap className="w-4 h-4" />,
        textAr:
          "بيئة عمل محفزة: في قلب الأحداث التكنولوجية والمسابقات العالمية",
        textEn:
          "Motivating environment: at the heart of tech events and global competitions",
      },
      {
        icon: <Gift className="w-4 h-4" />,
        textAr: "نظام مكافآت: حوافز وزيادات دورية مرتبطة بالأداء والتميز",
        textEn:
          "Reward system: periodic incentives and raises tied to performance and excellence",
      },
    ],
  },
  {
    id: 6,
    slug: "robotics-trainer",
    titleAr: "مدرب روبوتيك وبرمجة",
    titleEn: "Robotics & Programming Trainer",
    subtitleAr: "اصنع جيلاً يبتكر",
    subtitleEn: "Inspire The Next Innovators",
    imageSrc: "/images/job/job (4).png",
    whatsapp: false,
    badge: true,

    descriptionAr:
      "نبحث عن مدرب يمتلك روح المبتكر وكاريزما المعلم. شخص لا يكتفي بنقل المعرفة، بل يزرع الشغف بالتكنولوجيا في نفوس الأطفال واليافعين. إذا كنت تتمتع بالنشاط، وتحب تحويل الأفكار إلى مشاريع حقيقية، فهذا المكان لك.",

    descriptionEn:
      "We're looking for an innovative trainer with the charisma of a mentor — someone who doesn't just teach technology, but inspires young minds to create, build, and explore.",

    duties: [
      {
        icon: <Bot className="w-5 h-5" />,
        titleAr: "التدريب العملي",
        titleEn: "Hands-on Training",
        textAr:
          "تقديم تدريبات عملية تفاعلية في الروبوتيك والبرمجة (Scratch & Python) بأسلوب ممتع، نشط، ومحفّز.",
        textEn:
          "Deliver interactive robotics and programming sessions (Scratch & Python) in a fun and engaging way.",
      },

      {
        icon: <Users className="w-5 h-5" />,
        titleAr: "إدارة القاعات",
        titleEn: "Classroom Management",
        textAr:
          "التعامل مع الأطفال واليافعين بمرونة وصبر، وخلق بيئة تعليمية إيجابية مليئة بالحماس والتفاعل.",
        textEn:
          "Manage classrooms with patience and flexibility while creating a positive learning environment.",
      },

      {
        icon: <Cpu className="w-5 h-5" />,
        titleAr: "الإشراف التقني",
        titleEn: "Technical Supervision",
        textAr:
          "مساعدة الطلاب في بناء وبرمجة المشاريع الهندسية وحل المشكلات التقنية أثناء التدريب.",
        textEn:
          "Assist students in building engineering projects and solving technical challenges during sessions.",
      },

      {
        icon: <Rocket className="w-5 h-5" />,
        titleAr: "مواكبة الابتكار",
        titleEn: "Innovation & Learning",
        textAr:
          "التعلم السريع لأي منصات روبوتيك جديدة ومتابعة أحدث التقنيات التعليمية باستمرار.",
        textEn:
          "Quickly adapt to new robotics platforms and stay updated with modern educational technologies.",
      },
    ],

    requirements: [
      {
        icon: <CheckSquare className="w-4 h-4" />,
        textAr:
          "طالب أو خريج هندسة (ميكاترونيكس، حاسبات، إلكترونيات أو ما يعادلها)",
        textEn:
          "Engineering student or graduate (Mechatronics, Computer Engineering, Electronics, or equivalent)",
      },

      {
        icon: <CheckSquare className="w-4 h-4" />,
        textAr: "خبرة سابقة في التدريب أو التعامل مع الأطفال واليافعين",
        textEn:
          "Previous experience in training or working with children and teenagers",
      },

      {
        icon: <CheckSquare className="w-4 h-4" />,
        textAr:
          "إتقان Python و Scratch ومعرفة جيدة بالحساسات والقطع الإلكترونية",
        textEn:
          "Strong knowledge of Python, Scratch, sensors, and electronics components",
      },

      {
        icon: <CheckSquare className="w-4 h-4" />,
        textAr:
          "شخصية نشيطة، مرنة في التعلم، وتمتلك شغفاً حقيقياً بالتكنولوجيا",
        textEn:
          "Energetic personality with flexibility in learning and genuine passion for technology",
      },
    ],

    workDetails: [
      {
        icon: <Clock className="w-4 h-4" />,
        labelAr: "ساعات الدوام",
        labelEn: "Working Hours",
        valueAr: "5 ساعات صباحية يومياً",
        valueEn: "5 morning hours daily",
      },

      {
        icon: <Star className="w-4 h-4" />,
        labelAr: "العطلة",
        labelEn: "Day Off",
        valueAr: "يوم واحد أسبوعياً",
        valueEn: "One day off per week",
      },

      {
        icon: <MapPin className="w-4 h-4" />,
        labelAr: "المكان",
        labelEn: "Location",
        valueAr: "مقر الشركة — محطة بغداد — شارع الشلال",
        valueEn: "HQ — Baghdad Station — Al-Shalal Street",
      },
    ],

    perks: [
      {
        icon: <Sparkles className="w-4 h-4" />,
        textAr: "بيئة عمل إبداعية وتقنية محفزة تدعم التطور المهني والشخصي",
        textEn:
          "Creative and technology-driven environment that supports professional growth",
      },

      {
        icon: <Trophy className="w-4 h-4" />,
        textAr:
          "نظام حوافز ومكافآت مرتبط بالأداء وتميز الطلاب في المشاريع والمسابقات",
        textEn:
          "Reward system based on performance and student achievements in projects and competitions",
      },

      {
        icon: <Zap className="w-4 h-4" />,
        textAr:
          "فرصة للعمل على أحدث التجهيزات الروبوتية والمنصات التعليمية العالمية",
        textEn:
          "Opportunity to work with the latest robotics equipment and global educational platforms",
      },
    ],
  },
];

export const getJobPositionBySlug = (slug?: string) =>
  JOB_POSITIONS.find((job) => job.slug === slug);
